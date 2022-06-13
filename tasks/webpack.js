function webpack(gulp, $, config) {
    let entrypoints = {};
    let includeModules = config.scripts.includeModules ? '|' + config.scripts.includeModules.join('|') : '';

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
                    svelte: $.path.resolve('node_modules', 'svelte')
                },
                extensions: ['.mjs', '.js', '.svelte'],
                mainFields: ['svelte', 'browser', 'module', 'main'],
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
