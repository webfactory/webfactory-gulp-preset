const argv = require('minimist')(process.argv.slice(2));

// roll your own function if you need to use more or different plugins
const { postCssPlugins } = require('../config/postcss-plugins-default');

module.exports = {
    styles: {
        sassCompiler: 'sass-embedded',
        postCssPlugins: postCssPlugins
    },

    "development": (argv.env || process.env.APP_ENV || 'development') === 'development',
    "tempdir": "tmp",
    "npmdir": "node_modules"
}
