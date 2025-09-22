# Upgrading

webfactory-gulp-preset follows semantic versioning.

## Upgrade to 3.x

- **breaking** Sass compiler is no longer provided as a transitive dependency by this package. Add either `sass-embedded` 
(Dart Sass, current canonical implementation, recommended) or `node-sass` as a direct dependency in any project.
- **breaking** `svelte-loader` is no longer provided as a transitive dependency by this package. Add it as a direct dependency in your project if you want to compile Svelte Apps.

## Upgrade to 2.x

- **breaking** New default Sass compiler is LibSass (via node-sass)
- **deprecated** Remove `$.sass.compiler = require('node-sass');` from Gulpfile
- _optional_ Use Dart Sass via `config.styles.sassCompiler: 'sass'` and pass the `config` object to webfactory-gulp-preset/plugins (e.g. `const $ = require('./node_modules/webfactory-gulp-preset/plugins')(config)`). You will need to install the `sass` package via yarn or npm if you want to use Dart Sass.
