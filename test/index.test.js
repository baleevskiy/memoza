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

  it('should', (done) => {
    const config = {
      path: __dirname+'/fixtures'
    };
    const memoza = lib(config);

    const f = memoza((a,b,cb) => {
      cb(a-b);
      return new Promise(res => {
        setTimeout(() => res(a+b), 3000);
      });
    });
    let cbResolver;
    const cbPromise = new Promise((resolver) => {
      cbResolver = resolver;
    });

    const funcPromise = f(5,8, (diff) => {
      console.log('diff', diff)
      assert.equal(diff, -3);
      cbResolver();
    }).then((sum) => {
      console.log('sum', sum);
      assert.equal(sum, 13);
      console.log('sum', sum);
    });

    Promise.all([funcPromise, cbPromise]).then(() => {
      done();
    });

  });
});
