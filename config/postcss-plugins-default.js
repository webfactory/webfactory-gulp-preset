const $ = require('../plugins')(); /// load all gulp-*-Modules in $.*
const argv = require('minimist')(process.argv.slice(2));

// This custom extractor will also match selectors that contain
// special chars like "_", ".", ":", "\" and "@"
function utilityCssExtractor(content) {
    return content.match(/[a-zA-Z0-9-_.:@\/]+/g)
}

function postCssPlugins(config, stylesheet) {
    // Grab a PurgeCSS config to use;
    // always prefers a stylesheet-specific one over a global config for all CSS files
    let purgeCssConfig = stylesheet.purgeCss || config.styles.purgeCss;

    // Check for CLI flags/args
    let purgeCssDisabled = argv.purgecss === false;

    // Determine if PurgeCSS should run
    let purgeCss = purgeCssConfig && !purgeCssDisabled;

    return [
        // conditionally run PurgeCSS if any config (local or global) was found
        purgeCss ? $.purgecss({
            content: purgeCssConfig.content,
            extractors: [
                {
                    extractor: utilityCssExtractor,
                    extensions: ['twig', 'js']
                }
            ],
            safelist: purgeCssConfig.safelist
        }) : false,
        $.postcssurl({
            url: function (asset) {
                if (!asset.url || asset.url.indexOf("base64") !== -1) {
                    return asset.url;
                }
                return $.path.relative(`${config.webdir}/${stylesheet.destDir}/`, asset.absolutePath).split("\\").join("/");
            }
        }),
        $.autoprefixer(),
        $.lightningcss({ sourceMap: false }),
    ].filter(Boolean); // Strip falsy values (this enables conditional plugins like PurgeCSS)
}

exports.postCssPlugins = postCssPlugins;
