const _ = require('lodash');
const assert = require('assert');
const fsp = require('fs-promise');
const sinon = require('sinon');
const cache = require('../lib/cache');
const lib = require('../lib');

describe('lib', () => {
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

  it('should not set cbParams if we do not pass a callback', () => {
    const sp = sandbox.spy(cache.prototype, 'set');
    const memozedFunction = memoza(() => {});
    return memozedFunction('test').then(() => {
      assert(sp.calledOnce);
      assert.deepEqual(sp.getCalls()[0].args[1], { cbArgs: null, promiseResolveArg: null });
    });
  });


  it('should set promiseResolveArg if we pass a Promise', () => {
    const sp = sandbox.spy(cache.prototype, 'set');
    const memozedFunction = memoza(() => Promise.resolve(12345));
    return memozedFunction('test3').then(() => {
      assert(sp.calledOnce);
      assert.deepEqual(sp.getCalls()[0].args[1], { cbArgs: null, promiseResolveArg: 12345 });
    });
  });

  it('should call remove when invalidate cache', () => {
    const memozedFunction = memoza(info => Promise.resolve(info));
    const keys = ['foo', 'bar', 'baz'];
    sandbox.stub(cache.prototype, 'keys').callsFake(() => Promise.resolve(keys));
    const fspMock = sandbox.mock(fsp);
    _.forEach(keys, (item) => {
      fspMock.expects('remove').once().withExactArgs(`${fixturesDirectory}/${item}.json`);
    });

    return memozedFunction.invalidate_cache()
      .then(() => {
        fspMock.verify();
      });
  });

  it('should not mimic functions cb if there is no one', () => {
    const memozedFunction = memoza(() => Promise.resolve(12345));
    return memozedFunction('test4')
      .then(() => memozedFunction('test4').then((result) => {
        assert.equal(result, 12345);
      }));
  });

  it('should set __memoza attr to the function', () => {
    const func = () => {};
    memoza(func);
    memoza(func);
    assert(func.__memoza !== undefined);
  });
});
