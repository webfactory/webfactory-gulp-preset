// test/css.snapshots.test.js
const path = require('path');
const { buildWithConfig } = require('./runWeballpacka');

describe('Compiling SCSS to CSS', () => {
    it('base', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/css/base'),
            styles: {
                files: [
                    {
                        name: 'screen.css',
                        inputPath: 'scss/screen.scss',
                    },
                    {
                        name: 'print.css',
                        inputPath: 'scss/print.scss',
                    },
                ],
            },
            scripts: { files: [] }, // skip JS for this test
        }, 'css/base');

        expect(files['css/screen.css']).toMatchSnapshot('base-screen-css');
        expect(files['css/print.css']).toMatchSnapshot('base-print-css');
    });

    it('with purgecss', async () => {
        const { files} = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/css/purgecss'),
            styles: {
                files: [
                    {
                        name: 'screen.css',
                        inputPath: 'scss/screen.scss',
                        destDir: 'css',
                        purgeCss: {
                            content: [
                                'www/*.html.twig'
                            ],
                            safelist: {
                                standard: [
                                    'h2',
                                ],
                            },
                        },
                    },
                ],
            },
            scripts: { files: [] }, // skip JS for this test
        }, 'css/purgecss');

        expect(files['css/screen.css']).toMatchSnapshot('purgecss-screen-css');
    });

    it('with custom per-file postcss-preset-env config', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/css/postcss-preset-env'),
            styles: {
                files: [
                    {
                        name: 'screen.css',
                        inputPath: 'scss/screen.scss',
                        destDir: 'css',
                        postCssPresetEnv: {
                            // Options for postcss-logical
                            "logical": {
                                "inlineDirection": "top-to-bottom",
                                "blockDirection": "right-to-left"
                            },
                            browsers: [
                                '>=0.25% in DE',
                                'Chrome 56'
                            ],
                        },
                    },
                    {
                        name: 'print.css',
                        inputPath: 'scss/print.scss',
                    },
                ],
            },
            scripts: { files: [] }, // skip JS for this test
        }, 'css/postcss-preset-env');

        expect(files['css/screen.css']).toMatchSnapshot('postcss-preset-env-screen-css');
        expect(files['css/print.css']).toMatchSnapshot('postcss-preset-env-print-css');
    });
});

describe('Asset handling (hashing + URL rebasing)', () => {
    it('hashes images and rebases URLs correctly', async () => {
        const { files, assets } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/css/url-rebasing-assets'),
            styles: {
                files: [{
                    name: 'screen.css',
                    inputPath: 'scss/screen.scss',
                    destDir: 'css'
                }]
            },
            scripts: { files: [] }
        }, 'css/url-rebasing-assets');

        const cssContent = files['css/screen.css'];

        // Check specific number of assets was written
        expect(assets.length).toBe(2);

        // Check that nested relative URLs have been flattened to ../img and hashes added to filenames
        expect(cssContent).toContain('background-image: url(../img/');
        expect(cssContent).not.toMatch(/assets\/img\/icons/);
        expect(cssContent).toMatch(/url\(\.\.\/img\/.*\.[a-f0-9]{8,}\.svg\)/);

        // Check specific file+hash
        const logo = assets.find(a => a.path.includes('racing-wheelie'));
        expect(logo).toBeDefined();
        expect(logo.size).toBeGreaterThan(0);
        expect(cssContent).toMatch(/url\(\.\.\/img\/racing-wheelie\.d012b2ba75f394001fd3\.svg\)/);
    });
});
