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

    it('with asset hashing and URL rebasing', async () => {
        const { files, assets } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/url-rebasing-assets'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/url-rebasing-assets');

        const jsContent = files['js/main.js'];

        const icon = assets.find(a => a.path.includes('icon'));
        expect(icon).toBeDefined();
        expect(icon.hashMatch).toBe(true);

        expect(jsContent).toMatch(/img\/icon\.[a-f0-9]{8,}\.svg/);
    });

    it('with imports from vendor bundles', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/symlinked-bundles'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }],
                resolveModulesPaths: ['www/bundles'],
            }
        }, 'js/symlinked-bundles');

        const jsContent = files['js/main.js'];

        expect(jsContent).toContain('hello from bundle');
    });

    it('excludes node_modules from transpilation by default', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/include-modules'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/include-modules');

        const jsContent = files['js/main.js'];

        expect(jsContent).toContain('=>');
        expect(jsContent).toContain('const');
    });

    it('with includeModules, transpiles the whitelisted node_modules package', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/include-modules'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }],
                includeModules: ['moderndep'],
            }
        }, 'js/include-modules');

        const jsContent = files['js/main.js'];

        expect(jsContent).not.toContain('=>');
        expect(jsContent).not.toContain('const');
    });

    it('with TypeScript', async () => {
        const { files } = await buildWithConfig({
            webdir: path.resolve(__dirname, './fixtures/js/typescript'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.ts'
                }]
            }
        }, 'js/typescript');

        const jsContent = files['js/main.js'];

        // types get stripped
        expect(jsContent).not.toContain('interface');
        expect(jsContent).not.toContain(': number');

        // logic survives compilation
        expect(jsContent).toContain('add(');
        expect(jsContent).toContain('x + p.y');
    });

    it('with Svelte components', async () => {
        const { files } = await buildWithConfig({
            svelteVersion: '4',
            webdir: path.resolve(__dirname, './fixtures/js/svelte'),
            styles: { files: [] }, // Skip CSS
            scripts: {
                files: [{
                    name: 'main',
                    inputPath: 'js/main.js'
                }]
            }
        }, 'js/svelte');

        const jsContent = files['js/main.js'];

        // template markup is compiled away, not passed through verbatim
        expect(jsContent).not.toContain('<h1>Hello {name}!</h1>');

        // static template pieces and compiled component internals are present
        expect(jsContent).toContain('Hello ');
        expect(jsContent).toContain('create_fragment');
        expect(jsContent).toContain('SvelteComponent');
    });
});
