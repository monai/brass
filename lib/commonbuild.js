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

module.exports = {
    checkArchitecture: checkArchitecture,
    prepareSources: prepareSources,
    prepareFiles: prepareFiles,
    prepareBinaries: prepareBinaries,
    prepareServiceFile: prepareServiceFile
};

function checkArchitecture(emitter, options, callback) {
    if (process.arch === 'x64') {
        options.arch = 'x86_64';
        return dz(callback)(null);
    } else if (process.arch === 'ia32') {
        options.arch = 'x86';
        return dz(callback)(null);
    }
    
    return dz(callback)(new Error('Unsupported architecture: '+ process.arch));
}

function prepareSources(emitter, options, callback) {
    emitter.info('Preapring sources', { em: true });
    
    if (options.type == 'rpm') {
        options.sourcesDir = path.join(options.BUILDROOT_BUILD, 'package');
    } else if (options.type == 'deb') {
        options.sourcesDir = path.join(options.DEBBUILD_DIR, 'package');
    }
    
    async.series([
        function (callback) {
            var command, builddir;
            
            command = 'npm pack '+ options.PACKAGE_DIR;
            
            if (options.type == 'rpm') {
                builddir = options.BUILDROOT_SOURCES;
            } else if (options.type == 'deb') {
                builddir = options.DEBBUILD_DIR;
            }
            
            emitter.verbose('Running: `'+ command +'` in: '+ builddir);
            
            exec(command, { cwd: builddir }, callback);
        }, function (callback) {
            var command, srcdir, builddir;
            
            if (options.type == 'rpm') {
                srcdir = options.BUILDROOT_SOURCES;
                builddir = options.BUILDROOT_BUILD;
            } else if (options.type == 'deb') {
                srcdir = builddir = options.DEBBUILD_DIR;
            }
            
            command = 'tar xvzf '+ path.join(srcdir, options.source);
            
            emitter.verbose('Running: `'+ command +'` in: '+ builddir);
            
            exec(command, { cwd: builddir }, callback);
        }, function (callback) {
            var command = 'npm install';
            
            emitter.verbose('Running: `'+ command +'` in: '+ options.sourcesDir);
            
            exec(command, { cwd: options.sourcesDir }, callback);
        }
    ], dz(callback));
}

function prepareFiles(emitter, options, callback) {
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
            var files;
            
            files = options.files || [ '**/*' ];
            files = Array.isArray(files) ? files : [ files ];
            
            files = files.map(function (file) {
                file = ld.isPlainObject(file)
                    ? file
                    : {
                        files: file,
                        target: options.installTarget,
                        cwd: ''
                    };
                file.include = file.files[0] !== '!';
                return file;
            });
            
            patterns = files;
            
            dz(callback)(null);
        }, function (callback) {
            async.eachSeries(patterns, function (pat, callback) {
                var cwd = path.resolve(options.sourcesDir, pat.cwd);
                
                glob(pat.files, { cwd: cwd, mark: true }, function (error, files) {
                    pat.files = files;
                    dz(callback)(null);
                });
            }, dz(callback));
        }, function (callback) {
            var include, exclude, files, file;
            
            files = [];
            include = ld.where(patterns, { include: true });
            exclude = ld.where(patterns, { include: false });
            
            include.forEach(function (pat) {
                file = ld.where(files, { target: pat.target });
                if ( ! file.length) {
                    files.push(pat);
                } else {
                    file = file[0];
                    file.files = ld.union(file.files, pat.files);
                }
            });
            
            exclude.forEach(function (pat) {
                file = ld.where(files, { target: pat.target });
                if (file.length) {
                    file = file[0];
                    file.files = ld.difference(file.files, pat.files);
                }
            });
            
            options.fileList = files;
            dz(callback)(null);
        }, function (callback) {
            async.eachSeries(options.fileList, function (file, callback) {
                mkdirp(path.join(options.BUILDROOT_DIR, file.target), callback);
            }, dz(callback));
        }, function (callback) {
            var files, src, dest, targetFile, targetFiles;
            
            async.eachSeries(options.fileList, function (file, callback) {
                targetFiles = file.targetFiles = [];
                files = file.files = putil.filterEmptyDirs(file.files);
                async.eachSeries(files, function (filename, callback) {
                    src = path.join(options.sourcesDir, file.cwd, filename);
                    targetFile = path.join(file.target, filename);
                    dest = path.join(options.BUILDROOT_DIR, targetFile);
                    
                    if (dest[dest.length - 1] === '/') {
                        emitter.verbose('Creating directory: '+ dest);
                        
                        mkdirp(dest, callback);
                    } else {
                        emitter.verbose('Copying file: '+ src +' to: '+ dest);
                        
                        targetFiles.push({
                            filename: targetFile,
                            type: file.type || 'default',
                            attr: file.attr || null,
                            noreplace: !! file.noreplace
                        });
                        ncp(src, dest, dz(callback));
                    }
                }, dz(callback));
            }, dz(callback));
        }, function (callback) {
            var targetFiles;
            
            targetFiles = ld.pluck(options.fileList, 'targetFiles');
            targetFiles = ld.union.apply(null, targetFiles);
            options.targetFileList = ld.union(options.targetFileList, targetFiles);
            
            dz(callback)(null);
        }
    ], dz(callback));
}

function prepareBinaries(emitter, options, callback) {
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
                putil.makeBinSymlink(emitter, options, options.binDir, bin, callback);
            }, dz(callback));
        }, function (callback) {
            var _service;
            
            _service = options.service;
            if ( ! _service) dz(callback)(null);
            
            options.targetFileList.push(path.join(options.sbinTarget, _service.name));
            putil.makeBinSymlink(emitter, options, options.sbinDir, _service, callback);
        }
    ], dz(callback));
}

function prepareServiceFile(emitter, options, callback) {
    var _service, types, prepareService;
    
    _service = options.service;
    types = {};
    types[service.SYSV] = service.prepareSysv;
    types[service.SYSTEMD] = service.prepareSystemd;
    types[service.UPSTART] = service.prepareUpstart;
    prepareService = types[_service.type];
    
    if ( ! prepareService) {
        return dz(callback)(new Error('Not supported service type '+ _service.type));
    }
    
    emitter.info('Preapring service file', { em: true });
    emitter.info('Service type: '+ _service.type);
    
    options.service.systemTarget = path.join(options.sbinTarget, _service.name);
    
    prepareService(emitter, options, callback);
}
