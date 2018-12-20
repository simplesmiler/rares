const convertRoutes = require('./convert-routes');
const _ = require('lodash');

module.exports = {

  name: 'hapi-rares',

  async register(server, opts) {
    const { App, Rares } = opts;
    opts = _.omit(opts, ['App', 'Rares']);

    if (!App && !Rares) throw new Error('Expected either App or Rares to be in the plugin options');

    async function mount(server, App) {
      if (App.server) throw new Error('This app is already mounted');
      App.server = server;

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
      await mount(server, App);
    }
    else {
      await Rares.create(opts, async App => {
        await mount(server, App);
      });
    }
  },

};
