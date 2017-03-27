const _ = require('lodash');
const assert = require('assert');
const fsp = require('fs-promise');
const sinon = require('sinon');
const cache = require('../lib/cache');
const lib = require('../lib');

describe('lib', () => {
  let sandbox;
  const fixturesDirectory = __dirname+'/fixtures';

  const memoza = lib({ path: fixturesDirectory });

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(() => {
    return fsp.emptyDir(fixturesDirectory)
  });

  it('should call function', () => {

    const cacheKeyFilename = `${fixturesDirectory}/test2.json`;
    sandbox.stub(cache.prototype, 'cachePath').returns(cacheKeyFilename);
    const functionSpy = sandbox.spy();
    const promiseSpy = sandbox.spy();

    const f = memoza((a,b,cb) => {
      functionSpy(a,b);
      setTimeout(() => cb(a-b,a,b), 20);
      return new Promise(res => {
        promiseSpy(a,b);
        setTimeout(() => res(a+b), 30);
      });
    });
    let cbResolver;
    const cbPromise = new Promise((resolver) => {
      cbResolver = resolver;
    });

    const funcPromise = f(5, 8, (diff, a, b) => {
      assert.deepEqual([diff,a ,b ], [-3, 5, 8]);
    }).then((sum) => {
      assert.equal(sum, 13);
      //call the function again to check whether we do not call function anymore
      return f(5, 8, (diff, a, b) => {
        assert.deepEqual([diff,a ,b ], [-3, 5, 8]);
        cbResolver();
      }).then((sum) => {
        assert.equal(sum, 13);
      })
    });

    return Promise.all([funcPromise, cbPromise]).then(() => {
      assert(functionSpy.calledOnce);
      assert(promiseSpy.calledOnce);
    });

  });


  it('should not call set cache before all promises get resolved', () => {

  });
});
