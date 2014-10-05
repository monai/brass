var fs = require('graceful-fs');
var dz = require('dezalgo');
var ld = require('lodash');
var ncp = require('ncp');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var putil = require('./util');
var async = require('async');
var service = require('./service');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var RPMBUILD_NAME = 'brass_build';

var emitter, options;

module.exports = debbuild;

function debbuild(_emitter, _options, callback) {
    emitter = _emitter;
    options = _options;
    
    options.PACKAGE_DIR = options.package;
    
    async.series([
        checkArchitecture,
        prepareBuildDirs
    ], dz(callback));
}

function checkArchitecture(callback) {
    if (process.arch === 'x64') {
        options.arch = 'x86_64';
        return dz(callback)(null);
    } else if (process.arch === 'ia32') {
        options.arch = 'x86';
        return dz(callback)(null);
    }
    
    return dz(callback)(new Error('Unsupported architecture: '+ process.arch));
}

function prepareBuildDirs(callback) {
    emitter.info('Preapring build directories', { em: true });
    
    dz(callback);
}
