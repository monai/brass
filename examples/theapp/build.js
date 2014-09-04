var brass = require('../../');

var emitter = brass(function (error) {
    console.log('finish');
});

emitter.on('info', function (data) {
    console.log(data);
});
