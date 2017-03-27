const _ = require('lodash');
const crypto = require('crypto');
const Cache = require('./cache');


/**
 * Wraps function's callback and returned promise.
 *
 * @param {Function} fn - Function to wrap.
 * @param {Array} args - Function arguments.
 * @param {Function} cb - Callback.
 * @returns {Promise} - Arguments with wrapped cb.
 */
const wrapReal = (fn, args, cb) => {
  const memozaData = {
    cbArgs: null,
    promiseResolveArg: null,
  };
  const updateCbArgs = (data) => { memozaData.cbArgs = data; };
  const updatePromiseResoleArg = (data) => { memozaData.promiseResolveArg = data; };

  const fnCbPromise = new Promise((resolve) => {
    if (_.isFunction(_.last(args))) {
      const originalCb = _.last(args);
      _.set(args, args.length - 1, (...cbArgs) => {
        updateCbArgs(cbArgs);
        originalCb(...cbArgs);
        resolve();
      });
    } else {
      resolve();
    }
  });

  const fnResultPromise = new Promise((resolve, reject) => {
    const originalResult = fn(...args);
    if (originalResult instanceof Promise) {
      resolve(originalResult);
    }
    reject(originalResult);
  }).then((result) => {
    updatePromiseResoleArg(result);
    return result;
  }).catch(result => result);

  Promise.all([fnResultPromise, fnCbPromise])
    .then(() => { cb(memozaData); });
  return fnResultPromise;
};

function mimic(args, memozaData) {
  const { cbArgs, promiseResolveArg } = memozaData;
  if (cbArgs !== null && _.isFunction(_.last(args))) {
    _.last(args)(...cbArgs);
  }
  return Promise.resolve(promiseResolveArg);
}


const key = args => crypto
    .createHash('md5')
    .update(JSON.stringify(args))
    .digest('hex');

module.exports = config => (fn) => {
  const defaultConfig = {
    path: 'fixtures/',
    mode: 'cache',
  };
  _.assign(defaultConfig, config);
  const cache = new Cache(defaultConfig);

  if (fn.__memoza === undefined) {
    fn.__memoza = (...args) => { // eslint-disable-line no-param-reassign
      const cacheKey = key(args);
      return cache.get(cacheKey)
        .then(data => mimic(args, data), () => wrapReal(fn, args, (memozaData) => {
          cache.set(cacheKey, memozaData);
        }));
    };
  }
  return fn.__memoza;
};

module.exports.cache = Cache;
