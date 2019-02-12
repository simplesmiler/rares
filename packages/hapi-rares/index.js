// @DOC: This file exports a hapi plugin

const _ = require('lodash');
const convertRoutes = require('./convert-routes');

module.exports = {

  name: 'hapi-rares',

  async register(server, opts) {
    const App = _.get(opts, 'App', null);
    opts = _.omit(opts, ['App']);

    if (!App) throw new Error('Expected App to be in the plugin options');

    if (App.secrets) {
      await server.register({
        plugin: require('yar'),
        options: {
          cookieOptions: {
            password: App.secrets.secretKeyBase,
            isSecure: false,
          },
        },
      });
    }

    // @TODO: Define what to do when changes happen:
    //        - Route file changed

    const routes = convertRoutes(server, App);
    await server.route(routes);
  },

};
