const argv = require('minimist')(process.argv.slice(2));
const path = require('path');

function svgmin(gulp, $) {
    let sourcePath = argv.src ?? null;
    let destPath = argv.dest ?? null;

    if (!sourcePath) {
        throw new Error('Please specify source file(s) for SVGO via CLI parameter `--src`.');
    }

    return gulp.src(sourcePath, { base: './'})
        .pipe($.svgmin({
            full: true, // needs to be set so that the plugins list is passed directly to SVGO
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            // viewBox is required to resize SVGs with CSS.
                            // @see https://github.com/svg/svgo/issues/1128
                            removeViewBox: false,

                            // title and desc can be used for a11y alternative text (title with aria-labelledby)
                            removeTitle: false,
                            removeDesc: false,

                            // disable task in preset-default, re-enable with custom params below
                            cleanupIDs: false,
                        },
                    }
                },
                {
                    // randomize ID strings to avoid ID collisions of different inline SVGs used on the same page
                    name: 'cleanupIDs',
                    params: {
                        prefix: {
                            toString() {
                                return `wf${Math.random().toString(36).substr(2, 9)}`;
                            }
                        },
                        remove: false,
                    }
                },
            ],
        }))
        .pipe(gulp.dest(() => destPath ?? '.'))
}

exports.svgmin = svgmin;
