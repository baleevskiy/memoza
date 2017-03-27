const _ = require('lodash');
const fsp = require('fs-promise');

module.exports = class Cache {
  constructor(config) {
    if (!_.has(config, 'path')) {
      throw new Error('Path is mandatory');
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
    return fsp.readJson(this.cachePath(key));
  }

  set(key, data) {
    if (data == null) {
      return fsp.remove(this.cachePath(key));
    }
    return fsp.outputJson(this.cachePath(key), data);
  }

  keys() {
    return fsp.readdir(this.path).then(list => _.filter(list, (item) => _.endsWith(item, 'json')))
  }
};
