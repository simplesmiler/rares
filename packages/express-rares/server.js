const _ = require('lodash');
const Express = require('express');
const ExpressRares = require('.');

module.exports = async (App, Rares, opts) => {
  const host = _.get(opts, 'host') || process.env.HOST || 'localhost';
  const port = _.get(opts, 'port') || process.env.PORT || 3000;
  opts = _.omit(opts, ['host', 'port']);

  let expressApp = Express();

  expressApp.use(await ExpressRares({ App, Rares, ...opts }));
  let expressServer = null;

  const server = {
    uri: null,
    async start() {
      return new Promise((resolve, reject) => {
        expressServer = expressApp.listen(port, host, (err, result) => {
          if (err) {
            reject(err);
          }
          else {
            server.uri = `http://${host}${port === 80 ? '' : ':' + port}`;
            resolve();
          }
        });
      });
    },
    async stop() {
      return new Promise((resolve, reject) => {
        expressServer.close((err, result) => {
          if (err) {
            reject(err);
          }
          else {
            server.uri = null;
            expressServer = null;
            resolve();
          }
        });
      });
    },
    async cleanup() {
      if (server.uri) await server.stop();
      expressApp = null;
      server.start = null;
      server.stop = null;
      server.cleanup = null;
    },
  };

  return server;
};
