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
var common = require('./commonbuild');

var RPMBUILD_NAME = 'brass_build';

var emitter, options;

module.exports = rpmbuild;

function rpmbuild(_emitter, _options, callback) {
    var queue;
    
    emitter = _emitter;
    options = _options;
    
    options.RPMBUILD_DIR = path.join(options.workDir, RPMBUILD_NAME);
    options.PACKAGE_DIR = options.package;
    
    queue = [
        common.checkArchitecture,
        prepareBuildDirs,
        common.prepareSources,
        common.prepareFiles,
        common.prepareBinaries,
        common.prepareServiceFile,
        prepareFileList,
        prepareSpecFile,
        buildPackage,
        finish
    ];
    
    queue = queue.map(function (f) {
        return function (callback) {
            f.call(null, emitter, options, callback);
        }
    });
    
    async.series(queue, dz(callback));
}

function prepareBuildDirs(emitter, options, callback) {
    var fullpath;
    
    emitter.info('Preapring build directories', { em: true });
    
    async.series([
        function (callback) {
            emitter.verbose('Removing directory: '+ options.RPMBUILD_DIR);
            
            rimraf(options.RPMBUILD_DIR, callback);
        }, function (callback) {
            fullpath = path.join(options.RPMBUILD_DIR, 'tmp');
            options.BUILDROOT_DIR = fullpath;
            
            emitter.verbose('Creating directory: '+ fullpath);
            
            mkdirp(fullpath, callback);
        }, function (callback) {
            async.eachSeries([ 'BUILD', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS' ], function (dir, callback) {
                fullpath = path.join(options.RPMBUILD_DIR, dir);
                options['BUILDROOT_'+ dir] = fullpath;
                
                emitter.verbose('Creating directory: '+ fullpath);
                
                mkdirp(fullpath, callback);
            }, callback);
        }
    ], dz(callback));
}

function prepareFileList(emitter, options, callback) {
    options.targetFileList = putil.renderFileList(options.targetFileList);
    dz(callback)(null);
}

function prepareSpecFile(emitter, options, callback) {
    var file, dest;
    
    file = 'rpmbuild/spec';
    dest = path.join(options.BUILDROOT_SPECS, 'spec');
    
    emitter.info('Preapring spec file', { em: true });
    emitter.verbose('Rendering asset file: '+ file +' to: '+ dest);
    
    putil.renderAssetFile(file, dest, options, callback);
}

function buildPackage(emitter, options, callback) {
    var command;
    
    emitter.info('Building package', { em: true });
    
    command = ([
        'rpmbuild',
        '-ba',
        '--buildroot', options.BUILDROOT_DIR,
        'spec'
    ]).join(' ');
    
    emitter.verbose('Running: `'+ command +'` in: '+ options.BUILDROOT_SPECS);
    
    exec(command, { cwd: options.BUILDROOT_SPECS }, callback);
}

function finish(emitter, options, callback) {
    var filename;
    
    filename = [ options.name, options.version, options.release ].join('-');
    filename = [ filename, options.arch, 'rpm' ].join('.');
    
    emitter.info('Build successful', { em: true });
    emitter.info(path.join(options.BUILDROOT_RPMS, options.arch, filename));
    
    dz(callback)(null);
}
