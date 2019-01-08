const _ = require('lodash');
const qs = require('qs');
const pathToRegexp = require('path-to-regexp');

module.exports = function convert(server, App) {
  const Rares = App.constructor;

  if (App.secrets) {
    Rares.Controller.prototype.$store = async function(key, value) {
      this.$request.yar.set(key, value);
    };

    Rares.Controller.prototype.$load = async function(key) {
      return this.$request.yar.get(key);
    };

    Rares.Controller.prototype.$clear = async function(key) {
      this.$request.yar.clear(key);
    };
  }
  else {
    Rares.Controller.prototype.$store = Rares.Controller.prototype.$load = Rares.Controller.prototype.$clear = async function() {
      throw new Error(`If you want to use sessions make sure to enable secrets`);
    };
  }

  const routes = [];

  Rares.Router.$walk(App.routes, entry => {
    const { controller: controllerName, action: actionName, model: modelName, path, method } = entry;

    // @NOTE: Hapi uses different syntax for paths, so we have to convert
    const hapiPath = convertPath(path);

    // @TODO: In build/start mode load the class here
    let ControllerClass;

    routes.push({
      path: hapiPath,
      method,
      async handler(request, h) {
        const body = request.payload;
        const query = request.url.search ? qs.parse(request.url.search.slice(1), { decoder: decode }) : {};
        const segments = request.params;
        const params = _.defaultsDeep(null, segments, query, body);

        // @TODO: Do this only in dev mode
        ControllerClass = App.Load('controllers/' + controllerName);

        const controller = new ControllerClass({
          // @NOTE: generic application stuff
          $rares: Rares,
          $app: App,

          // @NOTE: hapi-specific request stuff
          $request: request,

          // @NOTE: generic request stuff
          $params: params,
          $model: modelName,
          $controller: controllerName,
          $action: actionName,
        });

        try {
          const result = await controller.$run();
          const response = h.response(JSON.stringify(result.value)); // @FIXME: This is awful

          const status = _.get(result.opts, 'status');
          if (status != null) {
            response.code(status);
          }

          const type = _.get(result.opts, 'type', 'application/json');
          if (type != null) {
            response.type(type);
          }

          const headers = _.get(result.opts, 'headers');
          if (headers != null) {
            for (const name of _.keys(headers)) {
              response.header(name, headers[name]);
            }
          }

          return response;
        }

        catch (err) {
          throw App.$wrapError(err);
        }
      },
    });
  });

  return routes;
};

// === //

function decode(str) {
  try {
    str = decodeURIComponent(str.replace(/\+/g, ' '));
    return JSON.parse(str);
  }
  catch (err) {
    return str;
  }
}

// @TODO: Make more robust converter
function convertPath(path) {
  // @NOTE: Collect participating params
  const keys = [];
  pathToRegexp(path, keys);

  // @NOTE: Wrap param names in brackets
  const values = {};
  for (const key of keys) {
    values[key.name] = '{' + key.name + '}';
  }

  // @NOTE: Use bracketed names as values
  const toPath = pathToRegexp.compile(path);
  return toPath(values, { encode: (value, token) => value });
}
