'use strict';

var fs = require('graceful-fs');
var dz = require('dezalgo');
var ld = require('lodash');
var ejs = require('ejs');
var path = require('path');
var util = require('util');
var async = require('async');
var moment = require('moment');

module.exports = {
    extend: extend,
    unwrapFileList: unwrapFileList,
    readAsset: readAsset,
    renderAssetFile: renderAssetFile,
    filterEmptyDirs: filterEmptyDirs,
    renderFileList: renderFileList,
    makeBinSymlink: makeBinSymlink,
    createQueue: createQueue
};

ejs.filters.toRFCString = toRFCString;

function extend(target) {
    for (var i, k = 0; ++k < arguments.length;) {
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
    async.waterfall([
        function (callback) {
            readAsset(filepath, callback);
        }, function (content, callback) {
            try {
                content = ejs.render(content, locals);
                dz(callback)(null, content);
            } catch (error) {
                dz(callback)(error);
            }
        }, function (content, callback) {
            fs.writeFile(dest, content, callback);
        }
    ], dz(callback));
}

function filterEmptyDirs(files) {
    var dirs, emptyDirs, match;
    
    dirs = files.filter(function (file) {
        return file[file.length - 1] === '/';
    });
    
    emptyDirs = [];
    for (var i = 0; i < dirs.length; i++) {
        for (var j = 0; j < files.length; j++) {
            match = files[j].match(new RegExp('^'+ dirs[i] +'.+(?!/)$'));
            match = match && match.length && match[0];
            match = match && dirs[i];
            
            if (match && ! ~emptyDirs.indexOf(match)) {
                emptyDirs.push(match);
                break;
            }
        }
    }
    emptyDirs = ld.difference(dirs, emptyDirs);
    files = ld.difference(files, emptyDirs);
    
    return files;
}

function renderFileList(files) {
    var out, f, attr;
    
    out = files.map(function (file) {
        if (ld.isPlainObject(file)) {
            f = [];
            if (file.type === 'config') {
                f.push('%config'+ (file.noreplace ? '(noreplace)' : ''));
            }
            if (file.attr) {
                attr = file.attr;
                attr = attr.map(function (i) { return i || '-'; });
                attr = util.format.apply(null, ld.union([ '%attr(%s, %s, %s)' ], attr));
                f.push(attr);
            }
            f.push(file.filename);
            
            return f.join(' ');
        } else {
            return file;
        }
    });
    
    return out.join('\n');
}

function toRFCString(date) {
    return moment(date).format('ddd, DD MMM YYYY HH:mm:ss ZZ');
}

function makeBinSymlink(emitter, options, base, fileMap, callback) {
    var name, target;
    name = path.join(base, fileMap.name);
    target = path.join(path.relative(base, options.installDir), fileMap.target);
    emitter.verbose('Creating symlink: '+ name +' to: '+ target);
    fs.symlink(target, name, function (error) {
        if (error) return dz(callback)(error);
        fs.chmod(name, '755', callback);
    });
}

function createQueue(queue, emitter, options) {
    return queue.map(function (f) {
        return function (callback) {
            f.call(null, emitter, options, dz(callback));
        };
    });
}
