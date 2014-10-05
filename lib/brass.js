var os = require('os');
var path = require('path');
var putil = require('./util');
var emitter = require('./emitter');
var rpmbuild = require('./rpmbuild');
var debbuild = require('./debbuild');

module.exports = {
    build: build
};

function build(argv, callback) {
    var cwd, options;
    
    if (typeof argv === 'function') {
        callback = argv;
        argv = {};
    } else if ( ! arguments.length) {
        argv = {};
        callback = function (){};
    }
    
    cwd = process.cwd();
    options = {};
    options.workDir = path.resolve(cwd, argv.workDir || os.tmpdir());
    options.package = path.resolve(cwd, argv.package || process.cwd());
    options = prepareOptions(options, argv.o);
    
    setImmediate(function () {
        emitter.verbose('Options', { em: true });
        emitter.verbose(options);
        emitter.info('Package type: '+ options.type, { em: true });
        
        if (options.type === 'rpm') {
            rpmbuild(emitter, options, callback);
        } else if (options.type === 'deb') {
            debbuild(emitter, options, callback);
        } else {
            callback(new Error('Package type is not specified or unsupported'));
        }
    });
    
    return emitter;
}

function prepareOptions(options, argv) {
    var out, pkg, defaults;
    
    pkg = require(path.join(options.package, 'package.json'));
    out = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license
    };
    
    putil.extend(out, options);
    
    if (pkg.author) {
        out.vendor = pkg.author;
    }
    
    if (pkg.bin) {
        out.bin = pkg.bin;
    }
    
    if (pkg.brass) {
        putil.extend(out, pkg.brass);
    }
    
    if (argv) {
        putil.extend(out, argv);
    }
    
    defaults = {
        summary: 'Node.js module '+ pkg.name,
        release: 1,
        group: 'Applications/Internet',
        source: pkg.name +'-'+ pkg.version +'.tgz',
        prefix: '/usr',
        service: {}
    };
    
    for (var i in defaults) {
        if (defaults.hasOwnProperty(i) && ! (i in out)) {
            out[i] = defaults[i];
        }
    }
    
    return out;
}
