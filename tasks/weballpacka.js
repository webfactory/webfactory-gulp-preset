const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const postcssPurgecss = require('@fullhuman/postcss-purgecss');

function utilityCssExtractor(content) {
    return content.match(/[a-zA-Z0-9-_.:@\/]+/g);
}

function createMergedWebpackConfig(gulp, $, config) {
    const argv = require('minimist')(process.argv.slice(2));
    const purgeCssDisabled = argv.purgecss === false;

    const entry = {};
    const entryCssMeta = {};

    // ---- CSS entries ----
    (config.styles.files || []).forEach((file) => {
        // key must be unique and stable
        const entryName = `css_${file.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

        entry[entryName] = path.resolve(config.webdir, file.inputPath);
        entryCssMeta[entryName] = {
            destDir: file.destDir || 'css',
            filename: file.name,
            resolvedInputPath: path.resolve(config.webdir, file.inputPath),
            purgeCssConfig: file.purgeCss ?? config.styles.purgeCss ?? null,
            postCssPresetEnvConfig: file.postCssPresetEnv || config.styles.postCssPresetEnv || {},
        };
    });


    // ---- JS entries ----
    let includeModules = config.scripts.includeModules ? '|' + config.scripts.includeModules.join('|') : '';
    let svelteVersion = config.svelteVersion ? parseFloat(config.svelteVersion) : 3;

    let resolveModulesPaths = [config.npmdir];
    if (config.scripts.resolveModulesPaths) {
        resolveModulesPaths = [...new Set([...(config.scripts.resolveModulesPaths), ...resolveModulesPaths])];
    }

    (config.scripts.files || []).forEach((script) => {
        const entryName = `js_${script.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        entry[entryName] = path.resolve(config.webdir, script.inputPath);
    });

    const webpackConfig = {
        entry,
        output: {
            // js_<name> -> js/<name>.js
            filename: (pathData) => {
                const name = pathData.chunk && pathData.chunk.name ? pathData.chunk.name : '[name]';
                if (name.startsWith('js_')) {
                    const cleanName = name.replace(/^js_/, '');
                    return `js/${cleanName}.js`;
                }
                return '[name].js';
            },
            path: path.resolve(config.webdir),
        },
        resolve: {
            alias: {
                svelte: svelteVersion < 4
                    ? $.path.resolve('node_modules', 'svelte')
                    : $.path.resolve('node_modules', 'svelte/src/runtime')
            },
            extensions: ['.mjs', '.js', '.svelte', '.ts'],
            mainFields: ['svelte', 'browser', 'module', 'main'],
            modules: resolveModulesPaths,
        },
        module: {
            rules: [
                // JS + Svelte + Typescript
                {
                    test: /(\.m?js?$)|(\.svelte$)/,
                    exclude: new RegExp('node_modules\\/(?![svelte' + includeModules + '])'),
                    use: {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: ['@babel/preset-env'],
                            plugins: ['@babel/plugin-transform-runtime'],
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
                        fullySpecified: false,
                    }
                },
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },

                // Assets used from SCSS
                {
                    test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'img/[name].[hash][ext]'
                    }
                },

                // SCSS -> CSS (via MiniCssExtractPlugin)
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: { sourceMap: true }
                        },
                        {
                            loader: 'resolve-url-loader',
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: true,
                                postcssOptions: (loaderContext) => {
                                    let cssEntry = null;

                                    // Resolve the real path of the resource (resolves symlinks)
                                    let realResourcePath = fs.realpathSync(loaderContext.resourcePath);

                                    for (const [entryName, meta] of Object.entries(entryCssMeta)) {
                                        if (meta.resolvedInputPath) {
                                            const realInputPath = fs.realpathSync(meta.resolvedInputPath);
                                            if (realResourcePath === realInputPath) {
                                                cssEntry = meta;
                                                break;
                                            }
                                        }
                                    }

                                    if (!cssEntry) {
                                        throw new Error(
                                            `No CSS entry metadata found for resource: ${resourcePath}\n` +
                                            `Real path: ${realResourcePath}\n` +
                                            `Available entries: ${Object.keys(entryCssMeta).join(', ')}\n` +
                                            `Entry paths: ${Object.values(entryCssMeta).map(m => m.resolvedInputPath).join(', ')}\n` +
                                            `Ensure the SCSS file is an exact webpack entry point from config.styles.files[].inputPath`
                                        );
                                    }

                                    const postCssPresetEnvConfig = cssEntry.postCssPresetEnvConfig || {};

                                    return {
                                        plugins: [
                                            require('postcss-preset-env')(postCssPresetEnvConfig),
                                            ...(cssEntry.purgeCssConfig && !purgeCssDisabled
                                                ? [postcssPurgecss({
                                                    content: cssEntry.purgeCssConfig.content,
                                                    extractors: [{
                                                        extractor: utilityCssExtractor,
                                                        extensions: ['php', 'twig', 'js', 'svg']
                                                    }],
                                                    safelist: cssEntry.purgeCssConfig.safelist,
                                                })]
                                                : []),
                                        ],
                                    };
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
                                    loadPaths: [...new Set([
                                        ...(config.styles.includePaths || []),
                                        config.npmdir,
                                        'www/bundles'
                                    ])],
                                },
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new $.webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
            }),

            // Removes empty `.js` files left over by MiniCssExtractPlugin
            new RemoveEmptyScriptsPlugin(),

            // CSS extraction with per‑entry filenames
            new MiniCssExtractPlugin({
                filename: (pathData) => {
                    const name = pathData.chunk && pathData.chunk.name ? pathData.chunk.name : '[name]';

                    if (name.startsWith('css_')) {
                        const meta = entryCssMeta[name];
                        if (meta) {
                            const dir = meta.destDir ? meta.destDir.replace(/\/+$/, '') : 'css';
                            return `${dir}/${meta.filename}`;
                        }
                    }

                    // fallback
                    return 'css/[name].css';
                },
            }),
        ],
        mode: config.development && $.argv.prod !== true ? 'development' : 'production',
        devtool: $.argv.debug === true ? 'source-map' : false,
        stats: {
            preset: 'normal',
            timings: true,
        },
    };

    return webpackConfig;
}

function webpackMerged(gulp, $, config) {
    const webpackStream = require('webpack-stream');
    const webpack = $.webpack;

    return gulp.src(config.webdir + '/**/*.{js,scss}')
        .pipe(webpackStream(createMergedWebpackConfig(gulp, $, config), webpack))
        .pipe(gulp.dest(config.webdir))
        .pipe($.browserSync.reload({ stream: true }));
}

function webpackWatch(gulp, $, config) {
    const webpack = $.webpack;

    const webpackConfig = createMergedWebpackConfig(gulp, $, config);

    webpack(webpackConfig).watch({
        poll: 1000,  // For Vagrant
        ignored: /node_modules/,
    }, (err, stats) => {
        console.log(stats.toString({ colors: true }));
    });
}

exports.webpackMerged = webpackMerged;
exports.webpackWatch = webpackWatch;
exports.createMergedWebpackConfig = createMergedWebpackConfig;
