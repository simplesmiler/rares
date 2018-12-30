// @DOC: This file exports a hapi plugin

const _ = require('lodash');
const convertRoutes = require('./convert-routes');

module.exports = {

  name: 'hapi-rares',

  async register(server, opts) {
    const App = _.get(opts, 'App', null);
    const Rares = _.get(opts, 'Rares', null);
    opts = _.omit(opts, ['App', 'Rares']);

    if (!App && !Rares) throw new Error('Expected either App or Rares to be in the plugin options');

    async function mount(App) {
      if (App.$mounted) throw new Error('This app is already mounted');
      App.$mounted = true;

      await server.register(_.compact([
        App.secrets && {
          plugin: require('yar'),
          options: {
            cookieOptions: {
              password: App.secrets.secretKeyBase,
              isSecure: false,
            },
          },
        },
      ]));

      const routes = convertRoutes(server, App);
      await server.route(routes);
    }

    if (App) {
      await mount(App);
    }
    else {
      await Rares.create(opts, async App => {
        await mount(App);
      });
    }
  },

};
