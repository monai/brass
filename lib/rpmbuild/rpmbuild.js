var fs = require('fs');
var ncp = require('ncp');
var util = require('util');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var async = require('async');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var putils = require('./utils');

var config;

module.exports = rpmbuild;

function rpmbuild(_config, callback) {
    config = _config;
    
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
            rimraf(RPMBUILD_DIR, callback);
        }, function (callback) {
            fullpath = path.join(RPMBUILD_DIR, 'tmp');
            config.BUILDROOT_DIR = fullpath;
            mkdirp(fullpath, callback);
        }, function (callback) {
            async.each([ 'BUILD', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS' ], function (dir, callback) {
                fullpath = path.join(RPMBUILD_DIR, dir);
                config['BUILDROOT_'+ dir] = fullpath;
                mkdirp(fullpath, callback);
            }, callback);
        }
    ], callback);
}

function prepareSources(callback) {
    config.sourcesDir = path.join(config.BUILDROOT_BUILD, 'package');
    
    async.series([
        function (callback) {
            var command = 'npm pack '+ config.PACKAGE_DIR;
            exec(command, { cwd: config.BUILDROOT_SOURCES }, callback);
        }, function (callback) {
            var command = 'tar xvzf '+ path.join(config.BUILDROOT_SOURCES, config.source);
            exec(command, { cwd: config.BUILDROOT_BUILD }, callback);
        }, function (callback) {
            var command = 'npm install';
            exec(command, { cwd: config.sourcesDir }, callback);
        }
    ], callback);
}

function prepareFiles(callback) {
    config.installDir = path.join(config.BUILDROOT_DIR, config.prefix, 'lib', config.name);
    
    async.series([
        function (callback) {
            mkdirp(config.installDir, callback);
        }, function (callback) {
            glob('**/*', { cwd: config.sourcesDir, mark: true }, function (error, files) {
                if (error) return callback(error);
                
                async.each(files, function (file, callback) {
                    var src, dest;
                    
                    src = path.join(config.sourcesDir, file);
                    dest = path.join(config.installDir, file);
                    
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
    
    config.binTarget = path.join(config.prefix, 'bin');
    config.sbinTarget = path.join(config.prefix, 'sbin');
    
    config.binDir = path.join(config.BUILDROOT_DIR, config.binTarget);
    config.sbinDir = path.join(config.BUILDROOT_DIR, config.sbinTarget);
    
    async.series([
        function (callback) {
            async.each([
                config.binDir,
                config.sbinDir
            ], mkdirp, callback);
        }, function (callback) {
            var bins = putils.unwrapFileList(config.bin, config.name);
            async.each(bins, function (bin, callback) {
                makeBinSymlink(config.binDir, bin, callback);
            }, callback);
        }, function (callback) {
            daemon = config.daemon;
            if ( ! daemon) callback(null);
            
            daemon = putils.unwrapFileList(daemon, config.name);
            daemon = config.daemon = daemon[0];
            makeBinSymlink(config.sbinDir, daemon, callback);
        }
    ], callback);
}

function prepareDaemonFile(callback) {
    var daemon, initScriptTarget, content;
    
    daemon = config.daemon;
    if ( ! daemon) return callback(null);
    
    config.daemonName = daemon.name;
    config.daemonTarget = path.join(config.sbinTarget, daemon.name);
    
    config.configDir = path.join(config.BUILDROOT_DIR, 'etc/init.d');
    initScriptTarget = path.join(config.configDir, config.name);
    
    async.series([
        function (callback) {
            mkdirp(config.configDir, callback);
        }, function (callback) {
            putils.renderFile(path.join(PACKAGER_DIR, 'assets/initscript'), initScriptTarget, callback);
        }, function (callback) {
            fs.chmod(initScriptTarget, '755', callback);
        }
    ], callback);
}

function prepareSpecFile(callback) {
    putils.renderFile(path.join(
        PACKAGER_DIR, 'assets/spec.tpl'),
        path.join(RPMBUILD_DIR, 'SPECS', config.specfile),
        callback
    );
}

function buildPackage(callback) {
    var command;
    
    command = ([
        'rpmbuild',
        '-ba',
        '--buildroot', config.BUILDROOT_DIR,
        config.specfile 
    ]).join(' ');
    
    exec(command, { cwd: config.BUILDROOT_SPECS }, callback);
}

function makeBinSymlink(base, fileMap, callback) {
    var name, target;
    name = path.join(base, fileMap.name);
    target = path.join(path.relative(base, config.installDir), fileMap.target);
    fs.symlink(target, name, function (error) {
        if (error) {
            return callback(error);
        }
        
        fs.chmod(name, '755', callback);
    });
}

