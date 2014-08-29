var os = require('os');
var path = require('path');
var putil = require('./util');
var emitter = require('./emitter');
var rpmbuild = require('./rpmbuild');

module.exports = main;

function main(argv, callback) {
    var cwd, options;
    
    cwd = process.cwd();
    options = {};
    options.workDir = path.resolve(cwd, argv.workDir || os.tmpdir());
    options.package = path.resolve(cwd, argv.package);
    
    prepareOptions(options, argv.p);
    setImmediate(function () {
        emitter.verbose('Options', { em: true });
        emitter.verbose(options);
        emitter.info('Package type: '+ options.type, { em: true });
        
        if (options.type === 'rpm') {
            rpmbuild(emitter, options, callback);
        } else {
            callback(new Error('Package type is not specified or unsupported'));
        }
    });
    
    return emitter;
}

function prepareOptions(options, argv) {
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
        prefix: '/usr',
        daemon: {}
    };
    
    if (pkg.packager) {
        putil.extend(options, pkg.packager);
    }
    
    if (argv) {
        putil.extend(options, argv);
    }
    
    for (var i in defaults) {
        if (defaults.hasOwnProperty(i) && ! (i in options)) {
            options[i] = defaults[i];
        }
    }
}
