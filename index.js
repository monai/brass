var fs = require('fs');
var ejs = require('ejs');
var path = require('path');
var async = require('async');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var CWD = process.cwd();
var PACKAGER_DIR = __dirname;

var BUILDROOT_NAME = 'packager_build';
var TMP_MODULE_DIR = 'examples/theapp';

var BUILDROOT_DIR = path.resolve(CWD, BUILDROOT_NAME);
var MODULE_DIR = path.resolve(CWD, TMP_MODULE_DIR);
var PACKAGE_JSON = path.join(MODULE_DIR, 'package.json');

var data = {
    BUILDROOT_DIR: BUILDROOT_DIR,
    MODULE_DIR: MODULE_DIR
};

async.series([
    prepareData(data),
    prepareBuildRoot,
    prepareSpecFile
], function (error, result) {
    if (error) {
        console.error(error);
    }
});

function prepareData(data) {
    var pkg, defaults;
    
    pkg = require(PACKAGE_JSON);
    
    return function doPrepareData(callback) {
        extend(data, {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            license: pkg.license,
        });
        
        if (pkg.author) {
            data.vendor = pkg.author;
        }
        
        defaults = {
            // summary: 'Node.js module '+ pkg.name,
            release: 1,
            group: 'Applications/Internet',
            source: path.join(MODULE_DIR, pkg.name +'-'+ pkg.version +'.tgz')
        };
        
        if (pkg.packager) {
            extend(data, pkg.packager);
        }
        
        for (var i in defaults) {
            if (defaults.hasOwnProperty(i) && ! (i in data) || ! data  || ! data[i].length) {
                data[i] = defaults[i];
            }
        }
        
        callback(null);
    }
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
                callback(null, ejs.render(content, data));
            } catch (error) {
                callback(error);
            }
        }, function (content, callback) {
            fs.writeFile(path.join(BUILDROOT_DIR, 'SPECS', data.name +'.spec'), content, callback);
        }
    ], callback);
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
