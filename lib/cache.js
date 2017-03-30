const _ = require('lodash');
const fsp = require('fs-promise');
const fse = require('fs-extra');

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
    try {
      return fse.readJsonSync(this.cachePath(key));
    } catch (error) {
      return null;
    }
  }

  set(key, data) {
    if (data == null) {
      return fsp.remove(this.cachePath(key));
    }
    return fsp.outputJson(this.cachePath(key), data);
  }

  keys() {
    return fsp.readdir(this.path)
      .then(list => _.map(_.filter(list, item => _.endsWith(item, 'json')), item => item.replace(/\.[^/.]+$/, '')));
  }
};
