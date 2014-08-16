var fs = require('fs');
var minimist = require('minimist');
var putil = require('./util');
var packager = require('./packager');

module.exports = cli;

function cli(argv) {
    argv = parseArgv(argv);
    
    if ( ! argv.valid) {
        help(function (error, content) {
            console.error('Error: '+ argv.error +'\n');
            console.log(content);
            process.exit(1);
        });
    } else {
        console.log(argv.options);
        packager(argv.options);
    }
}

function parseArgv(argv) {
    var options, preamble, error;
    
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
    
    if (error = validate(argv)) {
        return {
            valid: false,
            error: error
        };
    }
    
    normalize(argv, options);
    
    return {
        valid: true,
        preamble: preamble,
        options: options
    };
}

function help(callback) {
    putil.readAsset('cli/packager.txt', callback);
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
    
    if (daemon > 1 || (daemon === 1 && argv.S || argv.D || argv.U)) {
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
