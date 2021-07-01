# Upgrading

webfactory-gulp-preset follows semantic versioning.

## Upgrade to 2.x

- **breaking** New default Sass compiler is LibSass (via node-sass)
- **deprecated** Remove `$.sass.compiler = require('node-sass');` from Gulpfile
- _optional_ Use Dart Sass via `config.styles.sassCompiler: 'sass'` and pass the `config` object to webfactory-gulp-preset/plugins (e.g. `const $ = require('./node_modules/webfactory-gulp-preset/plugins')(config)`). You will need to install the `sass` package via yarn or npm if you want to use Dart Sass.
