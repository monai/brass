var path = require('path');
var rpmbuild = require('./rpmbuild');

var CWD = process.cwd();
var PACKAGER_DIR = path.resolve(__dirname, '..');

var RPMBUILD_NAME = 'packager_build';
var TMP_PACKAGE_DIR = 'examples/theapp';

var RPMBUILD_DIR = path.resolve(CWD, RPMBUILD_NAME);
var PACKAGE_DIR = path.resolve(CWD, TMP_PACKAGE_DIR);
var PACKAGE_JSON = path.join(PACKAGE_DIR, 'package.json');

var options = {
    RPMBUILD_DIR: RPMBUILD_DIR,
    PACKAGE_DIR: PACKAGE_DIR
};

module.exports = main;

function main(options) {
    var _options;
    
    _options = prepareOptions();
    rpmbuild(_options);
}

function prepareOptions() {
    var pkg, defaults;
    
    pkg = require(PACKAGE_JSON);
    
    putils.extend(options, {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license,
    });
    
    if (pkg.author) {
        options.vendor = pkg.author;
    }
    
    if (pkg.bin) {
        options.bin = pkg.bin;
    }
    
    defaults = {
        summary: 'Node.js module '+ pkg.name,
        release: 1,
        group: 'Applications/Internet',
        source: pkg.name +'-'+ pkg.version +'.tgz',
        specfile: pkg.name +'.spec',
        prefix: '/usr'
    };
    
    if (pkg.packager) {
        putils.extend(options, pkg.packager);
    }
    
    for (var i in defaults) {
        if (defaults.hasOwnProperty(i) && ! (i in options) || ! options  || ! options[i].length) {
            options[i] = defaults[i];
        }
    }
    
    callback(null);
}

// function (error, result) {
//     if (error) {
//         console.error(util.inspect(error));
//         console.log(result.length);
//     }
// }
