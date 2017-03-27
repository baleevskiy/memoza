const assert = require('assert');
const fsp = require('fs-promise');
const sinon = require('sinon');
const cache = require('../lib/cache');
const lib = require('../lib');

describe.only('lib', () => {
  let sandbox;
  const fixturesDirectory = `${__dirname}/fixtures`;

  const memoza = lib({ path: fixturesDirectory });

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(() => fsp.emptyDir(fixturesDirectory));

  it('should call function', () => {
    const cacheKeyFilename = `${fixturesDirectory}/test2.json`;
    sandbox.stub(cache.prototype, 'cachePath').returns(cacheKeyFilename);
    const functionSpy = sandbox.spy();
    const promiseSpy = sandbox.spy();

    const wrappedFunction = memoza((aa, bb, cb) => {
      functionSpy(aa, bb);
      setTimeout(() => cb(aa - bb, aa, bb), 20);
      return new Promise((res) => {
        promiseSpy(aa, bb);
        setTimeout(() => res(aa + bb), 30);
      });
    });
    let cbResolver;
    const cbPromise = new Promise((resolver) => {
      cbResolver = resolver;
    });

    const funcPromise = wrappedFunction(5, 8, (diff, aa, bb) => {
      assert.deepEqual([diff, aa, bb], [-3, 5, 8]);
    }).then((sum) => {
      assert.equal(sum, 13);
      // call the function again to check whether we do not call function anymore
      return wrappedFunction(5, 8, (diff, aa, bb) => {
        assert.deepEqual([diff, aa, bb], [-3, 5, 8]);
        cbResolver();
      }).then((sum2) => {
        assert.equal(sum2, 13);
      });
    });

    return Promise.all([funcPromise, cbPromise]).then(() => {
      assert(functionSpy.calledOnce);
      assert(promiseSpy.calledOnce);
    });
  });


  it('should not call set cache before all promises get resolved', () => {

  });
});
