const cbw = require('cbw');
const fs = require('fs');
const fsp = require('fs-promise;');
const serializer = require('node-serialize');

module.exports = class Cache {
  constructor (config) {
    this.path = config.path;
  }

  check() {
    return new Promise((resolve, reject) => {
      fs.access(this.path, fs.constants.W_OK, cbw(reject)(resolve));
    });
  }

  cachePath(key) {
    return `${this.path}/${key}.json`;
  }

  get (key) {
    return fsp.readFile(this.cachePath(key), 'utf8')
      .then(data => serializer.unserialize(data));
  }

  set (key, data) {
    return fsp.writeFile(this.cachePath(key), serializer.serialize(data) , 'utf8');
  }

};
