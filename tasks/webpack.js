function webpack(gulp, $, config) {
    let entrypoints = {};
    let includeModules = config.scripts.includeModules ? '|' + config.scripts.includeModules.join('|') : '';
    let svelteVersion = config.svelteVersion ? parseFloat(config.svelteVersion) : 3;

    // [config.npmdir] is default
    let resolveModulesPaths = [config.npmdir];
    if (config.scripts.resolveModulesPaths) {
        // merge and deduplicate arrays
        resolveModulesPaths = [...new Set([...(config.scripts.resolveModulesPaths), ...resolveModulesPaths])];
    }

    config.scripts.files.map((script) => {
        entrypoints[script.name] = {
            import: `/${config.webdir}/${script.inputPath}`,
            filename: script.destDir ? `${script.destDir}/[name].js` : '[name].js'
        };
    });

    return gulp.src(config.webdir + '/**/js/**/*.js')
        .pipe($.webpackStream({
            entry: entrypoints,
            output: {
                filename: '[name].js',
            },
            resolve: {
                alias: {
                    svelte: svelteVersion < 4 ? $.path.resolve('node_modules', 'svelte') : $.path.resolve('node_modules', 'svelte/src/runtime')
                },
                extensions: ['.mjs', '.js', '.svelte'],
                mainFields: ['svelte', 'browser', 'module', 'main'],
                modules: resolveModulesPaths,
            },
            module: {
                rules: [
                    {
                        test: /(\.m?js?$)|(\.svelte$)/,
                        exclude: new RegExp('node_modules\\/(?![svelte' + includeModules + '])'),
                        use: {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true,
                                presets: ['@babel/preset-env'],
                                plugins: ["@babel/plugin-transform-runtime"],
                            }
                        }
                    },
                    {
                        test: /\.(html|svelte)$/,
                        exclude: /node_modules\/(?!svelte)/,
                        use: [
                            'babel-loader',
                            {
                                loader: 'svelte-loader',
                                options: {
                                    cacheDirectory: true,
                                    emitCss: false,
                                },
                            },
                        ],
                    },
                    {
                        // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
                        test: /node_modules\/svelte\/.*\.mjs$/,
                        resolve: {
                            fullySpecified: false
                        }
                    },
                ]
            },
            plugins: [
                new $.webpack.ProvidePlugin({
                    $: 'jquery',
                    jQuery: 'jquery',
                }),
            ],
            mode: config.development && $.argv.prod !== true ? 'development' : 'production',
            devtool: $.argv.debug === true ? 'source-map' : false,
            stats: {
                preset: 'normal',
                timings: true
            },
        }, $.webpack))
        .pipe(gulp.dest(config.webdir))
        .pipe($.browserSync.reload({ stream: true }));
}

exports.webpack = webpack;
