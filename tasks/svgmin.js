function svgmin(gulp, $, config) {
    return gulp.src(config.svgo.files, { cwd: config.webdir })
        .pipe($.svgmin({
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            removeViewBox: false,
                            removeTitle: false,
                            removeDesc: false,
                            cleanupIDs: false,
                        },
                    }
                },
                {
                    name: 'cleanupIDs',
                    params: {
                        prefix: {
                            toString() {
                                return `${Math.random().toString(36).substr(2, 9)}`;
                            }
                        },
                        remove: false,
                    }
                },
                'removeXMLNS'
            ],
        }))
        .pipe(gulp.dest(`${config.webdir}/${config.svgo.destDir}`));
}

exports.svgmin = svgmin;
