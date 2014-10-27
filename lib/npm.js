var ld = require('lodash');
var path = require('path');

module.exports = {
    getOptions: getOptions
};

function getOptions(options) {
    var out, pkg, defaults;
    
    pkg = require(path.join(options.package, 'package.json'));
    out = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license
    };
    
    if (pkg.author) {
        out.vendor = pkg.author;
    }
    
    if (pkg.bin) {
        out.bin = pkg.bin;
    }
    
    if (pkg.brass) {
        ld.merge(out, pkg.brass);
    }
    
    defaults = {
        summary: 'Node.js module '+ pkg.name,
        release: 1,
        group: 'Applications/Internet',
        source: pkg.name +'-'+ pkg.version +'.tgz',
        prefix: '/usr',
        service: {}
    };
    
    ld.merge(out, defaults);
    
    return out;
}
