const _ = require('lodash');
const serializer = require('node-serialize');
const crypto = require('crypto');


/**
 *
 * @param {Array} args - Function arguments.
 * @returns {Array} - arguments with wrapped cb
 */
const wrapCb = (args) => {
  const updateCbArgs = (data) => {
    console.log('update cb data',  data);
  };

  if(_.isFunction(_.last(args))) {
    //wrap callback
    const originalCb = _.last(args);
    args[args.length - 1] = (...cbArgs) => {
      updateCbArgs(cbArgs);
      originalCb.apply(this, cbArgs);
    };
  }
};


function wrapReturnedData(data) {
  const updatePromiseResolveArgs = (data) => {
    console.log('update promise data',  data);
  };

  if( returnedData instanceof Promise) {
    returnedData.then((...promiseArgs) => {
      updatePromiseResolveArgs(promiseArgs);
      return promiseArgs;
    })
  }
  return data
}

function mimic(args, memozaData) {
  const { returedData, cbArgs, promiseResolveArgs} = memozaData;
  if (cbArgs !== null) {
    _.last(args).apply(null, cbArgs);
  }
  if (promiseResolveArgs !== null) {
    return new Promise(res => res(promiseResolveArgs))
  }
  return returedData;
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
  const { path, mode } = config;
  const cache = new CacheFs(defaultConfig.path);

  if (fn.__memoza === undefined) {
    fn.__memoza = (...args) => {

      const cacheKey = key(args);
      wrapCb(args);

      if (cache.exists(cacheKey)) {
        return mimic(args, cache.get(cacheKey));
      }

      return wrapReturnedData(fn.apply(this, args));
    };
  }

  return fn.__memoza;
};
