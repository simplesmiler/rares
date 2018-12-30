const _ = require('lodash');
const Hapi = require('hapi');
const HapiRares = require('.');

module.exports = async (App, Rares, opts) => {
  const host = _.get(opts, 'host') || process.env.HOST || 'localhost';
  const port = _.get(opts, 'port') || process.env.PORT || 3000;
  opts = _.omit(opts, ['host', 'port']);

  let hapiServer = new Hapi.Server({ host, port });

  await hapiServer.register({
    plugin: HapiRares,
    options: { App, Rares, ...opts },
  });

  const server = {
    uri: null,
    async start() {
      await hapiServer.start();
      server.uri = hapiServer.info.uri;
    },
    async stop() {
      await hapiServer.stop({ timeout: 10000 });
      server.uri = null;
    },
    async cleanup() {
      if (server.uri) await server.stop();
      hapiServer = null;
      server.start = null;
      server.stop = null;
      server.cleanup = null;
    },
  };

  return server;
};
