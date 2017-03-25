const _ = require('lodash');
const assert = require('assert');
const fsp = require('fs-promise');
const fs = require('fs');
const Cache = require('../lib/cache');

describe('cache', () => {
  let writableDirname;

  before((done) => {
    writableDirname = __dirname+'/fixtures';
    fs.mkdir(writableDirname, () => {
      fsp.writeFile(`${writableDirname}/test.json`, '{"test": 123.45"}')
        .then(() => { done() }, done);
    });
  });

  after((done) => {
    fsp.remove(`${writableDirname}/test.json`)
      .then(() => {
        fs.rmdir(writableDirname, done);
      })
  });

  it('should reject on bad dirname', (done) => {
    new Cache({path: __dirname+'/bad'})
      .check()
      .then(() => { done('should not happen');})
      .catch((err) => {
        assert(err.message.includes('no such file or directory'));
        done();
      })
      .catch(done);
  });

  it('should resolve on good dirname', (done) => {
    new Cache({path: writableDirname})
      .check()
      .then(done, done);
  });

  it('should give proper cachePath', () => {
    assert.equal(new Cache({path: writableDirname}).cachePath('test'), `${writableDirname}/test.json`);
  });

  it('should set and get', (done) => {
    const cache = new Cache({path: writableDirname})
    const cacheKey = 'some_file';
    const sampleData = {data: 'data', foo: [1, 2, 3]};
    cache.set(cacheKey, sampleData)
      .then(() => {
        return cache.get(cacheKey)
      })
      .then((object) => {
        assert.deepEqual(object, sampleData);
        return fsp.remove(cache.cachePath(cacheKey));
      })
      .then(done)
      .catch(done)
  });
});
