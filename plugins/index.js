module.exports = function(config) {
    const $ = require('gulp-load-plugins')({
        // from v5.0.0 onwards, gulp-sass requires the sass compiler to be passed when instantiating the function;
        // we use postRequireTransforms to do this when it has already been initialized by gulp-load-plugins
        postRequireTransforms: {
            sass: function(sass) {
                let sassCompiler = 'node-sass';

                if (config && config.styles && config.styles.sassCompiler) {
                    sassCompiler = config.styles.sassCompiler;
                }

                return sass(require(sassCompiler));
            }
        }
    });

    $['argv'] = require('minimist')(process.argv.slice(2));
    $['autoprefixer'] = require('autoprefixer');
    $['browserSync'] = require('browser-sync').create();
    $['log'] = require('fancy-log');
    $['path'] = require('path');
    $['postcssurl'] = require('postcss-url');
    $['purgecss'] = require('@fullhuman/postcss-purgecss');
    $['through2'] = require('through2');

    return $;
}
