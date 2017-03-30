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

  it('should set promise resolved to memozaData', () => {
    const sp = sandbox.spy(cache.prototype, 'set');
    const memozedFunction = memoza(() => Promise.resolve(1));
    return memozedFunction('test').then(() => {
      assert(sp.calledOnce);
      assert.deepEqual(sp.getCalls()[0].args[1], {
        cbArgs: null,
        promise: 'resolve',
        promiseArg: 1,
        funcReturn: null,
      });
    });
  });

  it('should set promise rejected to memozaData', () => {
    const sp = sandbox.spy(cache.prototype, 'set');
    const memozedFunction = memoza(() => Promise.reject(1));
    return memozedFunction('test-CATCH').catch(() => {
      assert(sp.calledOnce);
      assert.deepEqual(sp.getCalls()[0].args[1], {
        cbArgs: null,
        promise: 'reject',
        promiseArg: 1,
        funcReturn: null,
      });
    });
  });

  it('should cache sync functions without cb', (done) => {
    const functionSpy = sandbox.spy();
    const memozedFunction = memoza((data) => { functionSpy(data); return data; });
    _.times(10, () => assert.equal(memozedFunction('foo'), 'foo'));

    setTimeout(() => {
      assert.equal(memozedFunction('foo'), 'foo');
      assert.equal(functionSpy.callCount, 1);
      done();
    }, 10);
  });

  it('should return the same promise when first is Pending', () => {
    let resolver;
    const memozedFunction = memoza(() => new Promise((res) => { resolver = res; }));
    assert.equal(memozedFunction('p1'), memozedFunction('p1'));
    resolver();
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

  it('should get, set, remove, and clear contexts', () => {
    assert.equal(lib.getContext(), '');
    lib.setContext('one');
    lib.setContext('two');
    lib.setContext('context three');
    assert.equal(lib.getContext(), 'one::two::context-three::');
    lib.removeContext();
    assert.equal(lib.getContext(), 'one::two::');
    lib.clearContext();
    assert.equal(lib.getContext(), '');
  });

  it('should return isRecording true when recording', (done) => {
    // reject mean we do not have it in cache and need to start recording
    sandbox.stub(cache.prototype, 'get').returns(null);
    assert.equal(lib.isRecording(), false);
    // create a function which returns a promise which never gets resolved
    // so we'll remain in recording state
    memoza(() => new Promise(() => {}))();
    setTimeout(() => {
      assert(lib.isRecording());
      done();
    }, 1);
  });
});
