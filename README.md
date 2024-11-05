# webfactory-gulp-preset

This is a collection of useful Gulp tasks for 

- linting & compiling Sass (SCSS) to CSS
- bundling JavaScript with Webpack
- optimizing SVG source files

While almost all dependencies are declared by this package, the choice of Sass compiler is left to the project – either
`sass-embedded` (Dart Sass, current canonical implementation, recommended) or `node-sass` need to be installed as direct
project dependencies. 

## Table of contents

1. [Basic Setup](#basic-setup)
   1. [Folder structure](#folder-structure)
   2. [Minimum dependencies](#minimum-dependencies-packagejson)
   3. [Gulpfile](#gulpfile-gulpfilejs)
   4. [Project-specific config](#project-specific-config-gulp-configjs)
2. [Options](#options)
   1. [SCSS/CSS pipeline](#scsscss-pipeline)
      1. [Choose the Sass compiler](#choose-the-sass-compiler)
      2. [Custom include paths for SCSS](#custom-include-paths-for-scss)
      3. [PurgeCSS](#purgecss)
   2. [JS pipeline](#js-pipeline)
      1. [Svelte](#svelte)
      2. [Custom paths for module resolving](#custom-paths-for-module-resolving)
      3. [Transpile packages from `node_modules`](#transpile-packages-from-nodemodules)
      4. [[legacy] Don't use Webpack to bundle JavaScript modules](#legacy-dont-use-webpack-to-bundle-javascript-modules)
         - [Convert ("transcompile") modern JavaScript to backwards compatible ES5 for older browsers](#convert-transcompile-modern-javascript-to-backwards-compatible-es5-for-older-browsers)
   3. [SVG optimizations](#svg-optimizations)

## Basic Setup

### Folder structure

webfactory-gulp-preset assumes that `gulpfile.js` and a `gulp-config.js` are located in the project's root folder.

### Minimum dependencies (`package.json`)

```json
{
  "private": true,
  "dependencies": {
    "browserslist-config-webfactory": "^1.1.0",
    "webfactory-gulp-preset": "^3.0.0",
    "sass-embedded": "1.64.2"
  },
  "browserslist": [
    "extends browserslist-config-webfactory/default"
  ]
}
```

### Gulpfile (`gulpfile.js`)

```js
const gulp = require('gulp');
const config = require('./gulp-config');
const $ = require('./node_modules/webfactory-gulp-preset/plugins')(config); // loads all gulp-* modules in $.* for easy reference


const { webpack } = require('./node_modules/webfactory-gulp-preset/tasks/webpack');
const { styles } = require('./node_modules/webfactory-gulp-preset/tasks/styles');
const { browsersync } = require('./node_modules/webfactory-gulp-preset/tasks/browsersync');

function js(cb) {
    webpack(gulp, $, config);
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

### Project-specific config (`gulp-config.js`)

```js
const argv = require('minimist')(process.argv.slice(2));

// roll your own function if you need to use more or different plugins
const { postCssPlugins } = require('./node_modules/webfactory-gulp-preset/config/postcss-plugins-default');

module.exports = {
    scripts: {
        files: [
            {
                name: 'scripts',
                inputPath: [
                    'PATH_TO_PROJECT_ASSETS_DIR/js/scripts.js',
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
        postCssPlugins: postCssPlugins,
        sassCompiler: 'sass', // this passes Dart Sass to gulp-sass
        watch: ['PATH_TO_PROJECT_ASSETS_DIR/scss/**/*.scss']
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

## Options

### SCSS/CSS pipeline

#### Choose the Sass compiler

For backwards-compatibility reasons, the default compiler is LibSass via node-sass, [which has been deprecated by the Sass project](https://sass-lang.com/blog/libsass-is-deprecated). You can pick the canonical implementation (Dart Sass) by setting `sassCompiler` on the `styles` object in `gulp-config.js`. You will need to install the Dart Sass Node package via npm or yarn (`npm install sass` or `yarn add sass`).

Example (excerpt from `gulp-config.js`):

```js
// […]
styles: {
    files: [
        …
    ],
    sassCompiler: 'sass', // this passes Dart Sass to gulp-sass
    postCssPlugins: postCssPlugins,
    watch: ['src/**/*.scss']
},
// […]
```

#### Custom include paths for SCSS

You can optionally pass include paths directly as a property of the `styles` object in `gulp-config.js` if you need more than the default `[config.npmdir]`:

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

### JS pipeline

#### Svelte
The Webpack Gulp task is preconfigured for compiling Svelte apps, but you need to require `svelte` and `svelte-loader` as a direct dependencies in your project to make it work. 

Specify 
- the `svelteVersion` as a first-level property (string or number) in `gulp-config.js`, e.g. `svelteVersion: '^4.2'`; the path to Svelte internals changed in v4 which is why the project needs to supply the Svelte version that is in use. If no `svelteVersion` is provided, this preset defaults to settings for version 3. 
- the entry point (.js file) as any other in `gulp-config.js`, 

and Webpack will auto-detect Svelte and know what to do.

#### Custom paths for module resolving
Webpack has defaults (like `node_modules`, for obvious reasons) for what directories should be searched when resolving modules. It's possible to pass through additional paths to the resolver; this can be helpful if you want to be able to `import` JS files from a Symfony bundle without having to supply a long and fragile relative path. To do so, add the following property to the scripts object:
`resolveModulesPaths: ['www/bundles']`

In your project's JS file you can now import relative to the symlinked folder, i.e. `import 'webfactoryembed/js/embed.esm.js';`.

#### Transpile packages from `node_modules`
Due to performance reasons, `node_modules` is excluded from transpiling by default. To ensure backwards-compatibility you can whitelist certain modules from the exclusion. To do so, add the following property to the scripts object:  
`includeModules: ['module_folder_name_1', 'module_folder_name_2']`

#### [legacy] Don't use Webpack to bundle JavaScript modules

As of Version 2.9 the Webpack task is the standard for bundling Javascript modules. The "old" way of concatenating all JS is still usable, but needs some changes to your projects `gulpfile.js` and `gulp-config.js`. 
From version 2.2 onwards, webfactory-gulp-preset offers a Webpack task that can be invoked **instead of** the "old" way
of concatenating all JS files listed in an array of input paths. The Webpack task can be configured with multiple entry 
points and supports Svelte Apps and backwards-compatible builds with Babel out of the box.

If you dont't want to use Webpack, require the corrensponding task `sripts` and call it in the JS function in your Gulpfile instead of
`webpack`:

```js
const { scripts } = require('./node_modules/webfactory-gulp-preset/tasks/scripts');

function js(cb) {
    scripts(gulp, $, config);
    cb();
}
```

The scripts object in `gulp-config.js` needs to be adapted as follows:

```js
// […]
scripts: {
    files: [
        {
            name: 'main.js',
            files: [
                '../node_modules/some-cool-package/cool-package.min.js',
                'PATH_TO_PROJECT_ASSETS_DIR/js/my-cool-interactive-feature.js',
            ],
            destDir: 'js'
        },
        {
            name: 'polyfills',
            inputPath: 'bundles/app/js/object-fit-polyfill.js',
            destDir: 'js'
        },
    ],
    watch: ['…']
},
// […]
```

`scripts.js` should have top-level `import` statements to your JS modules/components, which can in turn contain further
`import` statements to their respective dependencies.

##### Convert ("transcompile") modern JavaScript to backwards compatible ES5 for older browsers

[Babel](https://babeljs.io/) is a toolchain that is mainly used to convert ECMAScript 2015+ code into a backwards 
compatible version of JavaScript in current and older browsers or environments. webfactory-gulp-preset comes with
Babel preinstalled and preconfigured with the default `@babel/preset-env` preset. 

**Please note:** To save precious compile time, the Babel step is not run by default. Set `convertToES5` to `true` in 
the config object of the JS files you want to transcompile back down to ES5.

Example (excerpt from `gulp-config.js`):

```js
// […]
scripts: {
    files: [
        {
            name: 'script-for-old-browsers.js',
            files: [
                '../node_modules/some-cool-package/cool-package.min.js',
                'PATH_TO_PROJECT_ASSETS_DIR/js/my-cool-interactive-feature.js',
            ],
            convertToES5: true,
            destDir: 'js'
        }
    ],
    watch: ['…']
},
// […]
```

### SVG optimizations

From version 2.7 onwards, webfactory-gulp-preset offers a SVGMin task that can be used to optimize SVGs when they first
enter the code base. The task uses a hardwired SVGO configuration that takes care of the risk of ID collisions across 
different inline SVGs (i.e. multiple references to a clip-path by the same optimized ID "a") by replacing IDs with 
random strings. As this would generate changes every time the task is run, it is advisable to use CLI parameters to at 
scope the source file(s) per run. Files are overwritten by default, but a dest path can be passed if needed.

```js
const {svgmin} = require("webfactory-gulp-preset/tasks/svgmin");

function svgo(cb) {
    svgmin(gulp, $, config);
    cb();
}

exports.svgo = svgo;
```

**Example CLI usage:**

The task uses root (`./`) as base for `gulp.src()`.

```bash
gulp svgo --src src/AppBundle/Resources/public/img/logo.svg
gulp svgo --src www/bundles/app/img/logo.svg
```

Please note: any kind of file globbing with `*` or `**` needs to be quoted on the command line.

```bash
gulp svgo --src "src/AppBundle/Resources/public/img/icons/*.svg"
gulp svgo --src "src/AppBundle/Resources/public/img/**/*.svg"
```

```bash
gulp svgo --src "src/AppBundle/Resources/public/img/**/*.svg" --dest tmp/svg-test/
```
