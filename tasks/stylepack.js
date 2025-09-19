const MiniCssExtractPlugin = require("mini-css-extract-plugin");

function stylepack(gulp, $, config) {
    let entrypoints = {};

    config.styles.files.map((file) => {
        entrypoints[file.name] = {
            import: `/${config.webdir}/${file.files}`,
            filename: file.destDir ? `webpack-tmp/${file.destDir}/[name]` : 'webpack-tmp/[name]'
        };
    });

    return gulp.src(config.webdir + '/**/scss/**/*.scss')
        .pipe($.webpackStream({
            entry: entrypoints,
            // output: {
            //     filename: `[name]`,
            // },
            resolve: {
                mainFields: ['browser', 'module', 'main'],
            },
            module: {
                rules: [
                    {
                        test: /\.s[ac]ss$/i,
                        use: [
                            {
                                loader: MiniCssExtractPlugin.loader,
                                options: {},
                            },
                            {
                                loader: 'css-loader',
                                options: {
                                    sourceMap: true,
                                }
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    implementation: 'sass-embedded',
                                    api: 'modern',
                                    sourceMap: true,
                                    sassOptions: {
                                        // importers: new NodePackageImporter(),
                                        loadPaths: config.styles.includePaths ? config.styles.includePaths : [config.npmdir]
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            plugins: [
                new MiniCssExtractPlugin({
                    filename: "css/[name]",
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

exports.stylepack = stylepack;
