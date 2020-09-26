# webfactory-gulp-preset

## Folder structure

webfactory-gulp-preset assumes that `gulpfile.js` and a `gulp-config.js` are located in the project's root folder. 

## Example Gulpfile (`gulpfile.js`)

```js
const gulp = require('gulp');
const $ = require('./webfactory-gulp-preset/plugins')(); // loads all gulp-* modules in $.* for easy reference

const config = require('./gulp-config');

// Explicitly declare the Sass compiler – node-sass is the current default compiler in gulp-sass,
// but we want to be future-compatible in case this changes;
// fyi: the new canonical Sass Implementation is dart-sass (https://github.com/sass/dart-sass)
$.sass.compiler = require('node-sass');

const { scripts } = require('./webfactory-gulp-preset/tasks/scripts');
const { styles } = require('./webfactory-gulp-preset/tasks/styles');
const { stylelint } = require('./webfactory-gulp-preset/tasks/stylelint');
const { browsersync } = require('./webfactory-gulp-preset/tasks/browsersync');

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

function serve(cb) {
    browsersync(gulp, $, config, css, js);
    cb();
}

exports.js = js;
exports.css = css;
exports.stylelint = lintsass;
exports.serve = serve;
exports.compile = gulp.parallel(css, js);
exports.default = gulp.series(gulp.parallel(css, js), serve);
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
        ],
         watch: ['src/assets/js/**/*.js'],
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
        watch: ['src/assets/scss/**/*.scss'],
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
