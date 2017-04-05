const _ = require('lodash');
const crypto = require('crypto');
const Cache = require('./cache');

let contexts = [];
const memCache = {};
let recordings = 0;
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
    promise: null,
    promiseArg: null,
    funcReturn: null,
  };
  recordings += 1;
  const updateCbArgs = (data) => { memozaData.cbArgs = data; };
  const updatePromiseResoleArg = (data) => { memozaData.promise = 'resolve'; memozaData.promiseArg = data; };
  const updatePromiseRejectArg = (data) => { memozaData.promise = 'reject'; memozaData.promiseArg = data; };
  const updateFuncReturn = (data) => { memozaData.funcReturn = data; return data; };

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
  const originalResult = fn(...args);

  const fnResultPromise = new Promise((resolve) => {
    if (originalResult instanceof Promise) {
      originalResult
        .then(updatePromiseResoleArg)
        .catch(updatePromiseRejectArg)
        .then(resolve);
    } else {
      updateFuncReturn(originalResult);
      resolve();
    }
  });

  const completionPromise = Promise.all([fnResultPromise, fnCbPromise])
    .then(() => {
      recordings -= 1;
      return cb(memozaData);
    })
    .then(() => originalResult);

  if (originalResult instanceof Promise) {
    return completionPromise;
  }
  return originalResult;
};

function mimic(args, memozaData) {
  const { cbArgs, promise, promiseArg, funcReturn } = memozaData;
  if (cbArgs !== null && _.isFunction(_.last(args))) {
    _.last(args)(...cbArgs);
  }
  if (promise) {
    return Promise[promise](promiseArg);
  }
  return funcReturn;
}


const key = args => crypto
    .createHash('md5')
    .update(JSON.stringify(args))
    .digest('hex');

const setContext = context => contexts.push(_.kebabCase(context)) - 1;
const getContext = () => {
  const path = _.join(contexts, '::');
  return path ? `${path}::` : '';
};

const unsetContext = (ctx) => {
  if (ctx === undefined) {
    return;
  }
  if (_.isString(ctx)) {
    ctx = _.indexOf(contexts, _.kebabCase(ctx)); // eslint-disable-line no-param-reassign
  }
  if (ctx < 0) {
    return;
  }
  contexts = _.take(contexts, ctx);
};

module.exports = config => (fn, prefix = '') => {
  const defaultConfig = {
    path: 'fixtures/',
    mode: 'cache',
  };
  _.assign(defaultConfig, config);

  const cache = new Cache(_.get(config, 'cache', defaultConfig));

  if (fn.__memoza === undefined) {
    fn.invalidate_cache = () =>  // eslint-disable-line no-param-reassign
       cache.keys()
        .then(items => Promise.all(_.map(items, item => cache.set(item, null))));

    fn.__memoza = (...args) => { // eslint-disable-line no-param-reassign
      const cacheKey = `${getContext()}${prefix}-${key(args)}`;

      const data = cache.get(cacheKey);
      if (data === null) {
        return wrapReal(fn, args, memozaData => cache.set(cacheKey, memozaData));
      }
      return mimic(args, data);
    };
    fn.__memoza.invalidate_cache = fn.invalidate_cache; // eslint-disable-line no-param-reassign
  }
  return fn.__memoza;
};

module.exports.setContext = setContext;
module.exports.unsetContext = unsetContext;
module.exports.getContext = getContext;
module.exports.isRecording = () => recordings !== 0;
