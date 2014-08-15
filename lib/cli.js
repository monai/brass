var fs = require('fs');
var minimist = require('minimist');
var putil = require('./util');
var packager = require('./packager');

module.exports = cli;

function cli(argv) {
    var options;
    
    argv = parseArgv(argv);
    
    if ( ! argv.valid) {
        help(function (error, content) {
            console.log(content);
            process.exit(1);
        });
    } else {
        packager(argv.options);
    }
}

function parseArgv(argv) {
    var options, preamble;
    
    options = [];
    preamble = argv.splice(0, 2);
    argv = minimist(argv, {
        boolean: [ 'r', 'd', 'S', 'D', 'U' ],
        string: [ 'w' ],
        alias: {
            'r': 'rpm',
            'd': 'deb',
            'w': 'work-dir'
        },
        default: {
            'work-dir': ''
        }
    });
    
    populate('type', { r: 'rpm', d: 'deb' })
    options.daemon = argv.daemon;
    if ( ! options.daemon) {
        populate('daemon', { S: 'sysv', D: 'systemd', U: 'upstart' });
    }
    
    options.workDir = argv['work-dir'];
    options.package = argv._.length && argv._[0] || process.cwd();
    
    return {
        valid: !! options.type,
        preamble: preamble,
        options: options
    };
    
    function populate(name, obj) {
        for (var i in obj) if (obj.hasOwnProperty(i)) {
            if (argv[i]) options[name] = obj[i];
        }
    }
}

function help(callback) {
    putil.readAsset('cli/packager.txt', callback);
}
