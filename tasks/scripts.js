function scripts(gulp, $, config) {
    const argv = require('minimist')(process.argv.slice(2));
    let terserDisabled = argv.terser === false;

    // take the array and map over each script config object in it
    const tasks = config.scripts.files.map((script) => {
        let func = (done) => {
            const sourceFiles = (script.files || []).map(f => `${f}`);
            if (sourceFiles.length === 0) {
                done();
                return;
            }

            return gulp.src(sourceFiles, { cwd: config.webdir })
                .pipe(config.development ? $.sourcemaps.init() : $.through2.obj())
                .pipe(script.convertToES5 ? $.babel({ presets: ['@babel/preset-env'] }) : $.through2.obj())
                .pipe(!terserDisabled ? $.terser() : $.through2.obj())
                .pipe($.concat(script.name))
                .pipe(config.development ? $.sourcemaps.write('.') : $.through2.obj())
                .pipe(gulp.dest(`${config.webdir}/${script.destDir}`))
                .pipe($.browserSync.reload({ stream: true }))
        };

        // rename the func() to the name of the target file from the config, e.g. "main.js";
        // the new name will be logged to the console when the outer gulp task runs
        Object.defineProperty(func, 'name', { value: script.name, configurable: true });

        return func;
    })

    if (tasks.length === 0) {
        return;
    }

    return gulp.parallel(...tasks)();
}

exports.scripts = scripts;
