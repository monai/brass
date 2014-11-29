'use strict';

var EventEmitter = require('events').EventEmitter;
var emitter;

var LEVELS = {
    silly: 'silly',
    debug: 'debug',
    verbose: 'verbose',
    info: 'info',
    warn: 'warn',
    error: 'error'
};

emitter = module.exports = new EventEmitter();
emitter.log = log;
emitter.LEVELS = LEVELS;

Object.keys(LEVELS).forEach(function (n) {
    emitter[n] = function (obj, options) {
        log(n, obj, options);
    };
});

function log(level, obj, options) {
    emitter.emit(level, obj, options || {});
}
