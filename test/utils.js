const _ = require('lodash');
const path = require('path');
const getPort = require('get-port');
const axios = require('axios');
const Hapi = require('hapi');
const Rares = require('..');
const HapiRares = require('../packages/hapi-rares');

module.exports = {
  makeFixture,
};

// === //

async function makeFixture(name, options) {
  const dir = path.resolve(__dirname, 'fixtures', name);
  options = _.defaultsDeep(null, options, { Rares, dir, whiny: false });
  const hapi = await makeHapiServer(options);
  const axios = await makeAxiosClient(hapi.info.uri);
  const fixture = {
    hapi, axios,
    async stop() {
      await hapi.stop({ timeout: 10000 });
      fixture.hapi = null;
      fixture.axios = null;
      fixture.stop = null;
    },
  };
  return fixture;
}

async function makeHapiServer(options) {
  const server = new Hapi.Server({
    host: 'localhost',
    port: await getPort(),
  });

  await server.register({
    plugin: HapiRares,
    options,
  });

  await server.start();

  return server;
}

const mixin = {};
for (const name of ['options', 'head', 'get', 'post', 'put', 'patch', 'delete']) {
  mixin['$' + name] = async function(...args) {
    const result = await this[name](...args);
    return result.data;
  };
}

async function makeAxiosClient(baseURL) {
  const client = axios.create({ baseURL });
  Object.assign(client, mixin);
  return client;
}
