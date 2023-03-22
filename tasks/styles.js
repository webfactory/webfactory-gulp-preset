function styles(gulp, $, config) {
    // take the array and map over each script config object in it
    const tasks = config.styles.files.map((stylesheet) => {
        let func = (done) => {
            const sourceFiles = (stylesheet.files || []).map(f => `${f}`);
            if (sourceFiles.length === 0) {
                done();
                return;
            }

            return gulp.src(sourceFiles, { cwd: config.webdir })
                .pipe(config.development ? $.sourcemaps.init() : $.through2.obj())
                .pipe($.sass({
                    cwd: config.webdir,
                    pipeStdout: true,
                    sassOutputStyle: 'nested',
                    includePaths: config.styles.includePaths ? config.styles.includePaths : [config.npmdir]
                }).on('error', $.sass.logError))
                .pipe($.postcss(config.styles.postCssPlugins(config, stylesheet)))
                .pipe($.concat(stylesheet.name))
                .pipe($.cleanCss({ compatibility: 'ie11' }))
                .pipe(config.development ? $.sourcemaps.write('.') : $.through2.obj())
                .pipe(gulp.dest(`${config.webdir}/${stylesheet.destDir}`))
                .pipe($.browserSync.reload({ stream: true }));
        };

        // rename the func() to the name of the target file from the config, e.g. "main.js";
        // the new name will be logged to the console when the outer gulp task runs
        Object.defineProperty(func, 'name', { value: stylesheet.name, configurable: true });

        return func;
    })

    if (tasks.length === 0) {
        return;
    }

    return gulp.parallel(...tasks)();
}

exports.styles = styles;
