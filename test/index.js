const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const lib = require('../lib');

describe('lib', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should', () => {
    const config = {};
    const memoza = lib(config);

    const f = memoza((a,b,c) => { return a+b+c;});
    f();
    f();
    //
    // const func = sandbox.spy();
    // const memoizedFunc = memoza(func);
    // _.times(10, memoizedFunc);
    // func

  });
});
