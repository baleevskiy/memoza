const assert = require('assert');
const fsp = require('fs-promise');
const rimraf = require('rimraf');
const sinon = require('sinon');
const Cache = require('../lib/cache');

describe('cache', () => {
  const fixturesDirectory = `${__dirname}/fixtures`;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  after((done) => rimraf(`${fixturesDirectory}/*.json`, done));

  it('should reject on bad dirname', () => new Cache({ path: `${__dirname}/bad` })
      .check()
      .catch((err) => {
        assert(err.message.includes('no such file or directory'));
      }));

  it('should resolve on good dirname', () => new Cache({ path: fixturesDirectory }).check());

  it('should give proper cachePath', () => {
    assert.equal(new Cache({ path: fixturesDirectory }).cachePath('test'), `${fixturesDirectory}/test.json`);
  });

  it('should set and get', () => {
    const cacheKey = 'some_file';
    const sampleData = { data: 'data', foo: [1, 2, 3] };
    const cache = new Cache({ path: fixturesDirectory });
    return cache
      .set(cacheKey, sampleData)
      .then(() => cache.get(cacheKey))
      .then((object) => {
        assert.deepEqual(object, sampleData);
        return fsp.remove(cache.cachePath(cacheKey));
      });
  });

  it('should call readdir on keys', () => {
    sandbox.spy(fsp, 'readdir');
    const cache = new Cache({ path: 'test/fixtures' });
    return cache
      .set('test', {})
      .then(() => cache.keys()
        .then(() => {
          assert(fsp.readdir.calledOnce);
        })
      );
  });

  it('should call readdir on keys', () => {
    sandbox.spy(fsp, 'remove');
    return new Cache({ path: 'test/fixtures' })
      .set('asd', null)
      .then(() => {
        assert(fsp.remove.calledOnce);
      });
  });

  it('should throw an exception if path not peovided', () => {
    assert.throws(() => new Cache({}));
  });
});
