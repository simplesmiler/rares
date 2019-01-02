const _ = require('lodash');
const Express = require('express');
const stoppable = require('stoppable');
const ExpressRares = require('.');

module.exports = async (App, opts) => {
  const host = _.get(opts, 'host') || 'localhost';
  const port = _.get(opts, 'port') || 3000;
  opts = _.omit(opts, ['host', 'port']);

  let expressApp = Express();

  expressApp.use(await ExpressRares({ App }));
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
        expressServer = stoppable(expressServer, 5000);
      });
    },
    async stop() {
      return new Promise((resolve, reject) => {
        expressServer.stop((err, result) => {
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
