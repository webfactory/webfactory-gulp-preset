const path = require('path');
const fs = require('fs');
const os = require('os');
const { rm } = require('node:fs/promises');
const webpack = require('webpack');

const { _config } = require('../tasks/weballpacka');
const baseConfig = require('./gulp-config');
const $ = require('../plugins')(baseConfig);

async function buildWithConfig(partialGulpConfig, fixturePath) {
    const fixtureRoot = fixturePath
        ? path.resolve(__dirname, 'fixtures', fixturePath)
        : path.resolve(__dirname, 'could-not-resolve-fixture-path'); // throws an error

    const prevCwd = process.cwd();

    try {
        process.chdir(fixtureRoot);

        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weballpacka-test-'));

        // merge base gulp-config with scenario‑specific overrides
        const testConfig = {
            ...baseConfig,
            webdir: path.join(fixtureRoot, 'www'), // assumes www/ inside each fixture
            ...partialGulpConfig,
        };

        const webpackConfig = _config({}, $, testConfig);
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

        // Collect CSS/JS files + assets (images from url-rebasing)
        const files = {};
        const assets = [];

        function collectFiles(dir) {
            fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    collectFiles(fullPath);
                } else {
                    const relPath = path.relative(outDir, fullPath);
                    files[relPath] = fs.readFileSync(fullPath, 'utf8');

                    // Track assets
                    if (relPath.startsWith('assets/') || entry.name.match(/\.(png|jpg|gif|svg|webp)$/)) {
                        assets.push({
                            path: relPath,
                            size: fs.statSync(fullPath).size,
                            hashMatch: /\.[a-f0-9]{8,}/.test(entry.name) // Detect [hash]
                        });
                    }
                }
            });
        }

        collectFiles(outDir);
        await rm(outDir, {
            recursive: true,
            force: true,
        });

        return {
            files,
            assets
        };
    } finally {
        // restore original CWD
        process.chdir(prevCwd);
    }
}

module.exports = { buildWithConfig };
