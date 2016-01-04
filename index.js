require('babel-register');
require('babel-polyfill');
require('es6-promise').polyfill();

// Takes a list of JS files as arguments.
// Traverses all relative imports and require statements.
// Detects and reports any cycles between JS files.
// Exit code 1 if any cycles were detected.
require('./src/main');
