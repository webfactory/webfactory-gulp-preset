function browsersync(gulp, $, config, css, js) {
    $.browserSync.init({
        proxy: 'http://' + config.proxyUrl,
        open: false
    });

    // set a config param to signal browserSync is active;
    // styles.js will suppress errors for this env to avoid
    // the watch process exiting on errors
    config.livereload = true;

    gulp.watch(config.styles.watch, { usePolling: true }, css);
    gulp.watch(config.scripts.watch, { usePolling: true }, js);
}

exports.browsersync = browsersync;
