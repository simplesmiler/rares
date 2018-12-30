// @DOC: This file exports an express router factory

const _ = require('lodash');
const Router = require('express').Router;
const BodyParser = require('body-parser');

const registerRoutes = require('./register-routes');

module.exports = async function ExpressRares(opts) {
  const { App, Rares } = opts;
  opts = _.omit(opts, ['App', 'Rares']);

  if (!App && !Rares) throw new Error('Expected either App or Rares to be in the plugin options');

  const expressRouter = Router();

  async function mount(App) {
    if (App.$mounted) throw new Error('This app is already mounted');
    App.$mounted = true;

    expressRouter.use(BodyParser.json());
    expressRouter.use(BodyParser.urlencoded({ extended: true }));

    if (App.secrets) {
      expressRouter.use(require('cookie-session')({ secret: App.secrets.secretKeyBase }));
    }

    await registerRoutes(expressRouter, App);
  }

  if (App) {
    await mount(App);
  }
  else {
    await Rares.create(opts, async App => {
      await mount(App);
    });
  }

  return expressRouter;
};
