// test/runWebpackMerged.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const webpack = require('webpack'); // same version as your gulp preset
const rimraf = promisify(require('rimraf'));

// import your merged helper (not the gulp task wrapper)
const { createMergedWebpackConfig } = require('../tasks/weballpacka');
// your normal plugins helper
const baseConfig = require('./gulp-config');
const $ = require('../plugins')(baseConfig);

async function buildWithConfig(partialGulpConfig) {
    // create isolated output dir
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webpack-merged-test-'));

    // merge base gulp-config with scenario‑specific overrides
    const testConfig = {
        ...baseConfig,
        ...partialGulpConfig,
    };

    const webpackConfig = createMergedWebpackConfig(
        // gulp param is not actually used in createMergedWebpackConfig,
        // but if you need it, you can pass a tiny stub instead
        { /* gulp stub not needed here */ },
        $,
        testConfig
    );

    const finalConfig = {
        ...webpackConfig,
        output: {
            ...webpackConfig.output,
            path: outDir,
        },
    };

    const compiler = webpack(finalConfig); // Node API[web:41]

    await new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            compiler.run((err, stats) => {
                if (err) return reject(err);

                const jsonStats = stats.toJson({
                    all: true,
                    modules: true,
                    reasons: true,
                    errors: true,
                    warnings: true
                });

                if (stats.hasErrors()) {
                    console.log('ERROR details:', jsonStats.errors);
                    return reject(new Error(stats.toString({ all: false, errors: true })));
                }

                compiler.close(() => resolve());
            });

        });
    });

    // collect all emitted CSS files
    // Replace the entire files collection block with:
    const files = {};
    function collectCss(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                collectCss(fullPath);
            } else if (entry.name.endsWith('.css')) {
                const relPath = path.relative(outDir, fullPath);
                files[relPath] = fs.readFileSync(fullPath, 'utf8');
            }
        });
    }
    collectCss(outDir);

    await rimraf(outDir);
    return files;
}

module.exports = { buildWithConfig };
