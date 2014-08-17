var fs = require('graceful-fs');
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
    daemon.configDir = path.join(options.BUILDROOT_DIR, 'etc/init.d');
    initScriptTarget = path.join(daemon.configDir, options.name);
    
    async.series([
        function (callback) {
            emitter.debug('Creating directory: '+ daemon.configDir);
            
            mkdirp(daemon.configDir, callback);
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

function prepareSystemd(options, callback) {
    callback(new Error('Systemd daemon type is not implemented'));
}

function prepareUpstart(options, callback) {
    callback(new Error('Upstart daemon type is not implemented'));
}
