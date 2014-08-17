var fs = require('graceful-fs');
var pkg = require('../package.json');
var util = require('util');
var putil = require('./util');
var colors = require('colors');
var minimist = require('minimist');
var packager = require('./packager');

module.exports = cli;

function cli(argv) {
    var preamble, emitter;
    
    preamble = argv.splice(0, 2);
    argv = parseArgv(argv);
    
    if (argv.verbose) {
        log('Arguments', { em: true, color: 'grey' });
        log(argv);
    }
    
    if (argv.version) {
        console.log('v'+ pkg.version);
    } else if (argv.help) {
        help();
    } else {
        emitter = packager(argv, onFinish);
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
    
    argv.package = argv._.length && argv._[0] || process.cwd();
    
    return argv;
    
    function dashToCamel(str) {
        return str.replace(/\-(.)/g, function (i, chr) {
            return chr.toUpperCase();
        });
    }
}

function help(callback) {
    putil.readAsset('cli/packager.txt', function (error, content) {
        if (error) return callback(error);
        console.log(content);
        if (callback) callback(null);
    });
}

function setupLogger(emitter, argv) {
    var LEVELS = emitter.LEVELS;
    
    Object.keys(LEVELS).forEach(function (n) {
        emitter.on(n, function (obj, options) {
            if (n === LEVELS.error) {
                options.color = 'red';
            } else if (n === LEVELS.debug) {
                if (argv.verbose) {
                    options.color = 'grey';
                } else {
                    return;
                }
            }
            log(obj, options);
        });
    });
}

function log(obj, options) {
    var EM_PREFIX = '==>';
    var NO_PREFIX = '    ';
    
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
        print(NO_PREFIX, obj);
    }
    
    function print(prefix, str, options) {
        options = options || {};
        out = util.format('%s %s', prefix, str);
        out = options.em ? out.bold : out;
        out = options.color ? out[options.color] : out;
        console.log(out);
    }
}