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
    var service, initScriptTarget;
    
    service = options.service;
    if (options.type == 'rpm') {
        service.initDir = path.join(options.BUILDROOT_DIR, 'etc/init.d');
        initScriptTarget = path.join(service.initDir, options.name);
    } else if (options.type == 'deb') {
        service.initDir = options.debian;
        initScriptTarget = path.join(service.initDir, service.name +'.init');
    }
    
    async.series([
        function (callback) {
            emitter.verbose('Creating directory: '+ service.initDir);
            
            mkdirp(service.initDir, callback);
        }, function (callback) {
            var file = 'service/sysv-'+ options.type;
            
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
    var service, serviceScriptTarget;
    
    service = options.service;
    service.serviceDir = path.join(options.BUILDROOT_DIR, 'lib/systemd/system');
    serviceScriptTarget = path.join(service.serviceDir, options.name +'.service');
    
    async.series([
        function (callback) {
            emitter.verbose('Creating directory: '+ service.serviceDir);
            
            mkdirp(service.serviceDir, callback);
        }, function (callback) {
            var file = 'service/systemd';
            
            emitter.verbose('Rendering asset file: '+ file +' to: '+ serviceScriptTarget);
            
            putil.renderAssetFile(file, serviceScriptTarget, options, callback);
        }
    ], dz(callback));
}

function prepareUpstart(emitter, options, callback) {
    var service, serviceScriptTarget;
    
    service = options.service;
    if (options.type == 'rpm') {
        service.serviceDir = path.join(options.BUILDROOT_DIR, 'etc/init');
    serviceScriptTarget = path.join(service.serviceDir, options.name +'.conf');
    } else if (options.type == 'deb') {
        service.serviceDir = options.debian;
        serviceScriptTarget = path.join(service.serviceDir, options.name +'.upstart');
    }
    
    async.series([
        function (callback) {
            emitter.verbose('Creating directory: '+ service.serviceDir);
            
            mkdirp(service.serviceDir, callback);
        }, function (callback) {
            var file = 'service/upstart';
            
            emitter.verbose('Rendering asset file: '+ file +' to: '+ serviceScriptTarget);
            
            putil.renderAssetFile(file, serviceScriptTarget, options, callback);
        }
    ], dz(callback));
}
