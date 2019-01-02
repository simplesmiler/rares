const _ = require('lodash');
const Hapi = require('hapi');
const HapiRares = require('.');

module.exports = async (App, opts) => {
  const host = _.get(opts, 'host') || 'localhost';
  const port = _.get(opts, 'port') || 3000;
  opts = _.omit(opts, ['host', 'port']);

  let hapiServer = new Hapi.Server({ host, port });

  await hapiServer.register({
    plugin: HapiRares,
    options: { App },
  });

  const server = {
    uri: null,
    async start() {
      await hapiServer.start();
      server.uri = `http://${host}${port === 80 ? '' : ':' + port}`;
    },
    async stop() {
      await hapiServer.stop({ timeout: 5000 });
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
