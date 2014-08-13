var fs = require('fs');
var ncp = require('ncp');
var ejs = require('ejs');
var util = require('util');
var path = require('path');
var glob = require('glob');
var exec = require('child_process').exec;
var async = require('async');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var CWD = process.cwd();
var PACKAGER_DIR = __dirname;

var RPMBUILD_NAME = 'packager_build';
var TMP_PACKAGE_DIR = 'examples/theapp';

var RPMBUILD_DIR = path.resolve(CWD, RPMBUILD_NAME);
var PACKAGE_DIR = path.resolve(CWD, TMP_PACKAGE_DIR);
var PACKAGE_JSON = path.join(PACKAGE_DIR, 'package.json');

var config = {
    RPMBUILD_DIR: RPMBUILD_DIR,
    PACKAGE_DIR: PACKAGE_DIR
};

async.series([
    prepareConfig,
    prepareBuildDirs,
    prepareSources,
    prepareFiles,
    prepareDaemonFile,
    prepareSpecFile,
    buildPackage
], function (error, result) {
    if (error) {
        console.error(util.inspect(error));
        console.log(result.length);
    }
});

function prepareConfig(callback) {
    var pkg, defaults;
    
    pkg = require(PACKAGE_JSON);
    
    extend(config, {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license,
    });
    
    if (pkg.author) {
        config.vendor = pkg.author;
    }
    
    if (pkg.bin) {
        config.bin = pkg.bin;
    }
    
    defaults = {
        summary: 'Node.js module '+ pkg.name,
        release: 1,
        group: 'Applications/Internet',
        source: pkg.name +'-'+ pkg.version +'.tgz',
        specfile: pkg.name +'.spec',
        prefix: '/usr'
    };
    
    if (pkg.packager) {
        extend(config, pkg.packager);
    }
    
    for (var i in defaults) {
        if (defaults.hasOwnProperty(i) && ! (i in config) || ! config  || ! config[i].length) {
            config[i] = defaults[i];
        }
    }
    
    callback(null);
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
    config.binDir = path.join(config.BUILDROOT_DIR, config.prefix, 'bin');
    config.installDir = path.join(config.BUILDROOT_DIR, config.prefix, 'lib', config.name);
    
    async.series([
        function (callback) {
            mkdirp(config.binDir, callback);
        }, function (callback) {
            mkdirp(config.installDir, callback);
        }, function (callback) {
            glob('**/*', { cwd: config.sourcesDir, mark: true }, function (error, files) {
                if (error) {
                    return callback(error);
                }
                
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
        }, function (callback) {
            var bin, bins, name, target;
            
            bin = config.bin;
            bins = [];
            if (typeof bin === 'string') {
                bins.push({ name: config.name, target: bin });
            } else {
                for (var i in bin) if (bin.hasOwnProperty) {
                    bins.push({ name: i, target: bin[i] });
                }
            }
            
            async.each(bins, function (bin, callback) {
                name = path.join(config.binDir, bin.name);
                target = path.join(path.relative(config.binDir, config.installDir), bin.target);
                fs.symlink(target, name, function (error) {
                    if (error) {
                        return callback(error);
                    }
                    
                    fs.chmod(name, '755', callback);
                });
            }, callback);
        }
    ], callback);
}

function prepareDaemonFile(callback) {
    var keys, daemon, sbinTarget, initScriptTarget, content;
    
    daemon = config.daemon;
    if ( ! daemon) {
        return callback(null);
    }
    
    sbinTarget = path.join(config.prefix, 'sbin');
    
    config.sbinDir = path.join(config.BUILDROOT_DIR, sbinTarget);
    config.configDir = path.join(config.BUILDROOT_DIR, 'etc/init.d');
    
    initScriptTarget = path.join(config.configDir, config.name);
    
    if (typeof daemon === 'string') {
        daemon = { name: config.name, target: daemon };
    } else {
        keys = Object.keys(daemon);
        daemon = { name: keys[0], target: daemon[keys[0]] };
    }
    
    config.daemonName = daemon.name;
    config.daemonTarget = path.join(sbinTarget, daemon.name);
    
    async.series([
        function (callback) {
            mkdirp(config.sbinDir, callback);
        }, function (callback) {
            mkdirp(config.configDir, callback);
        }, function (callback) {
            var name, target;
            
            name = path.join(config.sbinDir, daemon.name);
            target = path.join(path.relative(config.sbinDir, config.installDir), config.daemon);
            
            fs.symlink(target, name, function (error) {
                if (error) {
                    return callback(error);
                }
                
                fs.chmod(name, '755', callback);
            });
        }, function (callback) {
            fs.readFile(path.join(PACKAGER_DIR, 'assets/initscript'), 'utf8', function (error, _content) {
                content = _content;
                callback(error);
            });
        }, function (callback) {
            try {
                content = ejs.render(content, config);
                callback(null);
            } catch (error) {
                callback(error);
            }
        }, function (callback) {
            fs.writeFile(initScriptTarget, content, callback);
        }, function (callback) {
            fs.chmod(initScriptTarget, '755', callback);
        }
    ], callback);
}

function prepareSpecFile(callback) {
    async.waterfall([
        function (callback) {
            fs.readFile(path.join(PACKAGER_DIR, 'assets/spec.tpl'), 'utf8', callback);
        }, function (content, callback) {
            try {
                callback(null, ejs.render(content, config));
            } catch (error) {
                callback(error);
            }
        }, function (content, callback) {
            fs.writeFile(path.join(RPMBUILD_DIR, 'SPECS', config.specfile), content, callback);
        }
    ], callback);
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

function extend(target) {
    for (var i, k = 0, len = arguments.length; ++k < len;) {
        for (i in arguments[k]) {
            if (arguments[k].hasOwnProperty(i)) {
                target[i] = arguments[k][i];
            }
        }
    }
    return target;
}
