// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('../config/env');
const chalk = require('react-dev-utils/chalk');
const fs = require('fs-extra');
const webpack = require('webpack');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const paths = require('../config/paths');
const configFactory = require('../config/webpack.config');
const printBuildError = require('react-dev-utils/printBuildError');

const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (
  !checkRequiredFiles([
    ...paths.appHtml,
    ...Object.values(paths.appEntries)
  ])
) {
  process.exit(1);
}

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const { checkBrowsers } = require('react-dev-utils/browsersHelper');

checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    // Generate configuration
    const config = configFactory('development');

    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild);

    // Merge with the public folder
    fs.copySync(paths.appPublic, paths.appBuild, {
      dereference: true,
      filter: file => !paths.appHtml.includes(file),
    });

    let i = 0;

    // Start the webpack build
    webpack(config).watch({ ignored: ['node_modules/', './dist/'] }, err => {
      if (err) {
        printBuildError(err);
      } else {
        i++;
        console.log(chalk.cyan(`Compiled successfully: ${i}`));
      }
    });

    ['SIGINT', 'SIGTERM'].forEach(function(sig) {
      process.on(sig, function() {
        process.exit();
      });
    });

    if (process.env.CI !== 'true') {
      // Gracefully exit when stdin ends
      process.stdin.on('end', function() {
        process.exit();
      });
    }
  })
  .catch(err => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
