# Changelog

## 2.2.1

- [fixed] Provide Webpack and plugins in $

## 2.2.0

- [added] New task for JavaScript bundling with Webpack (optional)

## 2.1.0

- [added] Make Sass compiler configurable (LibSass via node-sass is the default); requires config to be passed to `const $ = require('./node_modules/webfactory-gulp-preset/plugins')(config)`

## 2.0.1

- [fixed] Add info about deprecated practice that was part of the v1.x Gulpfile example to the 2.0.0 release notes

## 2.0.0

- **[breaking]** set Sass compiler to node-sass
- [deprecated] it is no longer necessary to add `$.sass.compiler = require('node-sass');` in your Gulpfile (nor will it have any effect, see above) 
- update all dependencies to latest
