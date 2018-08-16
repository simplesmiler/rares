const _ = require('lodash');
const Boom = require('boom');
const inflect = require('inflect');

module.exports = class Controller {

  constructor(fields) {
    _.assign(this, fields);
  }

  // @SECTION: internals

  static $setup() {
    this.$callbacks = [];
    this.$rescues = [];
  }

  static $doSetup() {
    if (this.$wasSetup) {
      // @NOTE: this is an ok situation, nothing special to do here
      return;
    }

    let chain = [this];

    for (let i = 0; i < chain.length; i++) {
      let entry = Object.getPrototypeOf(chain[i]);
      if (entry) {
        chain.push(entry);
      }
    }

    for (let entry of chain.reverse()) {
      if (entry.$setup) {
        entry.$setup.call(this);
      }
    }

    this.$wasSetup = true;
  }

  static $makeCallbackOpts(type, ...args) {
    let opts;

    if (args.length == 1) {
      opts = _.isPlainObject(args[0]) ? _.extend(null, args[0]) : { handler: args[0] };
    }
    else if (args.length == 2) {
      opts = _.extend(null, args[1], { handler: args[0] });
    }

    else {
      console.error(`Unexpected situation, a '${type}' hook from controller '${this.$controller}' has ${args.length} arguments (expected 1 or 2)`)
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
    let front = queue.slice();
    let back = [];
    let result;
    let runAction = true;

    let callback;
    while (callback = front.shift()) {
      let only = _.castArray(_.get(callback.opts, 'only', []));
      if (!_.isEmpty(only) && !_.includes(only, this.$action)) continue;

      let except = _.castArray(_.get(callback.opts, 'except', []));
      if (!_.isEmpty(except) && _.includes(except, this.$action)) continue;

      if (callback.type == 'before') {
        let handler = this.$getBoundHandler(callback.opts.handler);
        await handler(...callback.opts.args);
      }

      else if (callback.type == 'after') {
        back.push(callback);
      }

      else if (callback.type == 'around') {
        let handler = this.$getBoundHandler(callback.opts.handler);

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

    if (runAction && front.length == 0) {
      let actionFn = this[this.$action];
      if (!actionFn) {
        throw new Error(`No action '${this.$action}' present on controller '${this.$controller}'`);
      }
      result = await actionFn.call(this);
    }

    for (let callback of back.reverse()) {
      let handler = this.$getBoundHandler(callback.opts.handler);
      await handler(...callback.opts.args);
    }

    return result;

  }

  async $runRescue(queue, err) {
    let currentErr = err;

    for (let callback of queue.reverse()) {
      let only = _.castArray(_.get(callback.opts, 'only', []));
      if (!_.isEmpty(only) && !_.includes(only, this.$action)) continue;

      let except = _.castArray(_.get(callback.opts, 'except', []));
      if (!_.isEmpty(except) && _.includes(except, this.$action)) continue;

      let matches = _.castArray(callback.opts.matches || []);
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
        let handler = this.$getBoundHandler(callback.opts.handler);
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
    try {
      return await this.$runCallbacks(this.constructor.$callbacks);
    }
    catch (err) {
      return await this.$runRescue(this.constructor.$rescues, err);
    }
  }

  // @SECTION: session

  async $store(key, value) {
    throw new Error('Controller method $store should have been overwritten, but was not');
  }

  async $load(key) {
    throw new Error('Controller method $load should have been overwritten, but was not');
  }

  async $clear(key) {
    throw new Error('Controller method $clear should have been overwritten, but was not');
  }

  // @SECTION: authentication

  async $signIn(id) {
    await this.$store('auth', id);
    await this.$authenticate();
  }

  async $signOut() {
    await this.$clear('auth');
    await this.$deauthenticate();
  }

  async $signedAs() {
    return await this.$load('auth');
  }

  async $authenticate(hard = false) {
    let id = await this.$signedAs();
    if (hard && id == null) {
      throw Boom.unauthorized('No auth signature');
    }

    let user = await this.$app.Load(`models/user`).findByPrimary(id);
    if (hard && user == null) {
      throw Boom.unauthorized('Did not find a user with given a auth signature');
    }
    this['currentUser'] = user;

    let ability = await this.$app.Load('lib/ability').$for(user);
    this['currentAbility'] = ability;
  }

  async $deauthenticate() {
    this['currentUser'] = null;
    this['currentAbility'] = null;
  }

  // @SECTION: authorization

  async $can(action, subject) {
    if (!this.currentAbility) return false;
    return this.currentAbility.$can(action, subject, this);
  }

  async $authorize(action, subject) {
    let allowed = await this.$can(action, subject);
    if (!allowed) {
      throw Boom.forbidden('You do not have access to this resource');
    }
  }

  // @SECTION: resource

  static $resource(opts) {
    this.$aroundAction({
      async handler(fn) {
        if (opts.load) {
          await this.$loadResource();
        }

        if (opts.authorize) {
          await this.$authorizeResource();
        }

        if (opts.blueprint) {
          if (this[this.$action]) {
            throw new Error(`Can not blueprint action '${this.$action}' on controller '${this.$controller}' because it already exists`);
          }
          return await this.$blueprintResource();
        }
        else {
          return await fn();
        }
      },
    });
  }

  async $loadResource() {
    let Model = this.$app.Load('models/' + this.$model);

    // @TODO: support singleton resource
    // @TODO: support through

    // @REFERENCE: https://github.com/ryanb/cancan/wiki/authorizing-controller-actions

    let loadCollection = ['index'].includes(this.$action); // @TODO: add case for `on: 'collection'`
    let loadNew = ['new', 'create'].includes(this.$action);
    let loadMember = ['show', 'edit', 'update', 'destroy'].includes(this.$action); // @TODO: add case for `on: 'member'`

    let singular = this.$model;
    let plural = inflect.pluralize(this.$model);

    if (loadCollection) {
      this[plural] = await Model.all();
    }
    else if (loadNew) {
      this[singular] = await Model.build(this.$params[singular]);
    }
    else if (loadMember) {
      // @NOTE: DELETE is supposed to be idempotent,
      //        but that doesn't mean that we have to return the same result,
      //        just that further DELETE does not change the state
      this[singular] = await Model.findByPrimary(this.$params[singular + 'Id'], { rejectOnEmpty: true });
    }
    else {
      throw new Error(`Can not load resource for action '${this.$action}' on controller '${this.$controller}'`);
    }
  }

  async $authorizeResource() {
    let create = ['new', 'create'].includes(this.$action);
    let read = ['index', 'show'].includes(this.$action);
    let update = ['edit', 'update'].includes(this.$action);
    let destroy = ['destroy'].includes(this.$action);

    let plural = ['index'].includes(this.$action);
    let singular = ['new', 'create', 'show', 'edit', 'update', 'destroy'].includes(this.$action);

    let action = create && 'create'
      || read && 'read'
      || update && 'update'
      || destroy && 'destroy'
      || null;

    let subject = singular && this[this.$model]
      || plural && this.$app.Load(`models/${this.$model}`)
      || null;

    if (!action || !subject) {
      throw new Error(`Can not authorize resource for action '${this.$action}' on controller '${this.$controller}'`);
    }

    await this.$authorize(action, subject);
  }

  async $blueprintResource() {
    let singular = this.$model;
    let plural = inflect.pluralize(this.$model);

    // @TODO: add status codes to blueprinted actions

    if (this.$action == 'index') {
      return { [plural]: this[plural] };
    }
    else if (this.$action == 'new') {
      return { [singular]: this[singular] };
    }
    else if (this.$action == 'create') {
      await this[singular].save();
      return { [singular]: this[singular] };
    }
    else if (this.$action == 'show') {
      return { [singular]: this[singular] };
    }
    else if (this.$action == 'edit') {
      return { [singular]: this[singular] };
    }
    else if (this.$action == 'update') {
      await this[singular].update(this.$params[singular]);
      return { [singular]: this[singular] };
    }
    else if (this.$action == 'destroy') {
      await this[singular].destroy();
      return null;
    }
    else {
      throw new Error(`Can not blueprint action '${this.$action}' on controller '${this.$controller}'`);
    }
  }

};
