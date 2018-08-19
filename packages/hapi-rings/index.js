const convertRoutes = require('./convert-routes');
const _ = require('lodash');
const Rings = require('../..');

module.exports = {

  name: 'hapi-rings',

  async register(server, opts) {
    await Rings.create(opts, async App => {
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
    });
  },

};
