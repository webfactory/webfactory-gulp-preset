// test/css.snapshots.test.js
const path = require('path');
const { buildWithConfig } = require('./runWeballpacka');

describe('webpackMerged CSS snapshots', () => {
    it('simple gulp-config', async () => {
        const files = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/simple'),
            styles: {
                files: [
                    {
                        name: 'screen.css',
                        files: ['scss/screen.scss'],
                        destDir: 'css',
                        purgeCSS: false,
                    },
                ],
            },
            scripts: { files: [] }, // skip JS for this test
        });

        expect(files['css/screen.css']).toMatchSnapshot('simple-screen-css');
    });

    it('simple-too gulp-config', async () => {
        const files = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/simple-too'),
            styles: {
                files: [
                    {
                        name: 'screen.css',
                        files: ['scss/screen.scss'],
                        destDir: 'css',
                        purgeCSS: false,
                    },
                ],
            },
            scripts: { files: [] }, // skip JS for this test
        });

        expect(files['css/screen.css']).toMatchSnapshot('simple-too-screen-css');
    });
});
