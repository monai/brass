# packager

Build Node.js project to a native OS package.

## Installation

Install as dependency:

`npm install packager`

Install as CLI tool:

`npm install -g packager`

## How to use

### CLI

Run `packager` in directory where file `package.json` is located.

Run `packager -h` for usage.

### Programmatically

```js
var packager = require('packager');
var options, emitter;

options = {
  workDir: '.'
};

emitter = packager(options, function (error) {
    console.log('finish');
});

emitter.on('info', function (data) {
    console.log(data);
});
```

## API

### packager(options, callback)

- `options Object` - an optional object that supersedes options from `package.json`.
- `callback(error) Function` - an optional callback function to run once package building have completed.

## Options

Options are merged key-wise and they order is:

- main `package.json` object (`pkg`)
- `pkg.packager`
- function argument or CLI command properties.

### Properties

- `package` (default: `process.cwd()`) - package to build location.
- `workDir` (default: `os.tmpdir()`) - work directory.
- `summary` (default: 'Node.js module '+ `pkg.name`) - package summary.
- `release` (default: 1) - package release number.
- `group` (default: 'Applications/Internet').
- `prefix` (default: '/usr').

## License

ISC
