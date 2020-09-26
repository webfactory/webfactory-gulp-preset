const $ = require('../plugins')(); /// lädt alle gulp-*-Module in $.*

function postCssPlugins(config, stylesheet) {
    return [
        $.autoprefixer(),
        $.postcssurl({
            url: function (asset) {
                if (!asset.url || asset.url.indexOf("base64") !== -1) {
                    return asset.url;
                }
                return $.path.relative(`${config.webdir}/${stylesheet.destDir}/`, asset.absolutePath).split("\\").join("/");
            }
        })
    ];
}

exports.postCssPlugins = postCssPlugins;
