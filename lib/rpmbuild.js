var fs = require('graceful-fs');
var ncp = require('ncp');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var putil = require('./util');
var async = require('async');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var RPMBUILD_NAME = 'packager_build';

var emitter, options;

module.exports = rpmbuild;

function rpmbuild(_emitter, _options, callback) {
    emitter = _emitter;
    options = _options;
    
    options.RPMBUILD_DIR = path.join(options.workDir, RPMBUILD_NAME);
    options.PACKAGE_DIR = options.package;
    
    async.series([
        prepareBuildDirs,
        prepareSources,
        prepareFiles,
        prepareBinaries,
        prepareDaemonFile,
        prepareSpecFile,
        buildPackage
    ], callback);
}

function prepareBuildDirs(callback) {
    var fullpath;
    
    async.series([
        function (callback) {
            rimraf(options.RPMBUILD_DIR, callback);
        }, function (callback) {
            fullpath = path.join(options.RPMBUILD_DIR, 'tmp');
            options.BUILDROOT_DIR = fullpath;
            mkdirp(fullpath, callback);
        }, function (callback) {
            async.each([ 'BUILD', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS' ], function (dir, callback) {
                fullpath = path.join(options.RPMBUILD_DIR, dir);
                options['BUILDROOT_'+ dir] = fullpath;
                mkdirp(fullpath, callback);
            }, callback);
        }
    ], callback);
}

function prepareSources(callback) {
    options.sourcesDir = path.join(options.BUILDROOT_BUILD, 'package');
    
    async.series([
        function (callback) {
            var command = 'npm pack '+ options.PACKAGE_DIR;
            exec(command, { cwd: options.BUILDROOT_SOURCES }, callback);
        }, function (callback) {
            var command = 'tar xvzf '+ path.join(options.BUILDROOT_SOURCES, options.source);
            exec(command, { cwd: options.BUILDROOT_BUILD }, callback);
        }, function (callback) {
            var command = 'npm install';
            exec(command, { cwd: options.sourcesDir }, callback);
        }
    ], callback);
}

function prepareFiles(callback) {
    options.installDir = path.join(options.BUILDROOT_DIR, options.prefix, 'lib', options.name);
    
    async.series([
        function (callback) {
            mkdirp(options.installDir, callback);
        }, function (callback) {
            glob('**/*', { cwd: options.sourcesDir, mark: true }, function (error, files) {
                if (error) return callback(error);
                
                async.each(files, function (file, callback) {
                    var src, dest;
                    
                    src = path.join(options.sourcesDir, file);
                    dest = path.join(options.installDir, file);
                    
                    if (dest.lastIndexOf('/') === dest.length - 1) {
                        mkdirp(dest, callback);
                    } else {
                        ncp(src, dest, callback);
                    }
                }, callback);
            });
        }
    ], callback);
}

function prepareBinaries(callback) {
    var binTarget, sbinTarget, daemon;
    
    options.binTarget = path.join(options.prefix, 'bin');
    options.sbinTarget = path.join(options.prefix, 'sbin');
    
    options.binDir = path.join(options.BUILDROOT_DIR, options.binTarget);
    options.sbinDir = path.join(options.BUILDROOT_DIR, options.sbinTarget);
    
    async.series([
        function (callback) {
            async.each([
                options.binDir,
                options.sbinDir
            ], mkdirp, callback);
        }, function (callback) {
            var bins = putil.unwrapFileList(options.bin, options.name);
            async.each(bins, function (bin, callback) {
                makeBinSymlink(options.binDir, bin, callback);
            }, callback);
        }, function (callback) {
            daemon = options.daemon;
            if ( ! daemon) callback(null);
            
            daemon = putil.unwrapFileList(daemon, options.name);
            daemon = options.daemon = daemon[0];
            makeBinSymlink(options.sbinDir, daemon, callback);
        }
    ], callback);
}

function prepareDaemonFile(callback) {
    var daemon, initScriptTarget, content;
    
    daemon = options.daemon;
    if ( ! daemon) return callback(null);
    
    options.daemonName = daemon.name;
    options.daemonTarget = path.join(options.sbinTarget, daemon.name);
    
    options.configDir = path.join(options.BUILDROOT_DIR, 'etc/init.d');
    initScriptTarget = path.join(options.configDir, options.name);
    
    async.series([
        function (callback) {
            mkdirp(options.configDir, callback);
        }, function (callback) {
            putil.renderAssetFile('service/sysv', initScriptTarget, options, callback);
        }, function (callback) {
            fs.chmod(initScriptTarget, '755', callback);
        }
    ], callback);
}

function prepareSpecFile(callback) {
    putil.renderAssetFile('rpmbuild/spec', path.join(options.RPMBUILD_DIR, 'SPECS', options.specfile), options, callback);
}

function buildPackage(callback) {
    var command;
    
    command = ([
        'rpmbuild',
        '-ba',
        '--buildroot', options.BUILDROOT_DIR,
        options.specfile 
    ]).join(' ');
    
    exec(command, { cwd: options.BUILDROOT_SPECS }, callback);
}

function makeBinSymlink(base, fileMap, callback) {
    var name, target;
    name = path.join(base, fileMap.name);
    target = path.join(path.relative(base, options.installDir), fileMap.target);
    fs.symlink(target, name, function (error) {
        if (error) {
            return callback(error);
        }
        
        fs.chmod(name, '755', callback);
    });
}

