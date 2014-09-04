var fs = require('graceful-fs');
var dz = require('dezalgo');
var ld = require('lodash');
var ncp = require('ncp');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var putil = require('./util');
var async = require('async');
var daemon = require('./daemon');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var RPMBUILD_NAME = 'brass_build';

var emitter, options;

module.exports = rpmbuild;

function rpmbuild(_emitter, _options, callback) {
    emitter = _emitter;
    options = _options;
    
    options.RPMBUILD_DIR = path.join(options.workDir, RPMBUILD_NAME);
    options.PACKAGE_DIR = options.package;
    
    async.series([
        checkArchitecture,
        prepareBuildDirs,
        prepareSources,
        prepareFiles,
        prepareBinaries,
        prepareDaemonFile,
        prepareFileList,
        prepareSpecFile,
        buildPackage,
        finish
    ], dz(callback));
}

function checkArchitecture(callback) {
    if (process.arch === 'x64') {
        options.arch = 'x86_64';
        return dz(callback)(null);
    } else if (options.arch === 'x86') {
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

function prepareSources(callback) {
    emitter.info('Preapring sources', { em: true });
    
    options.sourcesDir = path.join(options.BUILDROOT_BUILD, 'package');
    
    async.series([
        function (callback) {
            var command = 'npm pack '+ options.PACKAGE_DIR;
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.BUILDROOT_SOURCES);
            
            exec(command, { cwd: options.BUILDROOT_SOURCES }, callback);
        }, function (callback) {
            var command = 'tar xvzf '+ path.join(options.BUILDROOT_SOURCES, options.source);
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.BUILDROOT_BUILD);
            
            exec(command, { cwd: options.BUILDROOT_BUILD }, callback);
        }, function (callback) {
            var command = 'npm install';
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.sourcesDir);
            
            exec(command, { cwd: options.sourcesDir }, callback);
        }
    ], dz(callback));
}

function prepareFiles(callback) {
    var patterns;
    
    emitter.info('Preapring files', { em: true });
    
    options.installTarget = path.join(options.prefix, 'lib', options.name);
    options.installDir = path.join(options.BUILDROOT_DIR, options.installTarget);
    options.fileList = [];
    options.targetFileList = [];
        
    async.series([
        function (callback) {
            emitter.verbose('Creating directory: '+ options.installDir);
            
            mkdirp(options.installDir, callback);
        }, function (callback) {
            var simple;
            
            simple = options.files || [ '**/*' ];
            simple = Array.isArray(simple) ? simple : [ simple ];
            patterns = simple.filter(function (pattern) {
                return typeof pattern !== 'string';
            });
            simple = ld.difference(simple, patterns);
            patterns.push({
                target: 'default',
                files: simple
            });
            
            dz(callback)(null);
        }, function (callback) {
            var item, files = {};
            
            async.eachSeries(patterns, function (_item, callback) {
                var _files;
                
                item = _item;
                if ( ! files[item.target]) {
                    _files = files[item.target] = [];
                }
                
                async.eachSeries(item.files, function (pattern, callback) {
                    glob(pattern, { cwd: item.cwd || options.sourcesDir, mark: true }, function (error, __files) {
                        if (error) return dz(callback)(error);
                        [].push.apply(_files, __files);
                        dz(callback)(null);
                    });
                }, function (error) {
                    if (error) return dz(callback)(error);
                    options.fileList.push({
                        target: item.target,
                        cwd: item.cwd || null,
                        files: ld.uniq(_files)
                    });
                    dz(callback)(null);
                });
            }, dz(callback));
        }, function (callback) {
            var fileList, l;
            
            fileList = options.fileList;
            l = fileList.length;
            while (l--) {
                if (fileList[l].target === 'default') {
                    fileList = fileList.splice(l--, 1);
                    fileList = fileList[0];
                    break;
                }
            }
            
            fileList.files = putil.filterEmptyDirs(fileList.files);
            async.eachSeries(fileList.files, function (file, callback) {
                var src, dest;
                
                src = path.join(options.sourcesDir, file);
                dest = path.join(options.installDir, file);
                
                if (dest.lastIndexOf('/') === dest.length - 1) {
                    emitter.verbose('Creating directory: '+ dest);
                    
                    mkdirp(dest, callback);
                } else {
                    emitter.verbose('Copying file: '+ src +' to: '+ dest);
                    
                    options.targetFileList.push(path.join(options.installTarget, file));
                    
                    ncp(src, dest, dz(callback));
                }
            }, dz(callback));
        }, function (callback) {
            async.eachSeries(options.fileList, function (item, callback) {
                async.series([
                    function (callback) {
                        mkdirp(path.join(options.BUILDROOT_DIR, item.cwd), callback);
                    }, function (callback) {
                        var targetPath;
                        
                        item.files = putil.filterEmptyDirs(item.files);
                        async.eachSeries(item.files, function (file, callback) {
                            var src, dest;
                            
                            src = path.join(options.sourcesDir, item.cwd, file);
                            dest = path.join(options.BUILDROOT_DIR, item.cwd, file);
                            
                            if (dest.lastIndexOf('/') === dest.length - 1) {
                                emitter.verbose('Creating directory: '+ dest);
                                
                                mkdirp(dest, callback);
                            } else {
                                emitter.verbose('Copying file: '+ src +' to: '+ dest);
                                
                                targetPath = path.join(item.cwd, file);
                                if (targetPath[1] !== '/') {
                                    targetPath = '/'+ targetPath;
                                }
                                options.targetFileList.push(targetPath);
                                
                                ncp(src, dest, dz(callback));
                            }
                        }, dz(callback));
                    }
                ], dz(callback));
            }, dz(callback));
        }
    ], dz(callback));
}

function prepareBinaries(callback) {
    var binTarget, sbinTarget;
    
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
                emitter.verbose('Creating directory: '+ dir);
                
                mkdirp(dir, callback);
            }, dz(callback));
        }, function (callback) {
            var bins = putil.unwrapFileList(options.bin, options.name);
            async.eachSeries(bins, function (bin, callback) {
                options.targetFileList.push(path.join(options.binTarget, bin.name));
                makeBinSymlink(options.binDir, bin, callback);
            }, dz(callback));
        }, function (callback) {
            var _daemon;
            
            _daemon = options.daemon;
            if ( ! _daemon) dz(callback)(null);
            
            options.targetFileList.push(path.join(options.sbinTarget, _daemon.name));
            makeBinSymlink(options.sbinDir, _daemon, callback);
        }
    ], dz(callback));
}

function prepareDaemonFile(callback) {
    var _daemon, types, prepareDaemon;
    
    _daemon = options.daemon;
    if ( ! _daemon) return dz(callback)(null);
    
    types = {};
    types[daemon.SYSV] = daemon.prepareSysv;
    types[daemon.SYSTEMD] = daemon.prepareSystemd;
    types[daemon.UPSTART] = daemon.prepareUpstart;
    prepareDaemon = types[_daemon.type];
    
    if ( ! prepareDaemon) {
        return dz(callback)(new Error('Not supported daemon type '+ _daemon.type));
    }
    
    emitter.info('Preapring daemon file', { em: true });
    emitter.info('Daemon type: '+ _daemon.type);
    
    options.daemon.systemTarget = path.join(options.sbinTarget, _daemon.name);
    
    prepareDaemon(emitter, options, callback);
}

function prepareFileList(callback) {
    options.targetFileList = options.targetFileList.join('\n');
    dz(callback)(null);
}

function prepareSpecFile(callback) {
    var file, dest;
    
    file = 'rpmbuild/spec';
    dest = path.join(options.RPMBUILD_DIR, 'SPECS', 'spec');
    
    emitter.info('Preapring spec file', { em: true });
    emitter.verbose('Rendering asset file: '+ file +' to: '+ dest);
    
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
    
    emitter.verbose('Running: `'+ command +'` in: '+ options.BUILDROOT_SPECS);
    
    exec(command, { cwd: options.BUILDROOT_SPECS }, callback);
}

function finish(callback) {
    var filename;
    
    filename = [ options.name, options.version, options.release ].join('-');
    filename = [ filename, options.arch, 'rpm' ].join('.');
    
    emitter.info('Build successful', { em: true });
    emitter.info(path.join(options.BUILDROOT_RPMS, options.arch, filename));
    
    dz(callback)(null);
}

function makeBinSymlink(base, fileMap, callback) {
    var name, target;
    name = path.join(base, fileMap.name);
    target = path.join(path.relative(base, options.installDir), fileMap.target);
    emitter.verbose('Creating symlink: '+ name +' to: '+ target);
    fs.symlink(target, name, function (error) {
        if (error) return dz(allback)(error);
        fs.chmod(name, '755', callback);
    });
}
