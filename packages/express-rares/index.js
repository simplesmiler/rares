// @DOC: This file exports an express router factory

const _ = require('lodash');
const Router = require('express').Router;
const BodyParser = require('body-parser');

const registerRoutes = require('./register-routes');

module.exports = async function ExpressRares(opts) {
  const App = _.get(opts, 'App', null);
  opts = _.omit(opts, ['App']);

  if (!App) throw new Error('Expected App to be in the plugin options');

  const expressRouter = Router();

  expressRouter.use(BodyParser.json());
  expressRouter.use(BodyParser.urlencoded({ extended: true }));

  if (App.secrets) {
    expressRouter.use(require('cookie-session')({ secret: App.secrets.secretKeyBase }));
  }

  await registerRoutes(expressRouter, App);

  return expressRouter;
};
