var minimist = require('minimist');
var packager = require('./packager');

module.exports = cli;

function cli(argv) {
    var preamble;
    
    preamble = argv.splice(0, 2);
    argv = minimist(argv);
    
    console.log(preamble);
    console.log(argv);
    
    // packager(argv);
}


