const Stream = require('stream');
const _ = require('lodash');

module.exports = function register(expressRouter, App) {
  if (App.secrets) {
    App.Controller.$extend({
      async $store(key, value) {
        this.$backendRequest.session[key] = value;
      },
      async $load(key) {
        let value = this.$backendRequest.session[key];
        if (value === undefined) {
          value = null;
        }
        return value;
      },
      async $clear(key) {
        delete this.$backendRequest.session[key];
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
        // @NOTE: express modifies the original request, so there is no difference between $request and $backendRequest
        $backendRequest: req,
        $request: req,

        // @NOTE: generic request stuff
        $params: params,
        $model: modelName,
        $controller: controllerName,
        $action: actionName,
      });

      const result = await controller.$run();
      const response = result.value;

      const status = _.get(result.opts, 'status');
      if (status != null) {
        res.status(status);
      }

      const type = _.get(result.opts, 'type');
      if (type != null) {
        res.type(type);
      }

      const headers = _.get(result.opts, 'headers');
      if (headers != null) {
        res.set(headers);
      }

      if (response instanceof Stream) {
        res.status(status);
        response.pipe(res);
      }
      else {
        // @NOTE: Express has an edge case when sending numbers, where it treats them as a status,
        //        so we send them as a buffer and force the type
        // @REFERENCE: https://github.com/expressjs/express/issues/2227
        if (typeof response === 'number') {
          res.type(type || 'application/json');
          res.send(Buffer.from(String(response)));
        }
        else {
          res.send(response);
        }
        res.end();
      }
    }
    catch (err) {
      next(err);
    }
  });
};
