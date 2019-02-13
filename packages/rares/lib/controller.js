const _ = require('lodash');
const Response = require('./response');

module.exports = class RaresController {

  constructor(fields) {
    _.assign(this, fields);
  }

  // @SECTION: internals

  static $extend(mixin) {
    Object.assign(this.prototype, mixin);
  }

  static $extendStatic(mixin) {
    Object.assign(this, mixin);
  }

  static $setup() {
    this.$callbacks = [];
    this.$rescues = [];
  }

  static $doSetup() {
    if (this.$wasSetup) {
      // @NOTE: this is an ok situation, nothing special to do here
      return;
    }

    const chain = [this];

    for (let i = 0; i < chain.length; i++) {
      const entry = Object.getPrototypeOf(chain[i]);
      if (entry) {
        chain.push(entry);
      }
    }

    for (const entry of chain.reverse()) {
      if (entry.$setup) {
        entry.$setup.call(this);
      }
    }

    this.$wasSetup = true;
  }

  static $makeCallbackOpts(type, ...args) {
    let opts;

    if (args.length === 1) {
      opts = _.isPlainObject(args[0]) ? _.extend(null, args[0]) : { handler: args[0] };
    }
    else if (args.length === 2) {
      opts = _.extend(null, args[1], { handler: args[0] });
    }

    else {
      console.error(`Unexpected situation, a '${type}' hook from controller '${this.$controller}' has ${args.length} arguments (expected 1 or 2)`);
      return;
    }

    if (opts.args == null) {
      opts.args = [];
    }

    return opts;
  }

  static $aroundAction(...args) {
    this.$callbacks.push({ type: 'around', opts: this.$makeCallbackOpts('around', ...args) });
  }

  static $beforeAction(...args) {
    this.$callbacks.push({ type: 'before', opts: this.$makeCallbackOpts('before', ...args) });
  }

  static $afterAction(...args) {
    this.$callbacks.push({ type: 'after', opts: this.$makeCallbackOpts('after', ...args) });
  }

  static $rescueFrom(...args) {
    this.$rescues.push({ opts: this.$makeCallbackOpts('rescue', ...args) });
  }

  $getBoundHandler(handler) {
    return _.isFunction(handler) ? handler.bind(this) : this[handler].bind(this);
  }

  async $runCallbacks(queue) {
    const front = queue.slice();
    const back = [];
    let result;
    let runAction = true;

    let callback;
    while (callback = front.shift()) {
      const only = _.castArray(_.get(callback.opts, 'only', []));
      if (!_.isEmpty(only) && !_.includes(only, this.$action)) continue;

      const except = _.castArray(_.get(callback.opts, 'except', []));
      if (!_.isEmpty(except) && _.includes(except, this.$action)) continue;

      if (callback.type === 'before') {
        const handler = this.$getBoundHandler(callback.opts.handler);
        await handler(...callback.opts.args);
      }

      else if (callback.type === 'after') {
        back.push(callback);
      }

      else if (callback.type === 'around') {
        const handler = this.$getBoundHandler(callback.opts.handler);

        runAction = false;
        result = await handler(async () => {
          return await this.$runCallbacks(front);
        }, ...callback.opts.args);

        break;
      }

      else {
        throw new Error('Unexpected callback type: ' + callback.type);
      }
    }

    if (runAction && front.length === 0) {
      const actionFn = this[this.$action];
      if (!actionFn) {
        throw new Error(`No action '${this.$action}' present on controller '${this.$controller}'`);
      }
      result = await actionFn.call(this);
    }

    for (const callback of back.reverse()) {
      const handler = this.$getBoundHandler(callback.opts.handler);
      await handler(...callback.opts.args);
    }

    return result;

  }

  async $runRescue(queue, err) {
    let currentErr = err;

    for (const callback of queue.reverse()) {
      const only = _.castArray(_.get(callback.opts, 'only', []));
      if (!_.isEmpty(only) && !_.includes(only, this.$action)) continue;

      const except = _.castArray(_.get(callback.opts, 'except', []));
      if (!_.isEmpty(except) && _.includes(except, this.$action)) continue;

      const matches = _.castArray(callback.opts.matches || []);
      let applies = _.isEmpty(matches); // @NOTE: if no matches are specified, then the hook always applies

      for (let match of matches) {
        if (applies) break;

        if (_.isString(match)) {
          try {
            match = global[match];
            applies = currentErr instanceof match;
          }
          catch (ignore) {
            continue;
          }
        }

        if (_.isFunction(match)) {
          applies = match(currentErr);
        }
      }

      if (applies) {
        const handler = this.$getBoundHandler(callback.opts.handler);
        try {
          return await handler(currentErr, ...callback.opts.args);
        }
        catch (newErr) {
          // @FIXME: original error gets lost in here
          currentErr = newErr;
        }
      }
    }

    // @NOTE: we land here if no handler was found
    throw currentErr;
  }

  async $run() {
    let response;
    try {
      response = await this.$runCallbacks(this.constructor.$callbacks);
    }
    catch (err) {
      response = await this.$runRescue(this.constructor.$rescues, err);
    }

    return this.$response(response);
  }

  $response(value, opts) {
    return new Response(value, opts);
  }

};
