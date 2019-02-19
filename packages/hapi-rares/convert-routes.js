const _ = require('lodash');

module.exports = function convert(server, App) {
  const Rares = App.constructor;

  if (App.secrets) {
    App.Controller.$extend({
      async $store(key, value) {
        this.$request.yar.set(key, value);
      },
      async $load(key) {
        return this.$request.yar.get(key);
      },
      async $clear(key) {
        this.$request.yar.clear(key);
      },
    });
  }
  else {
    const $error = async function() {
      throw new Error(`If you want to use sessions make sure to enable secrets`);
    };
    App.Controller.$extend({
      $store: $error,
      $load: $error,
      $clear: $error,
    });
  }

  return [
    {
      method: '*',
      path: '/{_*}',
      async handler(request, h) {
        try {
          const entry = App.$matchRoute(request.method, request.url.path);
          if (!entry) throw App.Boom.notFound();
          const { route, query, segments } = entry;

          const { controller: controllerName, action: actionName, model: modelName } = route;

          const body = request.payload;
          const params = _.defaultsDeep(null, segments, query, body);

          // @TODO: Do this only in dev mode
          const ControllerClass = App.Load('controllers/' + controllerName);

          const controller = new ControllerClass({
            // @NOTE: generic application stuff
            $app: App,

            // @NOTE: hapi-specific request stuff
            $request: request,

            // @NOTE: generic request stuff
            $params: params,
            $model: modelName,
            $controller: controllerName,
            $action: actionName,
          });

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
    },
  ];
};
