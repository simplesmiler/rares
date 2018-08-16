const convertRoutes = require('./convert-routes');
const _ = require('lodash');
const Tales = require('../tales');

module.exports = {

  name: 'hapi-tales',

  async register(server, opts) {
    await Tales.create(opts, async App => {
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

      let routes = convertRoutes(server, App);
      await server.route(routes);
    });
  },

};
