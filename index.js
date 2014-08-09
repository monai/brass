var fs = require('fs');
var ejs = require('ejs');
var path = require('path');
var async = require('async');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var CWD = process.cwd();
var PACKAGER_DIR = __dirname;

var BUILDROOT_NAME = 'packager_build';
var TMP_PACKAGE_DIR = 'examples/theapp';

var BUILDROOT_DIR = path.resolve(CWD, BUILDROOT_NAME);
var PACKAGE_DIR = path.resolve(CWD, TMP_PACKAGE_DIR);
var PACKAGE_JSON = path.join(PACKAGE_DIR, 'package.json');

var config = {
    BUILDROOT_DIR: BUILDROOT_DIR,
    PACKAGE_DIR: PACKAGE_DIR
};

async.series([
    prepareConfig,
    prepareBuildRoot,
    prepareSpecFile,
    packModule,
], function (error, result) {
    if (error) {
        console.error(error);
    }
});

function prepareConfig(callback) {
    var pkg, defaults;
    
    pkg = require(PACKAGE_JSON);
    
    extend(config, {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license,
    });
    
    if (pkg.author) {
        config.vendor = pkg.author;
    }
    
    defaults = {
        // summary: 'Node.js module '+ pkg.name,
        release: 1,
        group: 'Applications/Internet',
        source: path.join(PACKAGE_DIR, pkg.name +'-'+ pkg.version +'.tgz')
    };
    
    if (pkg.packager) {
        extend(config, pkg.packager);
    }
    
    for (var i in defaults) {
        if (defaults.hasOwnProperty(i) && ! (i in config) || ! config  || ! config[i].length) {
            config[i] = defaults[i];
        }
    }
    
    callback(null);
}

function prepareBuildRoot(callback) {
    rimraf(BUILDROOT_DIR, function (error) {
        if (error) {
            return callback(error);
        }
        
        async.each([ 'BUILD', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS' ], function (dir, callback) {
            mkdirp(path.join(BUILDROOT_DIR, dir), callback);
        }, function (error) {
            callback(error);
        }, callback);
    });
}

function prepareSpecFile(callback) {
    async.waterfall([
        function (callback) {
            fs.readFile('assets/spec.tpl', 'utf8', callback);
        }, function (content, callback) {
            try {
                callback(null, ejs.render(content, config));
            } catch (error) {
                callback(error);
            }
        }, function (content, callback) {
            fs.writeFile(path.join(BUILDROOT_DIR, 'SPECS', config.name +'.spec'), content, callback);
        }
    ], callback);
}

function packModule(callback) {
    npm.load({}, function (error) {
        console.log(error);
    });
    
    callback(null);
}

function extend(target) {
    for (var i, k = 0, len = arguments.length; ++k < len;) {
        for (i in arguments[k]) {
            if (arguments[k].hasOwnProperty(i)) {
                target[i] = arguments[k][i];
            }
        }
    }
    return target;
}
