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
    
    if (argv.version) {
        console.log('v'+ pkg.version);
    } else if (argv.help) {
        help();
    } else {
        argv = prepareArgv(argv);
        if ( ! argv.valid) {
            console.error('Error: '+ argv.error +'\n');
            help(function () {
                process.exit(1);
            });
        } else {
            emitter = packager(argv.options, function (error, result) {
                if (error) {
                    console.error(util.inspect(error));
                    console.log(result.length);
                }
            });
            
            setupLogger(emitter);
        }
    }
}

function parseArgv(argv) {
    return minimist(argv, {
        boolean: [ 'r', 'd', 'S', 'D', 'U' ],
        string: [ 'w' ],
        alias: {
            'r': 'rpm',
            'd': 'deb',
            'w': 'work-dir',
            'v': 'version',
            'h': 'help'
        },
        default: {
            'work-dir': ''
        }
    });
}

function prepareArgv(argv) {
    var options, error;
    
    options = [];
    
    if (error = validate(argv)) {
        return {
            valid: false,
            error: error
        };
    }
    
    normalize(argv, options);
    
    return {
        valid: true,
        options: options
    };
}

function help(callback) {
    putil.readAsset('cli/packager.txt', function (error, content) {
        if (error) return callback(error);
        console.log(content);
        callback(null);
    });
}

function validate(argv) {
    var daemon;
    
    if ( ! argv.rpm && ! argv.deb) {
        return 'package type is not selected';
    }
    
    if (argv.rpm && argv.deb) {
        return 'only one package type can be selected';
    }
    
    daemon = [ 'S', 'D', 'U' ].reduce(function (prev, curr, i) {
        if (argv[curr]) prev++;
        return prev;
    }, 0);
    
    if (daemon > 1 || (daemon === 1 && argv.daemon && argv.S || argv.D || argv.U)) {
        return 'only one daemon type can be selected';
    }
    
    if (argv.daemon && ! ~[ 'sysv', 'systemd', 'upstart' ].indexOf(argv.daemon)) {
        return 'invalid daemon type';
    }
}

function normalize(argv, options) {
    populate('type', { r: 'rpm', d: 'deb' })
    
    options.daemon = argv.daemon || false;
    if ( ! options.daemon) {
        populate('daemon', { S: 'sysv', D: 'systemd', U: 'upstart' });
    }
    
    options.workDir = argv['work-dir'];
    options.package = argv._.length && argv._[0] || process.cwd();
    
    function populate(name, obj) {
        for (var i in obj) if (obj.hasOwnProperty(i)) {
            if (argv[i]) options[name] = obj[i];
        }
    }
}

function setupLogger(emitter) {
    emitter.LEVELS.forEach(function (n) {
        emitter.on(n, function (obj, options) {
            var out, prefix, type;
            
            prefix = options.em ? '==>' : '   ';
            type = typeof(out);
            
            if (~[ 'string', 'number', 'boolean' ]) {
                obj = obj.toString();
            } else {
                obj = util.inspect(obj);
            }
            
            out = util.format('%s %s', prefix, obj);
            out = options.em ? out.bold : out;
            
            console.log(out);
        });
    });
}
