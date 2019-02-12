const findFileUp = require('find-file-up');
const path = require('path');
const _ = require('lodash');
const Boom = require('boom');
const Watchpack = require('watchpack');

function getSequielize() {
  return require('sequelize');
}

module.exports = class Rares {

  get Sequelize() {
    return getSequielize();
  }

  get Boom() {
    return Boom;
  }

  get Controller() {
    return require('./controller');
  }

  get Ability() {
    return require('./ability');
  }

  get Router() {
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
    const steps = [
      // == @SECTION: figure out config file == //
      async App => {
        const cwd = _.get(App.opts, 'dir') || process.cwd();

        let configDir, config;
        let whineAboutMissingConfigFile = false;
        try {
          // @TODO: support json file
          const configPath = await findFileUp('rares.config.js', cwd);
          config = require(configPath);
          if (_.isFunction(config)) {
            config = await config(App);
          }
          configDir = path.dirname(configPath);
        }
        catch (err) {
          whineAboutMissingConfigFile = true;
        }

        App.config = config = _.defaultsDeep(null, App.opts, config, {
          dir: _.get(config, 'dir') || configDir || cwd,
          whiny: true,
          features: {
            secrets: false,
            database: false,
            bootstrap: false,
          },
        });

        if (whineAboutMissingConfigFile && App.config.whiny) {
          console.warn(`Failed to require rares.config.js file, continuing without it`);
        }
      },
      // == @SECTION: figure out env == //
      async App => {
        App.env = _.get(App.opts, 'env', process.env.NODE_ENV || 'development');
      },
      // == @SECTION: load secrets file == //
      async App => {
        if (!App.config.features.secrets) return;
        let secrets;

        try {
          secrets = require(path.resolve(App.config.dir, 'config/secrets'));
          if (_.isFunction(secrets)) {
            secrets = await secrets(App);
          }
        }
        catch (err) {
          throw new Error(`Failed to require config/secrets.js file: ${err.message}`);
        }

        if (secrets) {
          App.secrets = secrets[App.env];

          if (App.secrets == null) {
            throw new Error(`Secrets for ${App.env} are not found in the config/secrets.js file`);
          }

          if (_.isEmpty(App.secrets.secretKeyBase)) {
            throw new Error(`The config/secrets.js file does not contain 'secretKeyBase' for ${App.env}`);
          }

          if (App.secrets.secretKeyBase.length < 32) {
            throw new Error(`The 'secretKeyBase' for ${App.env} is too short, should be at least 32 characters`);
          }
        }
      },
      // == @SECTION: load database file == //
      async App => {
        if (!App.config.features.database) return;
        let database;

        try {
          database = require(path.resolve(App.config.dir, 'config/database'));
          if (_.isFunction(database)) {
            database = await database(App);
          }
        }
        catch (err) {
          throw new Error(`Failed to require config/database.js file: ${err.message}`);
        }

        if (database) {
          this.database = database[App.env];

          if (App.database == null) {
            throw new Error(`Database config for ${App.env} is not found in the config/database.js file`);
          }
        }
      },
      // == @SECTION: run application hook == //
      async App => {
        if (!App.config.features.bootstrap) return;
        try {
          // @NOTE: meaningless to have a non-function variant
          await require(path.resolve(this.config.dir, 'config/application'))(App);
        }
        catch (err) {
          if (App.config.whiny) {
            console.warn(`Failed to require config/application.js file, continuing without it: ${err.message}`);
          }
        }
      },
      // == @SECTION: run environment hook == //
      async App => {
        if (!App.config.features.bootstrap) return;
        try {
          // @NOTE: meaningless to have a non-function variant
          await require(path.resolve(App.config.dir, 'config/environments', App.env))(this);
        }
        catch (err) {
          if (App.config.whiny) {
            console.warn(`Failed to require config/environments/${App.env}.js file, continuing without it: ${err.message}`);
          }
        }
      },
      // == @SECTION: setup loader == //
      async App => {
        const loaderCache = {};
        const loaderStack = [];
        const loaderDeps = {};

        App.Load = moduleName => {
          const absoluteName = path.resolve(App.config.dir, 'app', moduleName);
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
          loaded = require(filePath)(App); // @NOTE: For now, modules do not support async and direct export variants
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
              throw new Error(`Controller '${controllerName}' does not seem to extend App.Controller`);
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
        wp.watch([], [App.config.dir], Date.now());
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
        App.$destroyCallbacks.push(async () => {
          wp.close();
        });
      },
      // == @SECTION: setup models == //
      async App => {
        if (!App.config.features.database) return;
        // @NOTE: for sequelize, we depend on the database config, and want to init and associate models before starting
        const Sequelize = getSequielize();
        App.sequelize = new Sequelize(App.database);
        App.$destroyCallbacks.push(async () => {
          await App.sequelize.close();
        });
        await require('./sequelize')(App);
      },
      // == @SECTION: routes == //
      async App => {
        try {
          // @TODO: support json and non-function variant
          App.routes = await require(path.resolve(App.config.dir, 'config/routes'))(App);
        }
        catch (err) {
          throw new Error(`Failed to require config/routes.js file: ${err.message}`);
        }
      },
    ];

    for (const step of steps) {
      await step(this);
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
