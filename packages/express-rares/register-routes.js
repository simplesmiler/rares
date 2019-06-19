const _ = require('lodash');

module.exports = function register(expressRouter, App) {
  if (App.secrets) {
    App.Controller.$extend({
      async $store(key, value) {
        this.$request.session[key] = value;
      },
      async $load(key) {
        let value = this.$request.session[key];
        if (value === undefined) {
          value = null;
        }
        return value;
      },
      async $clear(key) {
        delete this.$request.session[key];
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

  expressRouter.all('*', async (req, res, next) => {
    try {
      const entry = App.$matchRoute(req.method, req.url);
      if (!entry) return next(App.Boom.notFound());
      const { route, query, segments } = entry;

      const { controller: controllerName, action: actionName, model: modelName } = route;

      const body = req.body;
      const params = _.defaultsDeep(null, segments, query, body);

      // @TODO: Do this only in dev mode
      const ControllerClass = App.load('controllers/' + controllerName);

      const controller = new ControllerClass({
        // @NOTE: generic application stuff
        $app: App,

        // @NOTE: express-specific request stuff
        $request: req,

        // @NOTE: generic request stuff
        $params: params,
        $model: modelName,
        $controller: controllerName,
        $action: actionName,
      });

      const result = await controller.$run();
      const response = JSON.stringify(result.value); // @FIXME: This is awful

      const status = _.get(result.opts, 'status');
      if (status != null) {
        res.status(status);
      }

      const type = _.get(result.opts, 'type', 'application/json');
      if (type != null) {
        res.type(type);
      }

      const headers = _.get(result.opts, 'headers');
      if (headers != null) {
        res.set(headers);
      }

      res.send(response);
      res.end();
    }
    catch (err) {
      next(err);
    }
  });
};
