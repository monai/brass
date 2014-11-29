var ld = require('lodash');
var npm = require('./npm');
var path = require('path');
var emitter = require('./emitter');
var rpmbuild = require('./rpmbuild');
var debbuild = require('./debbuild');

var BUILDDIR_NAME = 'brass_build';

module.exports = {
    build: build
};

function build(options, callback) {
    var cwd, options_;
    
    if (typeof options == 'function') {
        callback = options;
        options = {};
    } else if ( ! arguments.length) {
        options = {};
        callback = function () {};
    }
    
    options_ = npm.getOptions(options);
    ld.merge(options_, options);
    options = options_;
    options.BUILD_DIR = path.join(options.workDir, BUILDDIR_NAME);
    
    setImmediate(function () {
        emitter.verbose('Options', { em: true });
        emitter.verbose(options);
        emitter.info('Package type: '+ options.type, { em: true });
        
        if (options.type == 'rpm') {
            rpmbuild.build(emitter, options, callback);
        } else if (options.type == 'deb') {
            debbuild.build(emitter, options, callback);
        } else {
            callback(new Error('Package type is not specified or unsupported'));
        }
    });
    
    return emitter;
}
