const Hapi = require('hapi');
const HapiTales = require('.');

module.exports = async function(App, Rares) {
  let hapi = new Hapi.Server({
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 3000,
  });

  await hapi.register({
    plugin: HapiTales,
    options: { App, Rares },
  });

  const server = {
    uri: null,
    async start() {
      await hapi.start();
      server.uri = hapi.info.uri;
    },
    async stop() {
      await hapi.stop({ timeout: 10000 });
      server.uri = null;
    },
    async cleanup() {
      if (server.uri) await server.stop();
      hapi = null;
    },
  };

  return server;
};
