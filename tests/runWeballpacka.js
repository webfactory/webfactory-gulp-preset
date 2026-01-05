const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const webpack = require('webpack');
const rimraf = promisify(require('rimraf'));

const { createMergedWebpackConfig } = require('../tasks/weballpacka');
const baseConfig = require('./gulp-config');
const $ = require('../plugins')(baseConfig);

async function buildWithConfig(partialGulpConfig, fixturePath) {
    const fixtureRoot = fixturePath
        ? path.resolve(__dirname, 'fixtures', fixturePath)
        : path.resolve(__dirname, 'could-not-resolve-fixture-path'); // throws an error

    const prevCwd = process.cwd();

    try {
        process.chdir(fixtureRoot);

        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webpack-merged-test-'));

        // merge base gulp-config with scenario‑specific overrides
        const testConfig = {
            ...baseConfig,
            webdir: path.join(fixtureRoot, 'www'), // assumes www/ inside each fixture
            ...partialGulpConfig,
        };

        const webpackConfig = createMergedWebpackConfig({}, $, testConfig);
        webpackConfig.output = { ...webpackConfig.output, path: outDir };

        const compiler = webpack(webpackConfig);

        await new Promise((resolve, reject) => {
            compiler.run((err, stats) => {
                if (err) return reject(err);

                const jsonStats = stats.toJson({
                    all: true, modules: true, reasons: true, errors: true, warnings: true
                });

                if (stats.hasErrors()) {
                    console.log('ERROR details:', jsonStats.errors);
                    return reject(new Error(stats.toString({ all: false, errors: true })));
                }

                compiler.close(() => resolve());
            });
        });

        // recursive CSS collection
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
    } finally {
        // restore original CWD
        process.chdir(prevCwd);
    }
}

module.exports = { buildWithConfig };
