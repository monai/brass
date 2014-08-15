var fs = require('fs');
var ejs = require('ejs');
var path = require('path');
var async = require('async');

module.exports = {
    extend: extend,
    unwrapFileList: unwrapFileList,
    readAsset: readAsset,
    renderAssetFile: renderAssetFile
};

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

function unwrapFileList(obj, defaultName) {
    var out = [];
    if (typeof obj === 'string') {
        out.push({ name: defaultName, target: obj });
    } else {
        for (var i in obj) if (obj.hasOwnProperty) {
            out.push({ name: i, target: obj[i] });
        }
    }
    return out;
}

function readAsset(filepath, callback) {
    var basepath;
    
    basepath = path.join(__dirname, '../assets');
    filepath = path.join(basepath, filepath);
    
    fs.readFile(filepath, 'utf8', callback);
}

function renderAssetFile(filepath, dest, locals, callback) {
    var content;
    
    async.series([
        function (callback) {
            readAsset(filepath, callback);
        }, function (callback) {
            try {
                content = ejs.render(content, locals);
                callback(null);
            } catch (error) {
                callback(error);
            }
        }, function (callback) {
            fs.writeFile(dest, content, callback);
        }
    ], callback);
}
