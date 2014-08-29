var packager = require('../../');

var emitter = packager(function (error) {
    console.log('finish');
});

emitter.on('info', function (data) {
    console.log(data);
});
