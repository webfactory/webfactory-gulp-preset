# webfactory-gulp-preset

## Folder structure

webfactory-gulp-preset assumes that `gulpfile.js` and a `gulp-config.js` are located in the project's root folder. 

## Example for minimal dependencies (`package.json`)

```json
{
  "private": true,
  "dependencies": {
    "browserslist-config-webfactory": "^1.1.0",
    "webfactory-gulp-preset": "^1.0.4"
  },
  "browserslist": [
    "extends browserslist-config-webfactory/default"
  ]
}
```

## Example Gulpfile (`gulpfile.js`)

```js
const gulp = require('gulp');
const $ = require('./node_modules/webfactory-gulp-preset/plugins')(); // loads all gulp-* modules in $.* for easy reference

const config = require('./gulp-config');

// Explicitly declare the Sass compiler – node-sass is the current default compiler in gulp-sass,
// but we want to be future-compatible in case this changes;
// fyi: the new canonical Sass Implementation is dart-sass (https://github.com/sass/dart-sass)
$.sass.compiler = require('node-sass');

const { scripts } = require('./node_modules/webfactory-gulp-preset/tasks/scripts');
const { styles } = require('./node_modules/webfactory-gulp-preset/tasks/styles');
const { browsersync } = require('./node_modules/webfactory-gulp-preset/tasks/browsersync');

function js(cb) {
    scripts(gulp, $, config);
    cb();
}

function css(cb) {
    styles(gulp, $, config);
    cb();
}

function serve(cb) {
    browsersync(gulp, $, config, css, js);
    cb();
}

exports.js = js;
exports.css = css;
exports.serve = serve;
exports.compile = gulp.parallel(css, js);
exports.default = gulp.series(gulp.parallel(css, js), serve);
```

## Example for a project-specific config (`gulp-config.js`)

```js
const argv = require('minimist')(process.argv.slice(2));

// roll your own function if you need to use more or different plugins
const { postCssPlugins } = require('./node_modules/webfactory-gulp-preset/config/postcss-plugins-default');

module.exports = {
    scripts: {
        files: [
            {
                name: 'main.js',
                files: [
                    '../node_modules/lazysizes/lazysizes.min.js',
                    'PATH_TO_PROJECT_ASSETS_DIR/js/my-cool-interactive-feature.js',
                ],
                destDir: 'js'
            }
        ],
         watch: ['PATH_TO_PROJECT_ASSETS_DIR/assets/js/**/*.js'],
    },
    styles: {
        files: [
            {
                name: 'main.css',
                files: [
                    'PATH_TO_PROJECT_ASSETS_DIR/scss/main.scss',
                ],
                destDir: 'css'
            }
        ],
        watch: ['PATH_TO_PROJECT_ASSETS_DIR/scss/**/*.scss'],
        postCssPlugins: postCssPlugins
    },
    stylelint: {
        files: [
            'PATH_TO_PROJECT_ASSETS_DIR/scss/**/*.scss'
        ],
        destDir: 'PATH_TO_PROJECT_ASSETS_DIR/scss'
    },

    "development": (argv.env || process.env.APP_ENV || 'development') === 'development',
    "webdir": "www",
    "libdir": "vendor", // composer deps directory, might be called "lib"
    "tempdir": "tmp",
    "npmdir": "node_modules"
}
```

### Additional config options

#### Custom include paths for SCSS

You can optionally pass include paths directly as a property of the `styles` object  in `gulp-config.js` if you need more than the default `[config.npmdir]`:

Example (excerpt from `gulp-config.js`):

```js
// […]
styles: {
    files: [
        …
    ],
    includePaths: ['PATH_TO_DEPENDENCIES_1', 'PATH_TO_DEPENDENCIES_2'],
    postCssPlugins: postCssPlugins,
    watch: ['src/**/*.scss']
},
// […]
```


#### PurgeCSS

[PurgeCSS](https://purgecss.com/) is a tool to automatically remove unused CSS. webfactory-gulp-preset comes with 
postcss-purgecss preinstalled, but it is only activated if a `purgeCss` object is defined as a property of the 
`styles` object in `gulp-config.js`.

All documented options (for the PostCSS implementation) are supported. 

Example (excerpt from `gulp-config.js`):

```js
// […]
styles: {
    files: [
        {
            name: 'main.css',
            files: [
                'PATH_TO_PROJECT_ASSETS_DIR/scss/main.scss',
            ],
            destDir: 'css'
        }
    ],
    purgeCss: {
        content: [
            './src/PROJECT_TEMPLATES/**/*.twig',
            './src/JS_COMPONENTS_THAT_USE_CSS_SELECTORS/**/*.js',
            './vendor/PACKAGE/TEMPLATES/**/*.twig',
        ],
        safelist: ['ANY_VALID_CSS_SELECTOR']
    },
    postCssPlugins: postCssPlugins,
    watch: ['src/**/*.scss']
},
// […]
```
