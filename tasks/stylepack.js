const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const postcssPurgecss = require("@fullhuman/postcss-purgecss");
const argv = require('minimist')(process.argv.slice(2));
const webpackStream = require('webpack-stream');
const mergeStream = require('merge-stream');
const path = require('path');

// This custom extractor will also match selectors that contain
// special chars like "_", ".", ":", "\" and "@"
function utilityCssExtractor(content) {
    return content.match(/[a-zA-Z0-9-_.:@\/]+/g)
}

function stylepack(gulp, $, config) {

    const streams = config.styles.files.map((file) => {
        let purgeCssConfig = config.styles.purgeCss;

        // Check for CLI flags/args
        let purgeCssDisabled = argv.purgecss === false;

        // Determine if PurgeCSS should run
        let purgeCss = purgeCssConfig && !purgeCssDisabled;

        const webpackConfig = {
            entry: `/${config.webdir}/${file.files}`,
            output: {
                // path: path.resolve(__dirname, 'webpack-tmp', file.destDir || ''),
                filename: `webpack-tmp/${file.name}`,
            },
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
                            },
                            {
                                loader: 'css-loader',
                                options: {
                                    sourceMap: true,
                                }
                            },
                            {
                                loader: 'resolve-url-loader',
                            },
                            {
                                loader: "postcss-loader",
                                options: {
                                    sourceMap: true,
                                    postcssOptions: {
                                        plugins: [
                                            ["postcss-preset-env"],
                                            purgeCss ? postcssPurgecss({
                                                content: purgeCssConfig.content,
                                                extractors: [
                                                    {
                                                        extractor: utilityCssExtractor,
                                                        extensions: ['php', 'twig', 'js', 'svg']
                                                    }
                                                ],
                                                safelist: purgeCssConfig.safelist,
                                            }) : false,
                                        ].filter(Boolean),
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
                    filename: `${file.destDir}/${file.name}`,
                }),
            ],
            mode: config.development && $.argv.prod !== true ? 'development' : 'production',
            devtool: $.argv.debug === true ? 'source-map' : false,
            stats: {
                preset: 'normal',
                timings: true
            },
        };

        return webpackStream(webpackConfig)
            .pipe(gulp.dest(path.join(config.webdir)));
    });

    return mergeStream(...streams)
        .pipe($.browserSync.reload({ stream: true }));
}

exports.stylepack = stylepack;
