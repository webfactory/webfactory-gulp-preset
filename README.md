# webfactory-gulp-preset

## Ordnerstruktur

webfactory-gulp-preset assumes that `gulpfile.js` and a `gulp-config.js` are located in the project's root folder. 

## Example Gulpfile (`gulpfile.js`)

```js
const gulp = require('gulp');
const $ = require('./webfactory-gulp-preset/plugins')(); /// lädt alle gulp-*-Module in $.*

const config = require('./gulp-config');

// Deklariere Sass compiler explizit – node-sass ist zwar aktuell default, aber so sind wir
// future-compatible falls sich das ändern sollte;
// die neue Sass Referenz-Implementierung ist dart-sass (https://github.com/sass/dart-sass)!
$.sass.compiler = require('node-sass');

const { scripts } = require('./webfactory-gulp-preset/tasks/scripts');
const { styles } = require('./webfactory-gulp-preset/tasks/styles');
const { stylelint } = require('./webfactory-gulp-preset/tasks/stylelint');

function js(cb) {
    scripts(gulp, $, config);
    cb();
}

function css(cb) {
    styles(gulp, $, config);
    cb();
}

function lintsass(cb) {
    stylelint(gulp, $, config);
    cb();
}

exports.js = js;
exports.css = css;
exports.stylelint = lintsass;
exports.compile = gulp.parallel(css, js);
exports.default = gulp.parallel(css, js);
```

## Example for a project-specific config (`gulp-config.js`)
```js
// roll your own function if you need to use more or different plugins
const { postCssPlugins } = require('./webfactory-gulp-preset/config/postcss-plugins-default');

module.exports = {
    scripts: {
        files: [
            {
                name: 'main.js',
                files: [
                    '../node_modules/lazysizes/lazysizes.min.js',
                    '../src/assets/js/my-cool-interactive-feature.js',
                ],
                destDir: 'js'
            }
        ]
    },
    styles: {
        files: [
            {
                name: 'main.css',
                files: [
                    '../src/assets/scss/main.scss',
                ],
                destDir: 'css'
            }
        ],
        postCssPlugins: postCssPlugins
    },
    stylelint: {
        files: [
            '../src/assets/scss/**/*.scss'
        ],
        destDir: 'src/assets/scss'
    },

    'webdir': 'dist',
    'npmdir': './node_modules',

    'development': true
}
```
