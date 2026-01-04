// test/css.snapshots.test.js
const path = require('path');
const { buildWithConfig } = require('./runWeballpacka');

describe('webpackMerged CSS snapshots', () => {
    it('base', async () => {
        const files = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/base'),
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
        }, 'base');

        expect(files['css/screen.css']).toMatchSnapshot('base-screen-css');
        expect(files['css/print.css']).toMatchSnapshot('base-print-css');
    });

    it('purgecss', async () => {
        const files = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/purgecss'),
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
        }, 'purgecss');

        expect(files['css/screen.css']).toMatchSnapshot('purgecss-screen-css');
    });

    it('postcss-preset-env', async () => {
        const files = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/postcss-preset-env'),
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
        }, 'postcss-preset-env');

        expect(files['css/screen.css']).toMatchSnapshot('postcss-preset-env-screen-css');
        expect(files['css/print.css']).toMatchSnapshot('postcss-preset-env-print-css');
    });
});
