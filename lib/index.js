const _ = require('lodash');
const crypto = require('crypto');
const Cache = require('./cache');


/**
 *
 * @param {Array} args - Function arguments.
 * @returns Promise - arguments with wrapped cb
 */
const wrapReal = (fn, args, cb) => {
  const memozaData = {
    cbArgs: {},
    promiseResolveArg: {}
  };
  const updateCbArgs = (data) => { memozaData.cbArgs = data; };
  const updatePromiseResoleArg = (data) => { memozaData.promiseResolveArg = data; };

  const fnCbPromise = new Promise((resolve) => {
    if(_.isFunction(_.last(args))) {
      const originalCb = _.last(args);
      args[args.length - 1] = (...cbArgs) => {
        updateCbArgs(cbArgs);
        originalCb.apply(this, cbArgs);
        resolve();
      };
    } else {
      resolve();
    }
  });

  const fnResultPromise = new Promise((resolve, reject) => {
    const originalResult = fn.apply(null, args);
    if ( originalResult instanceof Promise) {
      resolve(originalResult);
    }
    reject(originalResult);
  }).then((fnResolvedData) => {
    updatePromiseResoleArg(fnResolvedData);
    return new Promise((resolve) => { resolve(fnResolvedData)});
  }, (result) => {
    return result;
  });


  Promise.all([fnResultPromise, fnCbPromise])
    .then(() => {
      cb(memozaData)
    });
  return fnResultPromise;
};

function mimic(args, memozaData) {
  const { cbArgs, promiseResolveArg} = memozaData;
  if (cbArgs !== null && _.isFunction(_.last(args))) {
    _.last(args).apply(null, cbArgs);
  }
  return new Promise(res => res(promiseResolveArg))
}


const key = (args) => {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(args))
    .digest('hex');
};

module.exports = config => (fn, opts = {}) => {
  let defaultConfig = {
    path: 'fixtures/',
    mode: 'cache',
  };
  _.assign(defaultConfig, config);
  const cache = new Cache(defaultConfig);

  if (fn.__memoza === undefined) {
    fn.__memoza = (...args) => {

      const cacheKey = key(args);
      return cache.get(cacheKey)
        .then(data => {
          return mimic(args, data);
        }, () => {
          return wrapReal(fn, args, (memozaData) => {
            cache.set(cacheKey, memozaData);
          });
        });
    };
  }
  return fn.__memoza;
};
