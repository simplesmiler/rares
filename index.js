const findFileUp = require('find-file-up');
const path = require('path');
const _ = require('lodash');
const Sequelize = require('sequelize');

module.exports = class Tales {

  static get Sequelize() {
    return Sequelize;
  }

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
    const App = new Tales(opts);
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
    let whineAboutMissingConfigFile = false;
    try {
      // @TODO: support json file
      configPath = await findFileUp('tales.config.js');
      config = require(configPath);
      if (_.isFunction(config)) {
        config = await config();
      }
    }
    catch (err) {
      whineAboutMissingConfigFile = true;
    }

    this.config = config = _.defaultsDeep(null, this.opts, config, {
      dir: configPath || process.cwd(),
      whiny: true,
      globals: {
        Load: false,
        App: false,
        Tales: false,
      },
    });

    if (whineAboutMissingConfigFile && this.config.whiny) {
      console.warn(`Failed to require tales.config.js file, continuing without it`);
    }

    // == @SECTION: figure out env == //

    this.env = _.get(this.opts, 'env', process.env.NODE_ENV || 'development');

    // == @SECTION: load secrets file == //

    let secrets;

    try {
      // @TODO: support function variant
      secrets = require(path.resolve(this.config.dir, 'config/secrets'));
    }
    catch (err) {
      if (this.config.whiny) {
        console.warn(`Failed to require config/secrets.js file, continuing without it`);
      }
    }

    if (secrets) {
      this.secrets = secrets[this.env];

      if (this.secrets == null) {
        throw new Error(`Secrets for ${this.env} are not found in the config/secrets.js file`);
      }

      if (_.isEmpty(this.secrets.secretKeyBase)) {
        if (this.config.whiny) {
          console.warn(`The config/secrets.js file does not contain 'secretKeyBase' for ${this.env}, continuing without it`);
        }
      }

      else if (this.secrets.secretKeyBase.length < 32) {
        throw new Error(`The 'secretKeyBase' for ${this.env} is too short, should be at least 32 characters`);
      }
    }

    // == @SECTION: load database file == //

    let database;

    try {
      // @TODO: support function variant
      database = require(path.resolve(this.config.dir, 'config/database'));
    }
    catch (err) {
      if (this.config.whiny) {
        console.warn(`Failed to require config/database.js file, continuing without it`);
      }
    }

    if (database) {
      this.database = database[this.env];

      if (this.database == null) {
        throw new Error(`Database config for ${this.env} is not found in the config/database.js file`);
      }
    }

    // == @SECTION: run application hook == //

    try {
      // @NOTE: meaningless to have a non-function variant
      await require(path.resolve(this.config.dir, 'config/application'))(this, Tales);
    }
    catch (err) {
      if (this.config.whiny) {
        console.warn(`Failed to require config/application.js file, continuing without it`);
      }
    }

    // == @SECTION: run environment hook == //

    try {
      // @NOTE: meaningless to have a non-function variant
      await require(path.resolve(this.config.dir, 'config/environments', this.env))(this, Tales);
    }
    catch (err) {
      if (this.config.whiny) {
        console.warn(`Failed to require config/environments/${this.env}.js file, continuing without it`);
      }
    }

    // == @SECTION: setup loader == //

    this.Load = name => {
      // @TODO: make async and support non-function variant
      return require(path.resolve(this.config.dir, 'app', name))(this, Tales);
    };

    // == @SECTION: globals = //

    if (this.config.globals.Load) {
      const name = _.isString(this.config.globals.Load) ? this.config.globals.Load : 'Load';
      global[name] = this.Load;
    }

    if (this.config.globals.App) {
      const name = _.isString(this.config.globals.App) ? this.config.globals.App : 'App';
      global[name] = this;
    }

    if (this.config.globals.Tales) {
      const name = _.isString(this.config.globals.Tales) ? this.config.globals.Tales : 'Tales';
      global[name] = Tales;
    }

    // == @SECTION: setup models == //

    // @NOTE: for sequelize, we depend on the database config, and want to init and associate models before starting
    if (this.database) {
      this.sequelize = new Sequelize(this.database);
      this.$destroyCallbacks.push(async () => {
        await this.sequelize.close();
      });
      await require('./sequelize')(this, Tales);
    }

    // == @SECTION: routes == //

    try {
      // @TODO: support json and non-function variant
      this.routes = await require(path.resolve(this.config.dir, 'config/routes'))(this, Tales);
    }
    catch (err) {
      throw new Error('Failed to require config/routes.js file, can not continue without it');
    }

  }

  async $destroy() {
    if (this.$destroyed) return;

    for (const callback of this.$destroyCallbacks.reverse()) {
      await callback.call(this);
    }

    this.$destroyed = true;
  }

};
