const _ = require('lodash');
const cbw = require('cbw');
const fsp = require('fs-promise');

module.exports = class Cache {
  constructor (config) {
    if(!_.has(config, 'path')) {
      throw new Error('Path is mandatory option');
    }
    this.path = config.path;
  }

  check() {
    return new fsp.access(this.path, fs.constants.W_OK);
  }

  cachePath(key) {
    return `${this.path}/${key}.json`;
  }

  get (key) {
    return fsp.readFile(this.cachePath(key), 'utf8')
      .then(data => JSON.parse(data));
  }

  set (key, data) {
    console.log(`setting ${key}`);
    return fsp.writeFile(this.cachePath(key), JSON.stringify(data) , 'utf8');
  }
};
