# Gulp → Vite Migration: Analysis & Plan

## Context

`webfactory-gulp-preset` is consumed as a devDependency by ~90 downstream projects via a `gulpfile.js` + `gulp-config.js` pair. The goal is to replace the Gulp+Webpack pipeline with Vite while keeping the config *interface* close enough that migrating each of the 90 projects is a small, mechanical change rather than a rewrite — the config doesn't need to be byte-identical, just close. Full test coverage (`tests/css.test.js`, `tests/js.test.js`) must keep passing, exercised against the new engine.

Research (via two Explore agents) surfaced the current full feature surface and Vite-ecosystem equivalents. Key findings:

- **`tasks/weballpacka.js`** (Webpack, `_config`/`compile`/`watch` exports) is the actively-developed engine — the only one with test coverage — using a config shape where every `styles.files[]`/`scripts.files[]` entry has a single `inputPath` string. README.md documents a *different*, older shape (`files: [...]` arrays) tied to legacy `tasks/webpack.js`/`tasks/styles.js`/`tasks/scripts.js`, with no migration note bridging the two. **Confirmed**: most of the 90 projects already use the `inputPath` shape — that's the one to treat as canonical. `tasks/stylepack.js` looks like dead code (weballpacka's CSS-half ancestor, unreferenced anywhere).
- **Sass compiler**: about half the projects are already on `sass-embedded`, the rest are migrating soon. The Vite rewrite should standardize on `sass-embedded` only (matches Vite's native modern-Sass support) — projects still on `node-sass` need to migrate as a prerequisite, which is already underway independent of this work.
- **Vite is current at 8.2.2** (npm, checked 2026-08-26), now "rolldown-vite" (uses Rolldown/Oxc, not Rollup/esbuild, by default).
- Feature-by-feature Vite equivalents (details below) are mostly clean; three areas have real gaps requiring bespoke glue code, and two areas are open decisions.

## Architecture decision: Vite as a batch bundler, not a dev server

The current setup writes real files to disk (`www/css/*`, `www/js/*`) consumed by server-rendered Twig/PHP templates; BrowserSync just proxies + live-reloads. Adopting Vite's dev-server/HMR model would require injecting a Vite client script and rewriting how templates reference assets — a large, risky change across 90 PHP projects. **Recommendation: use Vite purely via its JS build API** (`build()` in one-shot mode and in `build.watch` mode), so output is still real files on disk at the same paths, and BrowserSync (or an equivalent) continues to proxy the existing PHP dev server and reload on file changes — this is the same shape as today, just with Vite/Rollup under the hood instead of Webpack. This keeps the 90-project migration mechanical: swap the tool, keep the templates.

## Feature mapping (Webpack → Vite), confirmed via research

| Feature | Approach |
|---|---|
| SCSS→CSS via sass-embedded | Native (`css.preprocessorOptions.scss`, modern API) — no plugin needed |
| `styles.includePaths` | `css.preprocessorOptions.scss.loadPaths` — direct mapping |
| Per-entry `postCssPresetEnv`/`purgeCss` | No dedicated Vite feature for per-entry PostCSS config (Vite's `css.postcss` is one global pipeline) — port the existing path-matching factory pattern from `weballpacka.js`'s `postcssOptions` callback into a custom PostCSS plugin keyed off `root.source.input.file` |
| Asset hashing (`img/[name].[hash][ext]`, `fonts/...`) | `build.rollupOptions.output.assetFileNames` as a function keyed on extension — clean 1:1 |
| Nested-partial `url()` rebasing (resolve-url-loader today) | **Gap**: no Vite equivalent exists; multiple open, unresolved Vite issues for exactly this case. Mitigate by reusing `postcss-url` (already a dependency, already used by the *legacy* `tasks/styles.js` path via `config/postcss-plugins-default.js`) as the rebasing mechanism in the Vite CSS pipeline instead of relying on Sass/Vite's own partial-relative resolution. **Caveat to flag during rollout**: this rebases relative to the compiled entry/output location, same limitation the legacy postcss-url path already has — if any project relies on assets referenced relative to a *nested partial's own directory* (not the entry or a fixed root), that specific project needs adjustment. Current test coverage (`url-rebasing-assets`) only exercises path-flattening from a single flat SCSS file, not this edge case, so risk is unconfirmed but real. |
| CSS-only entries emitting a phantom empty `.js` chunk | **Gap**: open Vite/Rollup issue, no maintained `webpack-remove-empty-scripts` equivalent. Mitigate with a small custom `generateBundle` plugin hook that deletes chunks whose only source was a CSS-only entry |
| Per-entry CSS output routing (`css_<name>` → `<destDir>/<name>`) | `output.assetFileNames` function, same pattern as today's `MiniCssExtractPlugin` filename callback |
| Per-entry JS output routing (`js_<name>` → `js/<name>.js`) | `output.entryFileNames` function, same pattern |
| `scripts.resolveModulesPaths` | **Gap**: no built-in Vite equivalent of webpack's `resolve.modules`. Implement a small custom `resolveId` Rollup/Vite plugin replicating the search-path behavior |
| `scripts.includeModules` + browserslist-driven Babel target | **Open decision** (see below) |
| Global jQuery injection | Rolldown's native `transform.inject` build option (documented as the replacement for `@rollup/plugin-inject`, which Rolldown's plugin-compat tracker lists as no longer needed) |
| TypeScript | Vite's built-in esbuild/Oxc transpile is type-check-free by design (ecosystem norm). Add an explicit `tsc --noEmit` step invoked by `compile()` alongside the Vite build so type errors still fail the build, matching `ts-loader`'s current behavior |
| Svelte | **Open decision** (see below) — `@sveltejs/vite-plugin-svelte` works standalone (no SvelteKit needed) in a multi-entry build, but current major (7.x, paired with Vite 8) requires **Svelte 5+**, dropping 3/4 support entirely |
| `mode`/`devtool` via CLI flags | Direct mapping to `build({ mode, build: { sourcemap } })` — Vite's intended usage |
| `destDir` on `scripts.files[]` | Currently documented in README but silently ignored by `weballpacka.js` (always outputs to `js/`). Since we're already breaking config compatibility slightly, **fix this** in the Vite version — honor `destDir` for JS entries too, matching what was always documented |

## Open decisions (need a call before implementation starts)

1. **Svelte**: do any of the 90 projects use Svelte, and on what version? If none, drop Svelte support entirely from the Vite tooling (simplest). If some are on Svelte 3/4, they're hard-blocked from `@sveltejs/vite-plugin-svelte` 7.x/Vite 8 and would need a Svelte 5 upgrade as a migration prerequisite, or we pin an older Vite major just for them (fragments the toolchain). **Default if undecided**: keep Svelte support via the current plugin major, document the Svelte-5 requirement plainly in the migration notes, treat it as a per-project blocker to resolve individually rather than centrally.
2. **Browserslist-driven JS transpile target**: Babel today reads each project's own `browserslist` field live (e.g. still emits `var`/`function` for IE11-targeting projects). Vite/Oxc has no maintained bridge for this (`browserslist-to-esbuild` is ~2 years stale). **Default**: keep a thin Babel pass wired in via `@rollup/plugin-babel`, scoped only to this concern (driven by browserslist, same `includeModules`-style node_modules include/exclude regex as today) — safer than silently changing output for old-browser-targeting projects, small addition, doesn't block adopting Vite/Rolldown for everything else.

## Implementation approach

Build incrementally, validating against the existing test suite at each step, mirroring the CSS/JS split the tests already use:

### 1. New engine module: `tasks/vite.js`
Exports `_config(config)`, `compile(config)`, `watch(config)` — same contract shape as `tasks/weballpacka.js` (`gulpfile.js` in each project currently calls these with `(gulp, $, config)`; since gulp is being dropped, the new signature drops the `gulp`/`$` params entirely — config-object-only). Internals:
- Build a Rollup `input` map from `config.styles.files[]` + `config.scripts.files[]`, prefixed `css_`/`js_` like today, resolved via `path.resolve(config.webdir, file.inputPath)`.
- `css.preprocessorOptions.scss.loadPaths` from `config.styles.includePaths` + `config.npmdir` + `www/bundles` (matches current hardcoded behavior).
- Custom PostCSS plugin wrapping `postcss-preset-env` + `@fullhuman/postcss-purgecss` + `postcss-url`, keyed per-entry the same way `weballpacka.js`'s `postcssOptions` callback does today.
- `output.entryFileNames`/`output.assetFileNames` functions replicating the `css_<name>` → `<destDir>/<name>`, `js_<name>` → `js/<name>.js` (with `destDir` now honored), `img/[name].[hash][ext]`, `fonts/[name].[hash][ext]` routing.
- Custom `generateBundle` hook removing phantom empty JS chunks from CSS-only entries.
- Custom `resolveId` plugin for `scripts.resolveModulesPaths`.
- `@sveltejs/vite-plugin-svelte`, conditionally included if `config.scripts.files` reference `.svelte` (or always included — cheap either way).
- Thin `@rollup/plugin-babel` pass for browserslist-driven transpile + `includeModules` whitelist regex (same pattern as today's babel-loader exclude regex).
- Rolldown's `transform.inject` for jQuery (`$`/`jQuery` → `'jquery'`), always on, matching today.
- `compile()` also shells out to `tsc --noEmit` (if any `.ts` entries exist / a `tsconfig.json` is present) so type errors fail the build, before or alongside the Vite build.
- `watch()` uses Vite's `build({ build: { watch: {} } })` mode — same "always real files on disk" semantics as today's `webpack(...).watch()`.

### 2. Test harness: `tests/runVite.js`
New file mirroring `tests/runWeballpacka.js`'s `buildWithConfig(config, fixturePath)` signature and return shape (`{ files, assets }`) exactly, but driving `tasks/vite.js` instead of `tasks/weballpacka.js`. Keeping the signature identical means `tests/css.test.js`/`tests/js.test.js` need only their `require('./runWeballpacka')` swapped to `require('./runVite')` to run the exact same specs against the new engine — directly satisfies "all test cases must pass," no test rewrites needed. Build CSS coverage first (swap `css.test.js`'s import, get it green), then JS (swap `js.test.js`'s import, get it green) — CSS has fewer moving parts (no Babel/TS/Svelte/jQuery matrix) so it validates the core entry/output-routing machinery before tackling the harder JS-side gaps.

### 3. `tasks/browsersync.js` equivalent
New `tasks/serve.js` (or extend `tasks/vite.js`) wiring BrowserSync to proxy `config.proxyUrl` and trigger `watch()`'s rebuild-and-reload on file changes — same shape as today's `browsersync.js`, just triggered by the new watch function instead of `gulp.watch`.

### 4. Drop legacy tasks
Remove `tasks/webpack.js`, `tasks/styles.js`, `tasks/scripts.js`, `tasks/stylepack.js`, and the `gulp` dependency itself once the Vite path is validated. Keep `tasks/stylelint.js` and `tasks/svgmin.js` as-is — both are framework-agnostic (no webpack/gulp-bundling involvement beyond the `gulp.src`/`gulp.dest` plumbing, which needs a small non-gulp rewrite, e.g. plain `fs`/`fast-glob`, but no pipeline-architecture change).

### 5. Consuming-project migration shape
Replace each project's `gulpfile.js` boilerplate with a small `build.js` (or a thin CLI, e.g. `webfactory-vite-preset build|watch|serve`) that just calls `compile(config)`/`watch(config)`/`serve(config)` from this package, reading the same `gulp-config.js` (rename optional). Per-project changes needed: update the devDependency, trim/replace `gulpfile.js`, adjust config for the now-canonical `inputPath` shape if not already on it, drop `sassCompiler` if set to `node-sass` (migrate to `sass-embedded` first), update npm scripts. Document this as a short `UPGRADING.md` entry (the project's historical practice, lapsed since v2.x — worth reviving here given the scale of this change).

## Verification (once implementation starts)
- `yarn jest tests/css.test.js` (pointed at `runVite`) — all CSS specs pass against the new engine
- `yarn jest tests/js.test.js` (pointed at `runVite`) — all JS specs pass, including TypeScript/Svelte/includeModules/resolveModulesPaths/asset-hashing/symlinked-bundles
- `yarn jest` — full suite green
- Manually smoke-test `watch()` against a fixture (edit a source file, confirm output file updates) since the test suite only covers one-shot builds today
- Before wide rollout: pilot the new tooling against 1-2 real downstream projects (ideally ones exercising `www/bundles`-nested SCSS partials with relative asset references) to validate the `postcss-url` rebasing mitigation against real-world usage, not just the current test fixtures

## Status

This document is a **pre-implementation analysis** — no code has been written yet. The two open decisions above (Svelte version scope, browserslist-driven transpile target) should be confirmed before work begins. This is being tracked on the `vite` branch.
