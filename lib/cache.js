const _ = require('lodash');
const fsp = require('fs-promise');

module.exports = class Cache {
  constructor(config) {
    if (!_.has(config, 'path')) {
      throw new Error('Path is mandatory option');
    }
    this.path = config.path;
  }

  check() {
    return fsp.access(this.path, fsp.constants.W_OK);
  }

  cachePath(key) {
    return `${this.path}/${key}.json`;
  }

  get(key) {
    return fsp.readFile(this.cachePath(key), 'utf8')
      .then(data => JSON.parse(data));
  }

  set(key, data) {
    return fsp.writeFile(this.cachePath(key), JSON.stringify(data), 'utf8');
  }

  invalidate() {
    return fsp.emptyDir(this.path);
  }
};
