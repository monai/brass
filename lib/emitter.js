var EventEmitter = require('events').EventEmitter;
var emitter;

emitter = module.exports = new EventEmitter();

var LEVELS = [
    'silly',
    'debug',
    'verbose',
    'info',
    'warn',
    'error'
];

LEVELS.forEach(function (n) {
    emitter[n] = function (obj, options) {
        log(n, obj, options);
    };
});

function log(level, obj, options) {
    emitter.emit(level, obj, options);
}
