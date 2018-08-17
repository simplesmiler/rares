const _ = require('lodash');
const qs = require('qs');
const Sequelize = require('sequelize');
const Boom = require('boom');

module.exports = function convert(server, App) {
  let Tales = App.constructor;

  if (App.secrets && App.secrets.secretKeyBase) {
    Tales.Controller.prototype.$store = async function(key, value) {
      this.$request.yar.set(key, value);
    };

    Tales.Controller.prototype.$load = async function(key) {
      return this.$request.yar.get(key);
    };

    Tales.Controller.prototype.$clear = async function(key) {
      this.$request.yar.clear(key);
    };
  }
  else {
    Tales.Controller.prototype.$store = Tales.Controller.prototype.$load = Tales.Controller.prototype.$clear = async function() {
      throw new Error(`If you want to use sessions make sure to include 'secretKeyBase' in the secrets file`);
    };
  }

  let routes = [];

  Tales.Router.$walk(App.routes, entry => {
    let { controller: controllerName, action: actionName, model: modelName, path, method } = entry;

    let ControllerClass = App.Load('controllers/' + controllerName);

    if (ControllerClass == null) {
      throw new Error(`Controller '${controllerName}' does not seem to export anything`);
    }

    if (ControllerClass.$doSetup == null) {
      throw new Error(`Controller '${controllerName}' does not seem to extend Tails.Controller`);
    }

    ControllerClass.$doSetup();

    routes.push({
      path,
      method,
      async handler(request, h) {
        let query = request.url.search ? qs.parse(request.url.search.slice(1), { decoder: decode }) : {};
        let params = _.defaults(null, request.params, query, request.payload);

        let controller = new ControllerClass({
          // @NOTE: generic application stuff
          $tales: Tales,
          $app: App,

          // @NOTE: hapi-specific request stuff
          $server: server,
          $request: request,

          // @NOTE: generic request stuff
          $params: params,
          $model: modelName,
          $controller: controllerName,
          $action: actionName,
        });

        try {
          let result = await controller.$run();
          let response = h.response(result.value);

          let status = _.get(result.opts, 'status');
          if (status != undefined) {
            response.code(status);
          }

          let type = _.get(result.opts, 'type');
          if (type != undefined) {
            response.type(type);
          }

          let headers = _.get(result.opts, 'headers');
          if (headers != undefined) {
            for (let name of _.keys(headers)) {
              response.header(name, headers[name]);
            }
          }

          return response;
        }

        catch (err) {
          // @NOTE: keep explicit http errors as is
          if (Boom.isBoom(err)) throw err;

          // @NOTE: map database errors to http errors
          // @NOTE: it's important to catch specific errors firts, and then generic,
          //        otherwise generic errors with "shadow" specific ones
          else if (err instanceof Sequelize.EmptyResultError) {
            throw Boom.boomify(err, { statusCode: 404 });
          }
          else if (err instanceof Sequelize.ValidationError) {
            err = Boom.boomify(err, { statusCode: 422 });
            err.output.payload.errors = _.map(err.errors, _.partialRight(_.pick, ['message', 'type', 'path']));
            throw err;
          }
          else if (err instanceof Sequelize.ForeignKeyConstraintError) {
            throw Boom.boomify(err, { statusCode: 409 });
          }
          else if (err instanceof Sequelize.TimeoutError) {
            throw Boom.boomify(err, { statusCode: 424 });
          }

          // @NOTE: errors that were not rescued are bad implementation
          else {
            throw Boom.badImplementation(err);
          }
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
