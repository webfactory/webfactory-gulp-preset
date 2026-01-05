// test/css.snapshots.test.js
const path = require('path');
const { buildWithConfig } = require('./runWeballpacka');

describe('Compiling SCSS to CSS', () => {
    it('base', async () => {
        const files = await buildWithConfig({
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

    it('purgecss', async () => {
        const files = await buildWithConfig({
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

    it('postcss-preset-env', async () => {
        const files = await buildWithConfig({
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
