const _ = require('lodash');
const serializer = require('node-serialize');
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
  const updateCbArgs = (data) => {
    memozaData.cbArgs = data;
  };

  const updatePromiseResoleArg = (data) => {
    memozaData.promiseResolveArg = data;
    console.log('update updatePromiseResoleArg',  data);
  };

  const fnCbPromise = new Promise((resolve) => {
    if(_.isFunction(_.last(args))) {
      //wrap callback
      console.log('last parameter is FUNCTION')
      const originalCb = _.last(args);
      args[args.length - 1] = (...cbArgs) => {
        updateCbArgs(cbArgs);
        originalCb.apply(this, cbArgs);
        resolve();
      };
    } else {
      console.log('last parameter is NOT a FUNCTION')
      resolve()
    }
  });

  const fnResultPromise = new Promise((resolve) => {
    console.log('fnResultPromise ');
    const originalResult = fn.apply(null, args);
    console.log('fnResultPromise result', originalResult);
    if ( originalResult instanceof Promise) {
      resolve(originalResult);
    }
    reject(originalResult);
  }).then((fnResolvedData) => {
    console.log('pre updatePromiseResoleArg(fnResolvedData)')
    updatePromiseResoleArg(fnResolvedData);
    return new Promise((resolve) => { resolve(fnResolvedData)});
  }, (result) => {
    return result;
  });


  Promise.all([fnResultPromise, fnCbPromise])
    .then(() => {
      console.log('ALL resolved)');
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
  return crypto.createHash('md5').update(serialize(args)).digest('hex');
};

const serialize = (args) => {
  return serializer.serialize(args);
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
          console.log('found cache', data);
          return mimic(args, data);
        }, () => {
          console.log('NOT found cache');
          return wrapReal(fn, args, (memozaData) => {
            cache.set(cacheKey, memozaData);
          });
        });
    };
  }

  return fn.__memoza;
};
