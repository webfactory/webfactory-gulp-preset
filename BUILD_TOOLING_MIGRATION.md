# Build Tooling Migration: Analysis & Plan (v2 — decoupled architecture)

> Supersedes `VITE_MIGRATION.md`, which documents the initial "route everything through Vite" exploration. Kept for historical context; this document reflects the current recommendation.

## Context

`webfactory-gulp-preset` is consumed as a devDependency by ~90 downstream projects via a `gulpfile.js` + `gulp-config.js` pair. The goal is to replace the Gulp+Webpack pipeline while keeping the config *interface* close enough that migrating each of the 90 projects is a small, mechanical change rather than a rewrite — the config doesn't need to be byte-identical, just close. Full test coverage (`tests/css.test.js`, `tests/js.test.js`) must keep passing, exercised against the new engine(s).

Two rounds of research fed this doc: two Explore agents mapping the current tooling surface and Vite-ecosystem equivalents, plus a third exploring a real downstream consumer's actual setup — `/var/www/gemeinsamer-bundesausschuss`. That last one overturned two assumptions from the first pass:

1. **There is no single canonical `inputPath` shape in the wild.** `gemeinsamer-bundesausschuss` doesn't use `weballpacka.js` at all — its `gulpfile.js` wires the legacy split tasks (`tasks/webpack.js` + `tasks/styles.js`) directly. Its `scripts.files[].inputPath` is an **array** (`['../node_modules/h-include/lib/h-include.js']`, webpack's array-entry-concat convention) and `styles.files[].files` is also an array — neither matches `weballpacka.js`'s single-string `inputPath`. Real-world config shape is more varied than initially assumed.
2. **Real projects bolt custom, non-preset Gulp tasks directly onto their `gulpfile.js`.** This project has four: `copyHyphenopolyFiles` (raw `gulp.src`/`gulp-rename`/`gulp.dest`, copying WASM/JS runtime files from `node_modules`), `zipIconsForStyleguide` (`gulp-zip`, packaging an icon set for a styleguide), `copyLogoFilesForStyleguide` (raw copy), and `styleguide` (shells out to `npx kss` via `child_process.exec` — not gulp-plugin-based at all). None of these touch webfactory-gulp-preset's internals.

Other findings from that exploration:
- No `"scripts"` key exists in this project's `package.json` — gulp is invoked directly via CLI (`npx gulp <task>` or similar), not through an npm script wrapper.
- **Svelte and TypeScript are not used** anywhere in this project (no matches in `package.json`/`yarn.lock`/`src/`) — one real data point supporting dropping/deprioritizing them, though it's a single sample out of 90 and shouldn't be treated as conclusive.
- **jQuery IS used** (`jquery-colorbox` and several `_scripts.js`/`gba.*.js` files import/rely on it) — confirms jQuery global-injection support must be kept in the new JS bundler.
- A *vendored* Composer package (`vendor/webfactory/embed-bundle`) ships its own `gulpfile.js`/`gulp-config.js` for its own independent dev workflow, unrelated to this consumer's actual build — dead weight from this project's perspective, but worth a footnote that some vendor packages webfactory maintains may need their own separate migration later. Out of scope here.
- Vite is current at 8.2.2 (npm, checked 2026-08-26), now "rolldown-vite" (uses Rolldown/Oxc by default, not Rollup/esbuild).

## Config shape: be lenient, not canonical

Given the config-shape variance above, the new tooling's config parser should **accept `inputPath` (and legacy `files`) as either a single string or an array of strings**, on both `styles.files[]` and `scripts.files[]`, normalizing to an array internally. Don't force every project to standardize on one shape before migrating — that would turn a "swap the tool" migration into a "rewrite your config" migration for an unknown fraction of the 90 projects. This needs validating against a handful more of the 90 before being fully confident — this analysis is grounded in exactly one sampled project so far.

## Custom project-level Gulp tasks are out of scope

Copy/rename/zip/exec-style tasks that individual projects bolt onto their own `gulpfile.js` (like the four in `gemeinsamer-bundesausschuss`) are **not this migration's concern**. They don't depend on webfactory-gulp-preset's internals, so dropping `gulp` from *this preset's own* dependency tree doesn't affect them — a project can keep its own `gulp` devDependency plus `gulp-rename`/`gulp-zip`/whatever, untouched.

This works cleanly as long as the new tooling exposes plain callable Node functions (`compile(config)`, `watch(config)`, `scss.compile(config)`, etc.) rather than requiring a specific task runner. A project's migrated setup can be a trimmed `gulpfile.js` that still defines its own custom tasks alongside calls into the new functions, a plain `build.js` script, or direct npm scripts — whichever fits. **Don't budget migration effort for "porting" these** — only the preset-integration points (today's `webpack`/`styles`/`browsersync`/`svgmin` calls) need updating per project.

## Recommended gulp-free end state for project-owned tasks (optional, on each project's own timeline)

Gulp itself is legacy at this point — its remaining value in these projects is thin (a handful of trivial file operations per project, per the `gemeinsamer-bundesausschuss` sample). Once a project no longer needs it for SCSS/JS bundling, dropping it entirely for its own custom tasks is a small, fully optional, low-risk follow-up — **not** something this migration should require, since it's unrelated to the actual problem (gulp-sass staleness) that prompted this work. Recommended replacements, boring and correct, no new framework:

| Gulp today | Replace with |
|---|---|
| `gulp.src().pipe(gulp-rename).pipe(gulp.dest())` (copy/rename) | `fs.promises.cp()` — built into Node ≥16.7, zero deps |
| `gulp-zip` | `archiver` (small, well-maintained) |
| `gulp.watch()` | `chokidar` directly — already being adopted for the SCSS harness's watch mode, so no new dependency introduced |
| `gulp.series()` / `gulp.parallel()` | Plain npm scripts composed with `&&`/`&`, or `npm-run-all2` (the actively-maintained fork — original `npm-run-all` is stale) for named composition |
| `child_process.exec(...)` wrapped in a gulp task (e.g. a styleguide-generator shell-out) | Just an npm script line, e.g. `"styleguide": "kss --config kss-config.json"` — gulp added no value here, it was already just shelling out |

Applied to `gemeinsamer-bundesausschuss` as a worked example: `gulpfile.js` disappears entirely; `copyHyphenopolyFiles`/`copyLogoFilesForStyleguide` become two `fs.cp()` one-liners (or two npm script lines calling a tiny copy script); `zipIconsForStyleguide` becomes a short script using `archiver`; `styleguide` becomes a direct npm script (`kss --config kss-config.json`, no wrapper needed); `compile`/`watch`/`serve` become npm scripts calling the new `scss.compile()`/`vite.compile()`/`watch`/`serve` functions directly. No task-runner framework needed for what these projects actually do with gulp today.

## Architecture: two independent pipelines, not one bundler for everything

**SCSS→CSS: a standalone harness, no bundler.** Call `sass-embedded`'s own compile API directly, pipe the result through the existing PostCSS plugin chain (`postcss-preset-env`, `@fullhuman/postcss-purgecss`, `postcss-url` for asset rebasing — all already dependencies, already assembled in `config/postcss-plugins-default.js` for the *legacy* `tasks/styles.js` path), write output with plain `fs`. Pair with `chokidar` for watch-mode (the JS API has no built-in watcher). This is a small, fully-owned script — essentially `tasks/styles.js` with the gulp plumbing removed — not a new framework dependency.

This sidesteps, by construction:
- The nested-partial `url()` rebasing gap (no clean bundler-independent equivalent of `resolve-url-loader` exists; a standalone script never has to fight a bundler's module-graph assumptions about where CSS "lives")
- The phantom empty `.js` chunk problem some bundlers emit for CSS-only entries
- The "no dedicated per-entry PostCSS config" gap — irrelevant once there's no bundler-wide PostCSS pipeline to route through; looping `styles.files[]` and compiling each entry directly means "which config applies" is just "the one for the entry you're currently compiling"

Trade-off: asset-hashing logic (images referenced via SCSS `url()` vs. via JS `import`) has to be defined once per pipeline rather than shared — a small, manageable duplication.

**JS/TS/Svelte bundling: Vite**, used purely via its JS build API (`build()` in one-shot mode and `build.watch` mode) — not its dev server/HMR model, which would require injecting a Vite client script into every Twig template across 90 PHP projects, unrelated to the actual goal here. Output is still real files on disk (`www/js/*`), matching today.

## Feature mapping

### SCSS harness (standalone, `sass-embedded` + PostCSS)

| Feature | Approach |
|---|---|
| SCSS→CSS | `sass.compileAsync()` directly (`sass-embedded`, modern API) |
| `styles.includePaths` | `loadPaths` option — direct mapping |
| Per-entry `postCssPresetEnv`/`purgeCss` | Loop `styles.files[]`, build the PostCSS plugin array per entry directly |
| Asset hashing + `url()` rebasing | `postcss-url`, same mechanism the legacy `tasks/styles.js` already uses via `config/postcss-plugins-default.js`. **Caveat**: rebases relative to the compiled entry/output location, not to a nested partial's own directory — if a project relies on assets referenced relative to a partial's directory, it needs adjustment. Current test coverage (`url-rebasing-assets`) only exercises path-flattening from a flat SCSS file, not that edge case, so risk is unconfirmed but real. |
| Per-entry output routing | Direct — output path is `path.join(webdir, destDir, name)` |
| Watch mode | `chokidar` watching `**/*.scss` per project, re-running affected entries on change |

### JS/TS/Svelte bundling (Vite)

| Feature | Approach |
|---|---|
| Per-entry JS output routing, `destDir` honored | `output.entryFileNames` function |
| Image/font assets imported from JS | `output.assetFileNames` as a function keyed on extension |
| `scripts.resolveModulesPaths` | **Gap**: no built-in Vite equivalent of webpack's `resolve.modules`. Custom `resolveId` plugin replicating the search-path behavior |
| `scripts.includeModules` + browserslist-driven Babel target | **Open decision**, see below |
| Global jQuery injection | Rolldown's native `transform.inject` build option — confirmed needed (jQuery is in real use in `gemeinsamer-bundesausschuss`) |
| TypeScript | Vite's built-in transpile is type-check-free by design. Add an explicit `tsc --noEmit` step in `compile()` so type errors still fail the build — but see open decision below, since no sampled project uses TS yet |
| Svelte | **Open decision**, see below — `@sveltejs/vite-plugin-svelte` 7.x (paired with Vite 8) requires Svelte 5+, dropping 3/4 support entirely |
| `mode`/`devtool` via CLI flags | Direct mapping to `build({ mode, build: { sourcemap } })` |

## Open decisions (need a call before implementation starts)

1. **Svelte/TypeScript**: `gemeinsamer-bundesausschuss` uses neither. If that holds across a broader sample of the 90 projects, both could be dropped entirely from the new tooling, meaningfully simplifying it (no Svelte-5-forced-upgrade problem, no separate `tsc --noEmit` step to wire in). **Before finalizing, sample a few more of the 90 projects** for `svelte`/`typescript` in `package.json`.
2. **Browserslist-driven JS transpile target**: Babel today reads each project's own `browserslist` field live. Vite/Oxc has no maintained bridge for this (`browserslist-to-esbuild` is ~2 years stale). **Default**: keep a thin Babel pass wired in via `@rollup/plugin-babel`, scoped only to this concern — safer than silently changing output for old-browser-targeting projects.

## Implementation approach

Build incrementally, validating against the existing test suite at each step:

### 1. SCSS harness: `tasks/scss.js`
Exports `compile(config)`, `watch(config)`. Loops `config.styles.files[]` (normalizing `files`/`inputPath` to an array per entry, per the leniency note above), for each entry: `sass.compileAsync(resolvedInputPath, { loadPaths })` → `postcss([presetEnv, purgecss?, postcssUrl]).process(result.css, { from, to })` → `fs.writeFile` to `<webdir>/<destDir>/<name>`. `watch()` wraps this in a `chokidar` watcher, re-running affected entries on change.

### 2. JS bundler: `tasks/vite.js`
Exports `_config(config)`, `compile(config)`, `watch(config)`. Internals:
- Rollup `input` map from `config.scripts.files[]` (same leniency: `inputPath` as string or array), resolved via `path.resolve(config.webdir, ...)`.
- `output.entryFileNames` replicating `js_<name>` → `<destDir || 'js'>/<name>.js`.
- `output.assetFileNames` for images/fonts imported from JS.
- Custom `resolveId` plugin for `scripts.resolveModulesPaths`.
- `@sveltejs/vite-plugin-svelte`, included only if Svelte support survives the open decision above.
- Thin `@rollup/plugin-babel` pass for browserslist-driven transpile + `includeModules` whitelist regex.
- Rolldown's `transform.inject` for jQuery (`$`/`jQuery` → `'jquery'`), always on.
- `compile()` shells out to `tsc --noEmit` if TS support survives the open decision above.
- `watch()` uses Vite's `build({ build: { watch: {} } })` mode.

### 3. Test harnesses
`tests/runScss.js` and `tests/runVite.js`, mirroring `tests/runWeballpacka.js`'s `buildWithConfig(config, fixturePath)` signature/return shape. `tests/css.test.js` swaps its import to `./runScss`, `tests/js.test.js` swaps to `./runVite` — same specs, same fixtures, no test rewrites needed.

### 4. `tasks/browsersync.js` equivalent
New `tasks/serve.js` wiring BrowserSync to proxy `config.proxyUrl` and trigger both `tasks/scss.js`'s and `tasks/vite.js`'s `watch()` on file changes, reloading on rebuild.

### 5. Drop legacy tasks
Remove `tasks/webpack.js`, `tasks/styles.js` (superseded by `tasks/scss.js`), `tasks/scripts.js`, `tasks/stylepack.js`, `tasks/weballpacka.js` (once both new engines are validated), and the `gulp` dependency itself from this package. Keep `tasks/stylelint.js` and `tasks/svgmin.js` as-is (small non-gulp rewrite of the `gulp.src`/`gulp.dest` plumbing, no architecture change).

### 6. Consuming-project migration shape
Replace each project's `gulpfile.js` boilerplate around the *preset-integration points only* (`js`/`css`/`serve` functions) with calls into the new `scss.compile(config)`/`vite.compile(config)`/`watch`/`serve` functions — leave any project-owned custom tasks (copy/rename/zip/exec) untouched, per the "out of scope" note above. Per-project changes: update the devDependency, adjust the preset-wiring portion of `gulpfile.js`, migrate off `node-sass` first if still on it, optionally add npm scripts (many projects, per the sampled one, currently have none). Document as a short `UPGRADING.md` entry.

## Verification (once implementation starts)
- `yarn jest tests/css.test.js` (pointed at `runScss`) — all CSS specs pass against the new harness
- `yarn jest tests/js.test.js` (pointed at `runVite`) — all JS specs pass
- `yarn jest` — full suite green
- Manually smoke-test both `watch()` functions against a fixture
- Sample a few more of the 90 projects for config shape, Svelte/TS usage, and custom-task patterns before finalizing the two open decisions
- Before wide rollout: pilot against 1-2 real downstream projects (ideally ones exercising `www/bundles`-nested SCSS partials with relative asset references) to validate the `postcss-url` rebasing behavior against real-world usage

## Status

Pre-implementation analysis. Two open decisions (Svelte/TypeScript scope, browserslist-driven transpile target) should be confirmed — ideally against a broader sample of the 90 projects, not just `gemeinsamer-bundesausschuss` — before work begins. Tracked on the `vite` branch.
