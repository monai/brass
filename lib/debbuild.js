'use strict';

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
var common = require('./commonbuild');

var DEBBUILD_NAME = 'brass_build';

var queue = [
    common.checkArchitecture,
    prepareBuildDirs,
    common.prepareSources,
    common.prepareFiles,
    common.prepareBinaries,
    prepareOrigArchive,
    prepareFileList,
    prepareDebianDirectory,
    common.prepareServiceFile,
    buildPackage,
    finish
];

module.exports = {
    queue: queue,
    build: build
};

function build(emitter, options, callback) {
    async.series(putil.createQueue(queue, emitter, options), dz(callback));
}

function prepareBuildDirs(emitter, options, callback) {
    var fullpath;
    
    emitter.info('Preapring build directories', { em: true });
    
    async.series([
        function (callback) {
            emitter.verbose('Removing directory: '+ options.BUILD_DIR);
            
            rimraf(options.BUILD_DIR, callback);
        }, function (callback) {
            fullpath = path.join(options.BUILD_DIR, options.name +'-'+ options.version);
            options.BUILDROOT_DIR = fullpath;
            
            emitter.verbose('Creating directory: '+ fullpath);
            
            mkdirp(fullpath, callback);
        }, function (callback) {
            options.debian = path.join(options.BUILDROOT_DIR, 'debian');
            
            emitter.verbose('Creating directory: '+ options.debian);
            
            mkdirp(options.debian, callback);
        }
    ], callback);
}

function prepareOrigArchive(emitter, options, callback) {
    var src, dest, command;
    
    src = path.join(path.basename(options.BUILDROOT_DIR));
    dest = path.join(options.BUILD_DIR, options.name +'_'+ options.version +'.orig.tar.gz');
    command = [ 'tar cvzf', dest, src ].join(' ');
    
    emitter.info('Creating orig archive', { em: true });
    emitter.verbose('Running: `'+ command +'` in: '+ options.BUILD_DIR);
    
    exec(command, { cwd: options.BUILD_DIR }, callback);
}

function prepareFileList(emitter, options, callback) {
    var conf, etc, files;
    
    conf = ld.where(options.targetFileList, { type: 'config' });
    conf = ld.pluck(conf, 'filename');
    etc = ld.filter(conf, function (s) { return s.match(/^\/etc/); });
    conf = ld.difference(conf, etc);
    
    files = ld.where(options.targetFileList, { type: 'default' });
    files = ld.pluck(files, 'filename');
    files = ld.union(files, ld.filter(options.targetFileList, ld.isString), etc);
    
    options.targetConfFileList = conf.join('\n');
    options.targetFileList = files.join('\n');
    
    callback(null);
}

function prepareDebianDirectory(emitter, options, callback) {
    var files, dest;
    
    emitter.info('Preapring debian directory', { em: true });
    
    files = [
        'control',
        'copyright',
        'changelog',
        'rules',
        'compat',
        'conffiles',
        'install',
        'source/format'
    ];
    
    async.series([
        function (callback) {
            mkdirp(path.join(options.debian, 'source'), callback);
        }, function (callback) {
            async.eachSeries(files, function (file, callback) {
                dest = path.join(options.debian, file);
                file = path.join('debbuild', file);
                
                emitter.verbose('Rendering asset file: '+ file +' to: '+ dest);
                
                putil.renderAssetFile(file, dest, options, callback);
            }, dz(callback));
        }, function (callback) {
            fs.chmod(path.join(options.debian, 'rules'), '744', callback);
        }
    ], callback);
}

function buildPackage(emitter, options, callback) {
    var command;
    
    emitter.info('Building package', { em: true });
    
    command = ([
        'dpkg-buildpackage',
        '-us',
        '-uc',
    ]).join(' ');
    
    emitter.verbose('Running: `'+ command +'` in: '+ options.BUILDROOT_DIR);
    
    exec(command, { cwd: options.BUILDROOT_DIR }, callback);
}

function finish(emitter, options, callback) {
    emitter.info('Build successful', { em: true });
    
    callback(null);
}
