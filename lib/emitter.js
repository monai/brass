var EventEmitter = require('events').EventEmitter;
var emitter;

var LEVELS = [
    'silly',
    'debug',
    'verbose',
    'info',
    'warn',
    'error'
];

emitter = module.exports = new EventEmitter();
emitter.log = log;
emitter.LEVELS = LEVELS;

LEVELS.forEach(function (n) {
    emitter[n] = function (obj, options) {
        log(n, obj, options);
    };
});

function log(level, obj, options) {
    emitter.emit(level, obj, options || {});
}
