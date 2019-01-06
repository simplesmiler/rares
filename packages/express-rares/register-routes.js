const _ = require('lodash');
const qs = require('qs');

const Sequelize = require('sequelize');
const Boom = require('boom');

module.exports = function register(expressRouter, App) {
  const Rares = App.constructor;

  if (App.secrets) {
    Rares.Controller.prototype.$store = async function(key, value) {
      this.$request.session[key] = value;
    };

    Rares.Controller.prototype.$load = async function(key) {
      let value = this.$request.session[key];
      if (value === undefined) {
        value = null;
      }
      return value;
    };

    Rares.Controller.prototype.$clear = async function(key) {
      delete this.$request.session[key];
    };
  }
  else {
    Rares.Controller.prototype.$store = Rares.Controller.prototype.$load = Rares.Controller.prototype.$clear = async function() {
      throw new Error(`If you want to use sessions make sure to enable secrets`);
    };
  }

  Rares.Router.$walk(App.routes, entry => {
    const { controller: controllerName, action: actionName, model: modelName, path, method } = entry;

    // @TODO: In build/start mode load the class here
    let ControllerClass;

    expressRouter[method](path, (req, res, next) => {
      const body = req.body;
      const query = req.url.includes('?') ? qs.parse(req.url.split('?').slice(1).join('?'), { decoder: decode }) : {};
      const segments = req.params;
      const params = _.defaultsDeep(null, segments, query, body);

      // @TODO: Do this only in dev mode
      ControllerClass = App.Load('controllers/' + controllerName);

      const controller = new ControllerClass({
        // @NOTE: generic application stuff
        $rares: Rares,
        $app: App,

        // @NOTE: express-specific request stuff
        $request: req,

        // @NOTE: generic request stuff
        $params: params,
        $model: modelName,
        $controller: controllerName,
        $action: actionName,
      });

      Promise.resolve()
        .then(async () => {
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
        })
        .catch(async err => {
          // @NOTE: keep explicit http errors as is
          if (Boom.isBoom(err)) {
            throw err;
          }

          // @NOTE: map database errors to http errors
          // @NOTE: it's important to catch specific errors first, and then generic,
          //        otherwise generic errors will "shadow" specific ones
          else if (err instanceof Sequelize.EmptyResultError) {
            throw Boom.boomify(err, { statusCode: 404 });
          }
          else if (err instanceof Sequelize.ValidationError) {
            const newErr = Boom.boomify(err, { statusCode: 422 });
            newErr.output.payload.errors = _.map(newErr.errors, _.partialRight(_.pick, ['message', 'type', 'path']));
            throw newErr;
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
        })
        .catch(err => {
          next(err);
        });
    });
  });
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
