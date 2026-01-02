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

    // it('legacy browsers config', async () => {
    //     const files = await buildWithConfig({
    //         webdir: path.resolve(__dirname, 'fixtures/app-legacy/www'),
    //         styles: {
    //             files: [
    //                 {
    //                     name: 'screen.css',
    //                     files: ['bundles/app/scss/screen.scss'],
    //                     destDir: 'css',
    //                 },
    //             ],
    //         },
    //         scripts: { files: [] },
    //         // optionally: different package.json with stricter browserslist
    //     });
    //
    //     expect(files['screen.css']).toMatchSnapshot('legacy-screen-css');
    // });
});
