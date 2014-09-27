# brass

Build Node.js project to a native OS package.

## Installation

Install as dependency:

`npm install brass`

Install as CLI tool:

`npm install -g brass`

## How to use

### CLI

Run `brass` in your project directory where file `package.json` is located.

Run `brass -h` for usage.

### Programmatically

```js
var brass = require('brass');
var options, emitter;

options = {
  workDir: '.'
};

emitter = brass.build(options, function (error) {
    console.log('finish');
});

emitter.on('info', function (data) {
    console.log(data);
});
```

## API

### build([options], [callback])

- `options Object` - an optional object that supersedes options from `package.json`.
- `callback(error) Function` - an optional callback function to run once package building have completed.

## Options

Options are read from several locations and merged key-wise in particular order:

1. Standard package.json [properties](https://www.npmjs.org/doc/files/package.json.html) (`pkg`).
2. Object `brass` in package.json file.
3. `options` argument in API function or CLI overrides.

### Example

For given package.json file

```json
{
  "name": "theapp",
  "version": "0.0.0",
  "brass": {
    "name": "myapp"
  }
}
```

and API call

```js
brass.build({ version: "0.0.1" });
```

final options object would be:

```js
{
  name: "myapp",
  version: "0.0.1"
}
```

### Properties

Required:

- `type` (default: rpm) - package type. For now only RPM is supported.
- `name` (default: `pkg.name`) - package name.
- `version` (default: `pkg.version`) - package version.
- `package` (default: `process.cwd()`) - path to npm package to build.
- `workDir` (default: `os.tmpdir()`) - work directory for temporary and build files.
- `summary` (default: 'Node.js module '+ `pkg.name`) - short description.
- `description` (default: `pkg.description`) - long description.
- `release` (default: 1) - release number.
- `group` (default: 'Applications/Internet') - RPM group ([valid groups](https://fedoraproject.org/wiki/RPMGroups)).
- `license` (default: `pkg.license`) - license.
- `prefix` (default: '/usr') - install prefix.

Binaries and service:

- `bin` (default: `pkg.bin`) - [map of command names](https://www.npmjs.org/doc/files/package.json.html#bin) to local filenames that will be symlinked into `prefix/bin`.
- `service` (default: none) - system service description.
  - `service.type` - valid type: (systemd, sysv).
  - `service.name` - command name that will be placed into `prefix/sbin`.
  - `service.target` - local filename that the command will be linking to.
  - `service.user`- run process as another user.

File mapping:

- `files` - an array of glob patterns to copy matched files into `prefix/lib/name` directory
  - more info about [glob patterns](https://www.npmjs.org/package/glob)
- files can be mapped outside of `prefix/lib/name` directory:
  - `files[].taret` - target directory to copy files into.
  - `files[].files` - glob pattern.
  - `files[].cwd` - directory to start [globbing from](https://github.com/isaacs/node-glob#options).

Optional RPM [properties](http://www.rpm.org/max-rpm/s1-rpm-build-creating-spec-file.html):

- `url` (default: empty) - documentation URL.
- `distribution` (default: empty) - usually Linux distribution name.
- `vendor` (default: `pkg.author`) - organization that distributes the software.
- `packager` (default: empty) - organization that actually packaged the software.

## License

ISC
