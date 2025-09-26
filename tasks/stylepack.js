const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const postcssPurgecss = require("@fullhuman/postcss-purgecss")({
    content: [
        './src/**/*.html',
    ],
    extractors: [
        {
            extractor: utilityCssExtractor,
            extensions: ['php', 'twig', 'js', 'svg']
        }
    ],
    safelist: [/^is-/, /^js-/] // adapt to classes you must keep
});

// This custom extractor will also match selectors that contain
// special chars like "_", ".", ":", "\" and "@"
function utilityCssExtractor(content) {
    return content.match(/[a-zA-Z0-9-_.:@\/]+/g)
}

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
                        test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
                        type: 'asset/resource',
                        generator: {
                            filename: 'img/[name].[hash][ext]'
                        }
                    },
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
                                loader: 'resolve-url-loader',
                                options: {
                                    debug: true,
                                }
                            },
                            {
                                loader: "postcss-loader",
                                options: {
                                    sourceMap: true,
                                    postcssOptions: {
                                        plugins: [
                                            ["postcss-preset-env"],
                                            postcssPurgecss,
                                        ],
                                    },
                                },
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
