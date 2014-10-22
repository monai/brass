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
        prepareSources,
        prepareFiles,
        prepareBinaries,
        prepareOrigArchive,
        prepareFileList,
        prepareDebianDirectory,
        prepareServiceFile,
        buildPackage,
        finish
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
            fullpath = path.join(options.DEBBUILD_DIR, [ options.name, options.version ].join('-'));
            options.BUILDROOT_DIR = fullpath;
            
            emitter.verbose('Creating directory: '+ fullpath);
            
            mkdirp(fullpath, callback);
        }, function (callback) {
            options.debian = path.join(options.BUILDROOT_DIR, 'debian');
            
            emitter.verbose('Creating directory: '+ options.debian);
            
            mkdirp(options.debian, callback);
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
            var _service;
            
            _service = options.service;
            if ( ! _service) dz(callback)(null);
            
            options.targetFileList.push(path.join(options.sbinTarget, _service.name));
            makeBinSymlink(options.sbinDir, _service, callback);
        }
    ], dz(callback));
}

function prepareOrigArchive(callback) {
    var src, dest, command;
    
    src = path.join(path.basename(options.BUILDROOT_DIR));
    dest = path.join(options.DEBBUILD_DIR, options.name +'_'+ options.version +'.orig.tar.gz');
    command = [ 'tar cvzf', dest, src ].join(' ');
    
    emitter.info('Creating orig archive', { em: true });
    emitter.verbose('Running: `'+ command +'` in: '+ options.DEBBUILD_DIR);
    
    exec(command, { cwd: options.DEBBUILD_DIR }, callback);
}

function prepareFileList(callback) {
    var conf, etc, files;
    
    conf = ld.where(options.targetFileList, { type: 'config' });
    conf = ld.pluck(conf, 'filename');
    etc = ld.filter(conf, function (s) { return s.match(/^\/etc/) });
    conf = ld.difference(conf, etc);
    
    files = ld.where(options.targetFileList, { type: 'default' });
    files = ld.pluck(files, 'filename');
    files = ld.union(files, ld.filter(options.targetFileList, ld.isString), etc);
    
    options.targetConfFileList = conf.join('\n');
    options.targetFileList = files.join('\n');
    
    dz(callback)(null);
}

function prepareDebianDirectory(callback) {
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
    ], dz(callback));
}

function prepareServiceFile(callback) {
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

function buildPackage(callback) {
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

function finish(callback) {
    emitter.info('Build successful', { em: true });
    
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
