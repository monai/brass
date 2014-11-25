var os = require('os');
var ld = require('lodash');
var fs = require('graceful-fs');
var pkg = require('../package.json');
var path = require('path');
var util = require('util');
var putil = require('./util');
var chalk = require('chalk');
var minimist = require('minimist');
var brass = require('./brass');

module.exports = cli;

function cli(argv) {
    var preamble, emitter, options;
    
    preamble = argv.splice(0, 2);
    argv = parseArgv(argv);
    
    if (argv.verbose) {
        log('Arguments', { em: true, color: 'grey' });
        log(argv, { color: 'grey' });
    }
    
    if (argv.version) {
        console.log('v'+ pkg.version);
    } else if (argv.help) {
        help();
    } else {
        options = ld.pick(argv, [ 'workDir', 'package', 'o' ]);
        if (ld.isPlainObject(options.o)) {
            ld.merge(options, options.o);
            delete options.o;
        }
        emitter = brass.build(options, onFinish);
        setupLogger(emitter, argv);
    }
    
    function onFinish(error, result) {
        if (error) {
            if (error instanceof Error) {
                log(error);
            } else {
                log(error[0]);
            }
        }
    }
}

function parseArgv(argv) {
    var pkg, cwd;
    
    argv = minimist(argv, {
        boolean: [ 'V', 'v', 'h' ],
        string: [ 'w' ],
        alias: {
            'w': 'work-dir',
            'V': 'verbose',
            'v': 'version',
            'h': 'help'
        },
        default: {
            'work-dir': ''
        }
    });
    
    Object.keys(argv).forEach(function (key) {
        argv[dashToCamel(key)] = argv[key];
    });
    
    pkg = argv._.length && argv._[0];
    if (pkg) {
        argv.package = pkg;
    }
    
    cwd = process.cwd();
    argv.workDir = path.resolve(cwd, argv.workDir || os.tmpdir());
    argv.package = path.resolve(cwd, argv.package || process.cwd());
    
    return argv;
    
    function dashToCamel(str) {
        return str.replace(/\-(.)/g, function (i, chr) {
            return chr.toUpperCase();
        });
    }
}

function help(callback) {
    putil.readAsset('cli/brass.txt', function (error, content) {
        if (error) return dz(callback)(error);
        console.log(content);
        if (callback) dz(callback)(null);
    });
}

function setupLogger(emitter, argv) {
    var LEVELS = emitter.LEVELS;
    
    Object.keys(LEVELS).forEach(function (n) {
        emitter.on(n, function (obj, options) {
            if (n === LEVELS.error) {
                options.color = 'red';
            } else if (n === LEVELS.verbose) {
                if ( ! argv.verbose) return;
                options.color = 'grey';
            }
            log(obj, options);
        });
    });
}

function log(obj, options) {
    var EM_PREFIX = '==>';
    var NO_PREFIX = '   ';
    
    var prefix, type;
    
    options = options || {};
    prefix = options.em ? EM_PREFIX : NO_PREFIX;
    type = typeof(obj);
    
    if (~[ 'string', 'number', 'boolean' ].indexOf(type)) {
        obj = obj.toString();
        print(prefix, obj, options);
    } else if (obj instanceof Error) {
        print(EM_PREFIX, obj.message, { em: true, color: 'red' });
        print(NO_PREFIX, obj.stack, { color: 'red' });
    } else {
        obj = util.inspect(obj);
        print(NO_PREFIX, obj, options);
    }
    
    function print(prefix, str, options) {
        options = options || {};
        out = str.replace(/^/mg, prefix +' ');
        out = options.em ? chalk.bold(out) : out;
        out = options.color ? chalk[options.color](out) : out;
        console.log(out);
    }
}
