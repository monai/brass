var os = require('os');
var path = require('path');
var putil = require('./util');
var rpmbuild = require('./rpmbuild');
var EventEmitter = require('events').EventEmitter;

module.exports = main;

function main(options, callback) {
    var cwd, emitter;
    
    cwd = process.cwd();
    options.workDir = path.resolve(cwd, options.workDir || os.tmpdir());
    options.package = path.resolve(cwd, options.package);
    
    emitter = new EventEmitter();
    
    prepareOptions(emitter, options);
    setImmediate(function () {
        rpmbuild(emitter, options, callback);
    });
    
    return emitter;
}

function prepareOptions(emitter, options) {
    var pkg, defaults;
    
    pkg = require(path.join(options.package, 'package.json'));
    
    putil.extend(options, {
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
        putil.extend(options, pkg.packager);
    }
    
    for (var i in defaults) {
        if (defaults.hasOwnProperty(i) && ! (i in options) || ! options  || ! options[i].length) {
            options[i] = defaults[i];
        }
    }
}
