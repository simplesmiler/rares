const findFileUp = require('find-file-up');
const path = require('path');
const _ = require('lodash');
const Boom = require('boom');
const Watchpack = require('watchpack');

function getSequielize() {
  return require('sequelize');
}

module.exports = class Rares {

  static get Sequelize() {
    return getSequielize();
  }

  static get Boom() {
    return Boom;
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
    const App = new Rares(opts);
    try {
      await App.$initialize();
      if (block) {
        if (_.isFunction(block)) {
          await block(App);
        }
        else {
          throw new Error('Block, passed to Rares.create, is not a function');
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
    const cwd = _.get(this.opts, 'dir') || process.cwd();

    let configDir, config;
    let whineAboutMissingConfigFile = false;
    try {
      // @TODO: support json file
      const configPath = await findFileUp('rares.config.js', cwd);
      config = require(configPath);
      if (_.isFunction(config)) {
        config = await config(this, Rares);
      }
      configDir = path.dirname(configPath);
    }
    catch (err) {
      whineAboutMissingConfigFile = true;
    }

    this.config = config = _.defaultsDeep(null, this.opts, config, {
      dir: _.get(config, 'dir') || configDir || cwd,
      whiny: true,
      features: {
        secrets: false,
        database: false,
        bootstrap: false,
      },
    });

    if (whineAboutMissingConfigFile && this.config.whiny) {
      console.warn(`Failed to require rares.config.js file, continuing without it`);
    }

    // == @SECTION: figure out env == //

    this.env = _.get(this.opts, 'env', process.env.NODE_ENV || 'development');

    // == @SECTION: load secrets file == //

    if (this.config.features.secrets) {
      let secrets;

      try {
        secrets = require(path.resolve(this.config.dir, 'config/secrets'));
        if (_.isFunction(secrets)) {
          secrets = await secrets(this, Rares);
        }
      }
      catch (err) {
        throw new Error(`Failed to require config/secrets.js file: ${err.message}`);
      }

      if (secrets) {
        this.secrets = secrets[this.env];

        if (this.secrets == null) {
          throw new Error(`Secrets for ${this.env} are not found in the config/secrets.js file`);
        }

        if (_.isEmpty(this.secrets.secretKeyBase)) {
          throw new Error(`The config/secrets.js file does not contain 'secretKeyBase' for ${this.env}`);
        }

        if (this.secrets.secretKeyBase.length < 32) {
          throw new Error(`The 'secretKeyBase' for ${this.env} is too short, should be at least 32 characters`);
        }
      }
    }

    // == @SECTION: load database file == //

    if (this.config.features.database) {
      let database;

      try {
        database = require(path.resolve(this.config.dir, 'config/database'));
        if (_.isFunction(database)) {
          database = await database(this, Rares);
        }
      }
      catch (err) {
        throw new Error(`Failed to require config/database.js file: ${err.message}`);
      }

      if (database) {
        this.database = database[this.env];

        if (this.database == null) {
          throw new Error(`Database config for ${this.env} is not found in the config/database.js file`);
        }
      }
    }

    // == @SECTION: run application hook == //

    if (this.config.features.bootstrap) {
      try {
        // @NOTE: meaningless to have a non-function variant
        await require(path.resolve(this.config.dir, 'config/application'))(this, Rares);
      }
      catch (err) {
        if (this.config.whiny) {
          console.warn(`Failed to require config/application.js file, continuing without it: ${err.message}`);
        }
      }
    }

    // == @SECTION: run environment hook == //

    if (this.config.features.bootstrap) {
      try {
        // @NOTE: meaningless to have a non-function variant
        await require(path.resolve(this.config.dir, 'config/environments', this.env))(this, Rares);
      }
      catch (err) {
        if (this.config.whiny) {
          console.warn(`Failed to require config/environments/${this.env}.js file, continuing without it: ${err.message}`);
        }
      }
    }

    // == @SECTION: setup loader == //

    const loaderCache = {};
    const loaderStack = [];
    const loaderDeps = {};

    this.Load = moduleName => {
      const absoluteName = path.resolve(this.config.dir, 'app', moduleName);
      const filePath = require.resolve(absoluteName);
      const properModuleName = moduleName.endsWith('.js') ? moduleName.slice(0, -3) : moduleName;

      // @NOTE: If module cache was not busted, then just pick it up
      for (const stackFilePath of loaderStack) {
        loaderDeps[stackFilePath].push(filePath);
      }
      let loaded = loaderCache[filePath];
      if (loaded) return loaded;

      // @NOTE: Make sure that module is loaded fresh
      delete require.cache[filePath];

      // @NOTE: Setup for tracking dependencies, and load the module
      loaderStack.push(filePath);
      loaderDeps[filePath] = [];
      loaded = require(filePath)(this, Rares); // @NOTE: For now, modules do not support async and direct export variants
      loaderStack.shift();

      // @NOTE: Enhance controllers
      if (properModuleName.startsWith('controllers/')) {
        const controllerName = properModuleName.slice('controllers/'.length);
        if (loaded == null) {
          throw new Error(`Controller '${controllerName}' does not seem to export anything`);
        }
        if (loaded instanceof Promise) {
          throw new Error(`Controller '${controllerName}' seems to export async value, which is not supported for modules`);
        }
        if (loaded.$doSetup == null) {
          throw new Error(`Controller '${controllerName}' does not seem to extend Rares.Controller`);
        }
        loaded.$doSetup();
      }

      // @TODO: Enhance models

      // @NOTE: Enhance other modules
      else {
        if (loaded == null) {
          throw new Error(`Module '${properModuleName}' does not seem to export anything`);
        }
        if (loaded instanceof Promise) {
          throw new Error(`Module '${properModuleName}' seems to export async value, which is not supported for modules`);
        }
      }

      loaderCache[filePath] = loaded;
      return loaded;
    };

    // @TODO: Do this only in dev mode
    // @TODO: Replace with a more generic mechanism for restarting
    const wp = new Watchpack({ ignored: [/node_modules/] });
    wp.watch([], [this.config.dir], Date.now());
    wp.on('change', filePath => {
      // @NOTE: Busting the changed file itself
      delete loaderCache[filePath];

      // @NOTE: Busting all dependants
      for (const dependantFilePath of Object.keys(loaderDeps)) {
        if (loaderDeps[dependantFilePath].includes(filePath)) {
          delete loaderCache[dependantFilePath];
        }
      }
    });
    this.$destroyCallbacks.push(async () => {
      wp.close();
    });


    // == @SECTION: setup models == //

    // @NOTE: for sequelize, we depend on the database config, and want to init and associate models before starting
    if (this.config.features.database && this.database) {
      const Sequelize = getSequielize();
      this.sequelize = new Sequelize(this.database);
      this.$destroyCallbacks.push(async () => {
        await this.sequelize.close();
      });
      await require('./sequelize')(this, Rares);
    }

    // == @SECTION: routes == //

    try {
      // @TODO: support json and non-function variant
      this.routes = await require(path.resolve(this.config.dir, 'config/routes'))(this, Rares);
    }
    catch (err) {
      throw new Error(`Failed to require config/routes.js file: ${err.message}`);
    }

  }

  async $destroy() {
    if (this.$destroyed) return;

    for (const callback of this.$destroyCallbacks.reverse()) {
      await callback.call(this);
    }

    this.$destroyed = true;
  }

  $wrapError(err) {
    // @NOTE: Keep explicit http errors as is
    if (Boom.isBoom(err)) {
      return err;
    }

    if (this.config.features.database) {
      const Sequelize = getSequielize();

      // @NOTE: Map database errors to http errors
      // @NOTE: It's important to catch specific errors before generic ones,
      //        otherwise generic errors will "shadow" specific ones
      if (err instanceof Sequelize.EmptyResultError) {
        return Boom.boomify(err, { statusCode: 404 });
      }
      if (err instanceof Sequelize.ValidationError) {
        const newErr = Boom.boomify(err, { statusCode: 422 });
        newErr.output.payload.errors = _.map(newErr.errors, _.partialRight(_.pick, ['message', 'type', 'path']));
        return newErr;
      }
      if (err instanceof Sequelize.ForeignKeyConstraintError) {
        return Boom.boomify(err, { statusCode: 409 });
      }
      if (err instanceof Sequelize.TimeoutError) {
        return Boom.boomify(err, { statusCode: 424 });
      }
    }

    // @NOTE: Other errors that were not rescued are bad implementation
    return Boom.badImplementation(err);
  }

};
