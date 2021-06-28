# Changelog

## 2.0.1

- Add info about deprecated practice that was part of the v1.x Gulpfile example to the 2.0.0 release notes

## 2.0.0

- **[breaking]** set Sass compiler to node-sass (making it impossible to configure in projects for now)
- [deprecated] it is no longer necessary to add `$.sass.compiler = require('node-sass');` in your Gulpfile (nor will it have any effect, see above) 
- update all dependencies to latest
