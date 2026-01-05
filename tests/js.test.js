const path = require('path');
const { buildWithConfig } = require('./runWeballpacka');

describe('Bundling JS', () => {
    it('basic', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/basic'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/basic');

        const jsContent = files['js/main.js'];

        // basic passthrough
        expect(jsContent).toContain('let fn = (a, b) => a + b');

        // no unnecessary jQuery global injection
        expect(jsContent).not.toContain('$ =');
        expect(jsContent).not.toContain('jQuery');
    });

    it('with global jQuery injection', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/jquery'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/jquery');

        const jsContent = files['js/main.js'];

        expect(jsContent).toContain('$ =');
        expect(jsContent).toContain('jQuery');
    });

    it('with legacy Babel transpilation', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/legacy-transpilation-babel'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/legacy-transpilation-babel');

        const jsContent = files['js/main.js'];

        // Note: this fixture uses a specific browserslist in package.json
        expect(jsContent).not.toContain('let');
        expect(jsContent).not.toContain('const');
        expect(jsContent).toContain('var');
        expect(jsContent).not.toContain('=>');
        expect(jsContent).toContain('function');
        expect(jsContent).not.toContain('??');
    });

    it('with minification (mode: production)', async () => {
        const { files } = await buildWithConfig({
            development: false,
            webdir: path.resolve(__dirname, './fixtures/js/production'),
            styles: { files: [] },
            scripts: {
                files: [{
                    name: 'bundle',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/production');

        const jsContent = files['js/bundle.js'];

        expect(jsContent).toContain('window.testFlag=!0');
        expect(jsContent).not.toContain('mySimpleAdditionFunction');
    });
});
