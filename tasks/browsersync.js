function browsersync(gulp, $, config, css, js) {
    $.browserSync.init({
        proxy: 'http://' + config.proxyUrl,
        open: false
    });

    gulp.watch(config.styles.watch, { usePolling: true }, css);
    gulp.watch(config.scripts.watch, { usePolling: true }, js);
}

exports.browsersync = browsersync;
