const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const lib = require('../lib');

describe.only('lib', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should', () => {
    const config = {
      path: __dirname+'/fixtures'
    };
    const memoza = lib(config);

    const f = memoza((a,b,cb) => {
      setTimeout(() => cb(a-b,a,b), 2000);

      return new Promise(res => {
        setTimeout(() => res(a+b), 3000);
      });
    });
    let cbResolver;
    const cbPromise = new Promise((resolver) => {
      cbResolver = resolver;
    });

    const funcPromise = f(5, 8, (diff, a, b) => {
      console.log('diff, a, b', diff, a, b);
      assert.equal(diff, -3);
      assert.equal(a, 5);
      assert.equal(b, 8);
      cbResolver();
    }).then((sum) => {
      console.log('sum', sum);
      assert.equal(sum, 13);
      console.log('sum', sum);
    });

    return Promise.all([funcPromise, cbPromise]);

  });
});
