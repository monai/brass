var fs = require('graceful-fs');
var dz = require('dezalgo');
var path = require('path');
var async = require('async');
var putil = require('./util');
var mkdirp = require('mkdirp');

var SYSV = 'sysv';
var SYSTEMD = 'systemd';
var UPSTART = 'upstart';

module.exports = {
    SYSV: SYSV,
    SYSTEMD: SYSTEMD,
    UPSTART: UPSTART,
    
    prepareSysv: prepareSysv,
    prepareSystemd: prepareSystemd,
    prepareUpstart: prepareUpstart
};

function prepareSysv(emitter, options, callback) {
    var daemon, initScriptTarget;
    
    daemon = options.daemon;
    daemon.initDir = path.join(options.BUILDROOT_DIR, 'etc/init.d');
    initScriptTarget = path.join(daemon.initDir, options.name);
    
    async.series([
        function (callback) {
            emitter.verbose('Creating directory: '+ daemon.initDir);
            
            mkdirp(daemon.initDir, callback);
        }, function (callback) {
            var file = 'service/sysv';
            
            emitter.verbose('Rendering asset file: '+ file +' to: '+ initScriptTarget);
            
            putil.renderAssetFile(file, initScriptTarget, options, callback);
        }, function (callback) {
            var mode = '755';
            
            emitter.verbose('Changing mode of file: '+ initScriptTarget +' to: '+ mode);
            
            fs.chmod(initScriptTarget, mode, callback);
        }
    ], dz(callback));
}

function prepareSystemd(emitter, options, callback) {
    var daemon, serviceScriptTarget;
    
    daemon = options.daemon;
    daemon.serviceDir = path.join(options.BUILDROOT_DIR, 'lib/systemd/system');
    serviceScriptTarget = path.join(daemon.serviceDir, options.name +'.service');
    
    async.series([
        function (callback) {
            emitter.verbose('Creating directory: '+ daemon.serviceDir);
            
            mkdirp(daemon.serviceDir, callback);
        }, function (callback) {
            var file = 'service/systemd';
            
            emitter.verbose('Rendering asset file: '+ file +' to: '+ serviceScriptTarget);
            
            putil.renderAssetFile(file, serviceScriptTarget, options, callback);
        }
    ], dz(callback));
}

function prepareUpstart(emitter, options, callback) {
    dz(callback)(new Error('Daemon type "upstart" is not implemented'));
}
