// # Exports data about nodegame modules.

var J = require('JSUS').JSUS;
var path = require('path');

var ngcDir = J.resolveModuleDir('nodegame-client', __dirname);
var JSUSDir = J.resolveModuleDir('JSUS', __dirname);
var NDDBDir = J.resolveModuleDir('NDDB', __dirname);
var shelfDir = J.resolveModuleDir('shelf.js', __dirname);
var ngwindowDir = J.resolveModuleDir('nodegame-window', __dirname);
var ngwidgetsDir = J.resolveModuleDir('nodegame-widgets', __dirname);

var build_client = require(ngcDir + 'bin/build.js').build;
var build_client_support = require(ngcDir + 'bin/build.js').build_support;
var build_JSUS = require(JSUSDir + 'bin/build.js').build;
var build_NDDB = require(NDDBDir + 'bin/build.js').build;
var build_shelf = require(shelfDir + 'bin/build.js').build;
var build_ngwindow = require(ngwindowDir + 'bin/build.js').build;
var build_ngwidgets = require(ngwidgetsDir + 'bin/build.js').build;
var buildCSS = require('./buildCSS');

var rootDir = path.resolve(__dirname, '..');
var buildDir = path.resolve(rootDir, 'public', 'javascripts');
var cssDir = path.resolve(rootDir, 'public', 'stylesheets');
var libDir = path.resolve(rootDir, 'lib');
var confDir = path.resolve(rootDir, 'conf');

var { version } = require(path.resolve(rootDir, 'package.json'));

module.exports = {
    version: version,
    build: {
        client: build_client,
        clientSupport: build_client_support,
        JSUS: build_JSUS,
        NDDB: build_NDDB,
        shelf: build_shelf,
        window: build_ngwindow,
        widgets: build_ngwidgets,
        css: buildCSS
    },
    serverDir: {
        root: rootDir,
        build: buildDir,
        css: cssDir,
        lib: libDir,
        conf: confDir
    },
    modulesDir: {
        client: ngcDir,
        JSUS: JSUSDir,
        NDDB: NDDBDir,
        shelf: shelfDir,
        window: ngwindowDir,
        widgets: ngwidgetsDir
    }
};
