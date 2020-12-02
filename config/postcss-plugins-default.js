const $ = require('../plugins')(); /// load all gulp-*-Modules in $.*

// This custom extractor will also match selectors that contain
// special chars like "_", ":", "\" and "@"
class UtilityCssExtractor {
    static extract(content) {
        return content.match(/[a-zA-Z0-9-_:@\/]+/g)
    }
}

function postCssPlugins(config, stylesheet) {
    // Grab a PurgeCSS config to use;
    // always prefers a stylesheet-specific one over a global config for all CSS files
    let purgeCssConfig = stylesheet.purgeCss || config.styles.purgeCss;

    return [
        $.autoprefixer(),
        $.postcssurl({
            url: function (asset) {
                if (!asset.url || asset.url.indexOf("base64") !== -1) {
                    return asset.url;
                }
                return $.path.relative(`${config.webdir}/${stylesheet.destDir}/`, asset.absolutePath).split("\\").join("/");
            }
        }),
        // conditionally run PurgeCSS if any config (local or global) was found
        purgeCssConfig ? $.purgecss({
            content: purgeCssConfig.content,
            extractors: [
                {
                    extractor: UtilityCssExtractor,
                    extensions: ['twig', 'js']
                }
            ],
            safelist: purgeCssConfig.safelist
        }) : false
    ].filter(Boolean); // Strip falsy values (this enables conditional plugins like PurgeCSS)
}

exports.postCssPlugins = postCssPlugins;
