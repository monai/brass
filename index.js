var mkdirp = require('mkdirp');


var WORKDIR = 'packager_build';
var PACKAGE = './examples/theapp/package.json';

var pkg = require(PACKAGE);

console.log(pkg);

