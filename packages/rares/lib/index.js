const findFileUp = require('find-file-up');
const path = require('path');
const _ = require('lodash');
const qs = require('qs');
const matchit = require('matchit');
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

    this.$loaderEnhancements = [];
    this.$destroyCallbacks = [];
    this.opts = opts || {};
  }

  async $initialize() {
    const steps = [
      // == @SECTION: figure out config == //
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
      // == @SECTION: setup loader == //
      async App => {
        const loaderCache = {};
        const loaderStack = [];
        const loaderDeps = {};
        const virtualModules = {};

        App.Register = (moduleName, module, opts) => {
          virtualModules[moduleName] = module;
        };

        App.load = (moduleName, opts) => {
          const virtual = _.get(opts, 'virtual') || false;

          const absoluteName = virtual ? moduleName : path.resolve(App.config.dir, moduleName);
          const filePath = virtual ? absoluteName : require.resolve(absoluteName);
          const properModuleName = moduleName.endsWith('.js') ? moduleName.slice(0, -3) : moduleName;

          // @NOTE: Track this module as dependency
          for (const stackFilePath of loaderStack) {
            loaderDeps[stackFilePath].push(filePath);
          }

          // @NOTE: If module cache was not busted, then just pick it up
          let loaded = loaderCache[filePath];
          if (loaded) return loaded;

          // @NOTE: Make sure that module is loaded fresh
          delete require.cache[filePath];

          // @NOTE: Setup for tracking dependencies, and load the module
          loaderStack.push(filePath);
          loaderDeps[filePath] = [];
          try {
            loaded = virtual ? virtualModules[moduleName] : require(filePath); // @NOTE: For now, modules do not support async and direct export variants
            if (!_.isFunction(loaded)) {
              throw new Error(`Module does not seem to have a proper signature, has to be a function`);
            }
            loaded = loaded(App);
          }
          catch (err) {
            throw new Error(`Failed to load module '${properModuleName}': ${err.message}`);
          }
          finally {
            loaderStack.shift();
          }

          // @NOTE: Make sure that module exported a reasonable value
          if (loaded == null) {
            throw new Error(`Module '${properModuleName}' does not seem to export anything`);
          }
          if (loaded instanceof Promise) {
            throw new Error(`Module '${properModuleName}' seems to export async value, which is not supported for modules`);
          }

          // @NOTE: Enhance exported value
          for (const enhancement of App.$loaderEnhancements) {
            if (properModuleName.startsWith(enhancement.prefix)) {
              const relativeModuleName = properModuleName.slice(enhancement.prefix.length);
              loaded = enhancement.handler(relativeModuleName, loaded);
            }
          }

          // @NOTE: Cache and return
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
      // == @SECTION: run boot hook == //
      async App => {
        if (!App.config.features.bootstrap) return;
        try {
          // @NOTE: meaningless to have a non-function variant
          await require(path.resolve(App.config.dir, 'hooks/boot'))(this);
        }
        catch (err) {
          if (App.config.whiny) {
            console.warn(`Failed to require hooks/boot.js file, continuing without it: ${err.message}`);
          }
        }
      },
      // == @SECTION: setup base controller == //
      async App => {
        const RaresController = require('./controller');
        App.Controller = class Controller extends RaresController {
          // @NOTE: Noop
        };

        const modules = _.compact([
          require('./controller-modules/resource'),
          require('./controller-modules/session'),
          require('./controller-modules/authenticate'),
          require('./controller-modules/authorize'),
        ]);

        for (const module of modules) {
          module(App);
        }

        App.$loaderEnhancements.push({
          prefix: 'controllers/',
          handler(name, loaded) {
            if (loaded.$doSetup == null) {
              throw new Error(`Controller '${name}' does not seem to extend App.Controller`);
            }
            loaded.$doSetup();
            return loaded;
          },
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

        // @TODO: Enhance models
      },
      // == @SECTION: routes == //
      async App => {
        App.Register('#/route-index', App => {
          // @TODO: Do this only in dev mode
          const routes = App.load('config/routes');

          const index = {};
          this.Router.$walk(routes, entry => {
            const method = entry.method.toLowerCase();
            if (!(method in index)) {
              index[method] = {};
            }
            index[method][entry.path] = entry;
          });

          return index;
        });
      },
      // == @SECTION: run application hook == //
      async App => {
        if (!App.config.features.bootstrap) return;
        try {
          // @NOTE: meaningless to have a non-function variant
          await require(path.resolve(this.config.dir, 'hooks/application'))(App);
        }
        catch (err) {
          if (App.config.whiny) {
            console.warn(`Failed to require hooks/application.js file, continuing without it: ${err.message}`);
          }
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

  $matchRoute(method, url) {
    const index = this.load('#/route-index', { virtual: true });

    method = method.toLowerCase();
    const parts = url.split('?');
    const path = parts[0];
    const query = parts.length > 1 ? qs.parse(parts.slice(1).join('?'), { decoder }) : {};

    const patterns = _.keys(index[method]).map(matchit.parse);
    const match = matchit.match(path, patterns);
    if (match.length === 0) return null;

    const pattern = match[0].old;
    const segments = matchit.exec(path, match);

    return { route: index[method][pattern], query, segments };
  }

  // @TODO: Handle virtual requests

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

function decoder(str) {
  try {
    str = decodeURIComponent(str.replace(/\+/g, ' '));
    return JSON.parse(str);
  }
  catch (err) {
    return str;
  }
}
