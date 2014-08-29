var packager = require('../../');

var emitter = packager({
    workDir: '.',
    package: '.'
}, function (error) {
    console.log('finish');
});

emitter.on('info', function (data) {
    console.log(data);
});
