// @DOC: This file exports an express router factory

const _ = require('lodash');
const Router = require('express').Router;
const BodyParser = require('body-parser');

const registerRoutes = require('./register-routes');

module.exports = async function ExpressRares(opts) {
  const App = _.get(opts, 'App', null);
  const Rares = App.constructor;
  opts = _.omit(opts, ['App']);

  if (!App) throw new Error('Expected App to be in the plugin options');

  const expressRouter = Router();

  expressRouter.use(BodyParser.json());
  expressRouter.use(BodyParser.urlencoded({ extended: true }));

  if (App.secrets) {
    expressRouter.use(require('cookie-session')({ secret: App.secrets.secretKeyBase }));
  }

  await registerRoutes(expressRouter, App);

  return function(req, res, next) {
    return expressRouter(req, res, err => {
      try {
        // @NOTE: In case of a missing route, we handle it here instead of delegating back to express
        if (!err) err = Rares.Boom.notFound();

        // @NOTE: Make sure all errors are wrapped
        err = App.$wrapError(err);

        // @NOTE: Unwrapping boom error for express
        res.status(err.output.statusCode);
        res.set(err.output.headers);
        res.type('application/json');
        res.send(JSON.stringify(err.output.payload));
        res.end();
      }
      catch (err2) {
        // @NOTE: Safety net, we should never actually land here, unless something goes horribly wrong
        next(err2);
      }
    });
  };
};
