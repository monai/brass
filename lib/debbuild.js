var fs = require('graceful-fs');
var dz = require('dezalgo');
var ld = require('lodash');
var mv = require('mv');
var ncp = require('ncp');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var putil = require('./util');
var async = require('async');
var service = require('./service');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var DEBBUILD_NAME = 'brass_build';

var emitter, options;

module.exports = debbuild;

function debbuild(_emitter, _options, callback) {
    emitter = _emitter;
    options = _options;
    
    options.DEBBUILD_DIR = path.join(options.workDir, DEBBUILD_NAME);
    options.PACKAGE_DIR = options.package;
    
    async.series([
        checkArchitecture,
        prepareBuildDirs,
        prepareSources
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
    var fullpath;
    
    emitter.info('Preapring build directories', { em: true });
    
    async.series([
        function (callback) {
            emitter.verbose('Removing directory: '+ options.DEBBUILD_DIR);
            
            rimraf(options.DEBBUILD_DIR, callback);
        }, function (callback) {
            fullpath = path.join(options.DEBBUILD_DIR, 'tmp');
            options.BUILDROOT_DIR = fullpath;
            
            emitter.verbose('Creating directory: '+ fullpath);
            
            mkdirp(fullpath, callback);
        }
    ], dz(callback));
}

function prepareSources(callback) {
    emitter.info('Preapring sources', { em: true });
    
    options.sourcesDir = path.join(options.DEBBUILD_DIR, 'package');
    
    async.series([
        function (callback) {
            var command = 'npm pack '+ options.PACKAGE_DIR;
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.DEBBUILD_DIR);
            
            exec(command, { cwd: options.DEBBUILD_DIR }, callback);
        }, function (callback) {
            var command = 'tar xvzf '+ path.join(options.DEBBUILD_DIR, options.source);
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.DEBBUILD_DIR);
            
            exec(command, { cwd: options.DEBBUILD_DIR }, callback);
        }, function (callback) {
            var oldSrc, newSrc;
            
            oldSrc = options.sourcesDir;
            newSrc = path.join(options.DEBBUILD_DIR, [ options.name, options.version ].join('-'));
            
            emitter.verbose('Moving directory: '+ oldSrc +' to: '+ newSrc);
            
            options.sourcesDir = newSrc;
            mv(oldSrc, newSrc, dz(callback));
        }, function (callback) {
            var command = 'npm install';
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.sourcesDir);
            
            exec(command, { cwd: options.sourcesDir }, callback);
        }
    ], dz(callback));
}
