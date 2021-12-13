function stylelint(gulp, $, config) {
    return gulp.src(config.stylelint.files, { cwd: config.webdir })
        .pipe($.stylelint({
            failAfterError: false,
            reporters: [
                { formatter: 'verbose', console: true }
            ],
            fix: true
        }))
        .pipe(gulp.dest(`${config.webdir}/${config.stylelint.destDir}`));
}

exports.stylelint = stylelint;
