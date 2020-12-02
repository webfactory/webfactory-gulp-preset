module.exports = function() {
    const $ = require('gulp-load-plugins')(); /// lädt alle gulp-*-Module in $.*

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
