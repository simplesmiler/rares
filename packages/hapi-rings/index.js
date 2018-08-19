const convertRoutes = require('./convert-routes');
const _ = require('lodash');

module.exports = {

  name: 'hapi-rings',

  async register(server, opts) {
    const { App, Rings } = opts;
    opts = _.omit(opts, ['App', 'Rings']);

    if (!App && !Rings) throw new Error('Expected either App or Rings to be in the plugin options');

    async function mount(server, App) {
      if (App.server) throw new Error('This app is already mounted');
      App.server = server;

      await server.register(_.compact([
        App.secrets && App.secrets.secretKeyBase && {
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
      await Rings.create(opts, async App => {
        await mount(server, App);
      });
    }
  },

};
