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
                        files: ['scss/screen.scss'],
                        destDir: 'css',
                        purgeCss: false,
                    },
                ],
            },
            scripts: { files: [] }, // skip JS for this test
        }, 'base');

        expect(files['css/screen.css']).toMatchSnapshot('base-screen-css');
    });

    it('purgecss', async () => {
        const files = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/purgecss'),
            styles: {
                files: [
                    {
                        name: 'screen.css',
                        files: ['scss/screen.scss'],
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
});
