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
    
    emitter.info('Preapring build directories', { em: true });
    
    async.series([
        function (callback) {
            emitter.debug('Removing directory: '+ options.RPMBUILD_DIR);
            
            rimraf(options.RPMBUILD_DIR, callback);
        }, function (callback) {
            fullpath = path.join(options.RPMBUILD_DIR, 'tmp');
            options.BUILDROOT_DIR = fullpath;
            
            emitter.debug('Creating directory: '+ fullpath);
            
            mkdirp(fullpath, callback);
        }, function (callback) {
            async.eachSeries([ 'BUILD', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS' ], function (dir, callback) {
                fullpath = path.join(options.RPMBUILD_DIR, dir);
                options['BUILDROOT_'+ dir] = fullpath;
                
                emitter.debug('Creating directory: '+ fullpath);
                
                mkdirp(fullpath, callback);
            }, callback);
        }
    ], callback);
}

function prepareSources(callback) {
    emitter.info('Preapring sources', { em: true });
    
    options.sourcesDir = path.join(options.BUILDROOT_BUILD, 'package');
    
    async.series([
        function (callback) {
            var command = 'npm pack '+ options.PACKAGE_DIR;
            
            emitter.debug('Running: `'+ command +'` in: '+ options.BUILDROOT_SOURCES);
            
            exec(command, { cwd: options.BUILDROOT_SOURCES }, callback);
        }, function (callback) {
            var command = 'tar xvzf '+ path.join(options.BUILDROOT_SOURCES, options.source);
            
            emitter.debug('Running: `'+ command +'` in: '+ options.BUILDROOT_BUILD);
            
            exec(command, { cwd: options.BUILDROOT_BUILD }, callback);
        }, function (callback) {
            var command = 'npm install';
            
            emitter.debug('Running: `'+ command +'` in: '+ options.sourcesDir);
            
            exec(command, { cwd: options.sourcesDir }, callback);
        }
    ], callback);
}

function prepareFiles(callback) {
    emitter.info('Preapring files', { em: true });
    
    options.installDir = path.join(options.BUILDROOT_DIR, options.prefix, 'lib', options.name);
    
    async.series([
        function (callback) {
            emitter.debug('Creating directory: '+ options.installDir);
            
            mkdirp(options.installDir, callback);
        }, function (callback) {
            glob('**/*', { cwd: options.sourcesDir, mark: true }, function (error, files) {
                if (error) return callback(error);
                
                async.eachSeries(files, function (file, callback) {
                    var src, dest;
                    
                    src = path.join(options.sourcesDir, file);
                    dest = path.join(options.installDir, file);
                    
                    if (dest.lastIndexOf('/') === dest.length - 1) {
                        emitter.debug('Creating directory: '+ dest);
                        
                        mkdirp(dest, callback);
                    } else {
                        emitter.debug('Copying file: '+ src +' to: '+ dest);
                        
                        ncp(src, dest, callback);
                    }
                }, callback);
            });
        }
    ], callback);
}

function prepareBinaries(callback) {
    var binTarget, sbinTarget, daemon;
    
    emitter.info('Preapring binaries', { em: true });
    
    options.binTarget = path.join(options.prefix, 'bin');
    options.sbinTarget = path.join(options.prefix, 'sbin');
    
    options.binDir = path.join(options.BUILDROOT_DIR, options.binTarget);
    options.sbinDir = path.join(options.BUILDROOT_DIR, options.sbinTarget);
    
    async.series([
        function (callback) {
            async.eachSeries([
                options.binDir,
                options.sbinDir
            ], function (dir, callback) {
                emitter.debug('Creating directory: '+ dir);
                
                mkdirp(dir, callback);
            }, callback);
        }, function (callback) {
            var bins = putil.unwrapFileList(options.bin, options.name);
            async.eachSeries(bins, function (bin, callback) {
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
    
    emitter.info('Preapring daemon file', { em: true });
    
    options.daemonName = daemon.name;
    options.daemonTarget = path.join(options.sbinTarget, daemon.name);
    
    options.configDir = path.join(options.BUILDROOT_DIR, 'etc/init.d');
    initScriptTarget = path.join(options.configDir, options.name);
    
    async.series([
        function (callback) {
            emitter.debug('Creating directory: '+ options.configDir);
            
            mkdirp(options.configDir, callback);
        }, function (callback) {
            var file = 'service/sysv';
            
            emitter.debug('Rendering asset file: '+ file +' to: '+ initScriptTarget);
            
            putil.renderAssetFile(file, initScriptTarget, options, callback);
        }, function (callback) {
            var mode = '755';
            
            emitter.debug('Changing mode of file: '+ initScriptTarget +' to: '+ mode);
            
            fs.chmod(initScriptTarget, mode, callback);
        }
    ], callback);
}

function prepareSpecFile(callback) {
    var file, dest;
    
    file = 'rpmbuild/spec';
    dest = path.join(options.RPMBUILD_DIR, 'SPECS', 'spec');
    
    emitter.info('Preapring spec file', { em: true });
    emitter.debug('Rendering asset file: '+ file +' to: '+ dest);
    
    putil.renderAssetFile(file, dest, options, callback);
}

function buildPackage(callback) {
    var command;
    
    emitter.info('Building package', { em: true });
    
    command = ([
        'rpmbuild',
        '-ba',
        '--buildroot', options.BUILDROOT_DIR,
        'spec'
    ]).join(' ');
    
    emitter.debug('Running: `'+ command +'` in: '+ options.BUILDROOT_SPECS);
    
    exec(command, { cwd: options.BUILDROOT_SPECS }, callback);
}

function makeBinSymlink(base, fileMap, callback) {
    var name, target;
    name = path.join(base, fileMap.name);
    target = path.join(path.relative(base, options.installDir), fileMap.target);
    emitter.debug('Creating symlink: '+ name +' to: '+ target);
    fs.symlink(target, name, function (error) {
        if (error) {
            return callback(error);
        }
        
        fs.chmod(name, '755', callback);
    });
}

