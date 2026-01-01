// tasks/webpack-merged.js
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcssPurgecss = require('@fullhuman/postcss-purgecss');

// Same extractor you already use
function utilityCssExtractor(content) {
    return content.match(/[a-zA-Z0-9-_.:@\/]+/g);
}

function createMergedWebpackConfig(gulp, $, config) {
    const argv = require('minimist')(process.argv.slice(2));

    const entry = {};
    const entryCssMeta = {}; // keep per‑CSS file metadata to map entry -> destDir/name

    // ---- CSS entries ----
    (config.styles.files || []).forEach((file) => {
        // key must be unique and stable
        const entryName = `css_${file.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

        // assume single SCSS entry per style config
        const scssEntry = file.files[0];

        entry[entryName] = path.resolve(config.webdir, scssEntry);
        entryCssMeta[entryName] = {
            destDir: file.destDir || '',
            filename: file.name,
            purgeCssConfig: file.purgeCss ?? config.styles.purgeCss,
            postCssPresetEnvConfig: file.postCssPresetEnv || config.styles.postCssPresetEnv || ''
        };

        console.log('+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++');
        console.log(Object.values(entryCssMeta[entryName]));
        console.log('+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++---+++');
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

    const purgeCssDisabled = argv.purgecss === false;

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
                // CSS chunks do not rely on this (MiniCssExtractPlugin will handle), but keep a fallback
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
            extensions: ['.mjs', '.js', '.svelte'],
            mainFields: ['svelte', 'browser', 'module', 'main'],
            modules: resolveModulesPaths,
        },
        module: {
            rules: [
                // JS + Svelte
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

                // Assets used from SCSS
                {
                    test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'img/[name].[hash][ext]'
                    }
                },

                // SCSS -> CSS (MiniCssExtractPlugin)
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
                                    // Determine which entry this SCSS belongs to
                                    const resourcePath = loaderContext.file;
                                    // crude mapping based on filename; you can refine this
                                    const cssEntry = Object.values(entryCssMeta)[0] || {};

                                    const postCssPresetEnvConfig = cssEntry.postCssPresetEnvConfig || {};

                                    // IMPORTANT: do NOT set `browsers` here; let Browserslist from package.json be used
                                    return {
                                        plugins: [
                                            require('postcss-preset-env')(postCssPresetEnvConfig),
                                            // PurgeCSS only if configured & not disabled
                                            ...(cssEntry.purgeCssConfig && !purgeCssDisabled
                                                ? [postcssPurgecss({
                                                    content: cssEntry.purgeCssConfig.content,
                                                    extractors: [{
                                                        extractor: utilityCssExtractor,
                                                        extensions: ['php', 'twig', 'js', 'svg']
                                                    }],
                                                    safelist: cssEntry.purgeCssConfig.safelist,
                                                })]
                                                : false),
                                        ].filter(Boolean),
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
                                    loadPaths: config.styles.includePaths
                                        ? config.styles.includePaths
                                        : [config.npmdir],
                                },
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            // jQuery globals for JS, as before
            new $.webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
            }),

            // CSS extraction with per‑entry filenames
            new MiniCssExtractPlugin({
                filename: (pathData) => {
                    const name = pathData.chunk && pathData.chunk.name ? pathData.chunk.name : '[name]';
                    if (name.startsWith('css_')) {
                        const meta = entryCssMeta[name];
                        if (!meta) {
                            return 'css/[name].css';
                        }
                        const dir = meta.destDir ? meta.destDir.replace(/\/+$/, '') : 'css';
                        return `${dir}/${meta.filename}`;
                    }
                    // non‑CSS (or unexpected) chunks
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

exports.webpackMerged = webpackMerged;
exports.createMergedWebpackConfig = createMergedWebpackConfig;
