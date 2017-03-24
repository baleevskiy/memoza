const fs = require('fs');
const cbw = require('cbw');
const serializer = require('node-serialize');

module.exports = class Cache {
  constructor (config) {
    this.path = config.path;
    fs.stat(this.path, (err, stat) => {
      if (err !== null) {
        throw err;
      }
      if (!stat.isDirectory()) {
        throw new Error(`Path "${this.path}" is not a directory`);
      }
    });
  }

  cachePath(key) {
    return `${this.path}/${key}.json`;
  }

  get (key) {
    return new Promise((resolve, reject) => {
      fs.readFile(this.cachePath(key), 'utf8', cbw(reject)((data) => {
        resolve(serializer.unserialize(data));
      }));
    })
  }

  set (key, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.cachePath(key), serializer.serialize(data), 'utf8', cbw(reject)(resolve));
    });
  }

};
