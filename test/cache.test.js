const assert = require('assert');
const fsp = require('fs-promise');
const Cache = require('../lib/cache');

describe('cache', () => {
  let writableDirname;

  before(() => {
    writableDirname = `${__dirname}/fixtures`;
    return fsp.writeFile(`${writableDirname}/test.json`, '{"test": 123.45"}');
  });

  after(() => fsp.emptyDir(writableDirname));

  it('should reject on bad dirname', () => new Cache({ path: `${__dirname}/bad` })
      .check()
      .catch((err) => {
        assert(err.message.includes('no such file or directory'));
      }));

  it('should resolve on good dirname', () => new Cache({ path: writableDirname }).check());

  it('should give proper cachePath', () => {
    assert.equal(new Cache({ path: writableDirname }).cachePath('test'), `${writableDirname}/test.json`);
  });

  it('should set and get', () => {
    const cacheKey = 'some_file';
    const sampleData = { data: 'data', foo: [1, 2, 3] };
    const cache = new Cache({ path: writableDirname });
    return cache
      .set(cacheKey, sampleData)
      .then(() => cache.get(cacheKey))
      .then((object) => {
        assert.deepEqual(object, sampleData);
        return fsp.remove(cache.cachePath(cacheKey));
      });
  });
});