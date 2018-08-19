const _ = require('lodash');

const defaultOpts = {
  status: 200,
};

module.exports = class Response {

  constructor(value, opts) {
    if (value instanceof Response) {
      this.value = value.value;
      this.opts = _.defaultsDeep(opts, value.opts, defaultOpts);
    }
    else {
      this.value = value;
      this.opts = _.defaultsDeep(opts, defaultOpts);
    }
  }

};
