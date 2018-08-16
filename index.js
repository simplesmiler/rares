const findFileUp = require('find-file-up');
const path = require('path');
const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const Sequelize = require('sequelize');

module.exports = class Tales {

  static get Controller() {
    return require('./controller');
  }

  static get Ability() {
    return require('./ability');
  }

  static get Router() {
    return require('./router');
  }

  static async create(opts, block) {
    let App = new Tales(opts);
    try {
      await App.$initialize();
      if (block) {
        if (_.isFunction(block)) {
          await block(App);
        }
        else {
          throw new Error('Block, passed to Tales.create, is not a function');
        }
      }
      return App;
    }
    catch (err) {
      await App.$destroy();
      throw err;
    }
  }

  constructor(opts) {
    this.$destroyed = false;

    this.$destroyCallbacks = [];
    this.opts = opts || {};
  }

  async $initialize() {
    // == @SECTION: figure out config file == //

    let configPath, config;
    try {
      configPath = await findFileUp('tales.config.js');
      config = require(configPath);
      if (_.isFunction(config)) {
        config = await config();
      }
    }
    catch (err) {
      console.warn(`Failed to require tales.config.js file, continuing without it`);
    }

    this.config = config = _.defaultsDeep(null, this.opts, config, {
      dir: configPath || process.cwd(),
      globals: {
        Load: true,
        App: true,
        Tales: true,
      },
    });

    // == @SECTION: figure out env == //

    this.env = _.get(this.opts, 'env', process.env.NODE_ENV || 'development');

    // == @SECTION: load secrets file == //

    let secrets;

    try {
      secrets = require(path.resolve(this.config.dir, 'config/secrets'));
    }
    catch (err) {
      console.warn(`Failed to require config/secrets.js file, continuing without it`);
    }

    if (secrets) {
      this.secrets = secrets[this.env];

      if (this.secrets == null) {
        throw new Error(`Secrets for ${this.env} are not found in the config/secrets.js file`);
      }

      if (_.isEmpty(this.secrets.secretKeyBase)) {
        console.warn(`The config/secrets.js file does not contain 'secretKeyBase' for ${this.env}, continuing without it`);
      }

      else if (this.secrets.secretKeyBase.length < 32) {
        throw new Error(`The 'secretKeyBase' for ${this.env} is too short, should be at least 32 characters`);
      }
    }

    // == @SECTION: load database file == //

    let database;

    try {
      database = require(path.resolve(this.config.dir, 'config/database'));
    }
    catch (err) {
      console.warn(`Failed to require config/database.js file, continuing without it`);
    }

    if (database) {
      this.database = database[this.env];

      if (this.database == null) {
        throw new Error(`Database config for ${this.env} is not found in the config/database.js file`);
      }
    }

    // == @SECTION: run application hook == //

    try {
      await require(path.resolve(this.config.dir, 'config/application')).call(this);
    }
    catch (err) {
      console.warn(`Failed to require config/application.js file, continuing without it`);
    }

    // == @SECTION: run environment hook == //

    try {
      await require(path.resolve(this.config.dir, 'config/environments', this.env)).call(this);
    }
    catch (err) {
      console.warn(`Failed to require config/environments/${this.env}.js file, continuing without it`);
    }

    // == @SECTION: setup loader == //

    this.Load = name => {
      return require(path.resolve(this.config.dir, 'app', name));
    };

    // == @SECTION: globals = //

    if (this.config.globals.Load) {
      let name = _.isString(this.config.globals.Load) ? this.config.globals.Load : 'Load';
      global[name] = this.Load;
    }

    if (this.config.globals.App) {
      let name = _.isString(this.config.globals.App) ? this.config.globals.App : 'App';
      global[name] = this;
    }

    if (this.config.globals.Tales) {
      let name = _.isString(this.config.globals.Tales) ? this.config.globals.Tales : 'Tales';
      global[name] = Tales;
    }

    // == @SECTION: setup models == //

    // @NOTE: for sequelize, we depend on the database config, and want to init and associate models before starting
    if (this.database) {
      this.sequelize = new Sequelize(this.database);
      this.$destroyCallbacks.push(async function () {
        await this.sequelize.close();
      });
      await require('./sequelize')(this.config.dir, this.sequelize);
    }

    // == @SECTION: routes == //

    try {
      this.routes = await require(path.resolve(this.config.dir, 'config/routes')).call(this);
    }
    catch (err) {
      throw new Error('Failed to require config/routes.js file, can not continue without it');
    }

  }

  async $destroy() {
    if (this.$destroyed) return;

    for (let callback of this.$destroyCallbacks.reverse()) {
      await callback.call(this);
    }

    this.$destroyed = true;
  }

};
