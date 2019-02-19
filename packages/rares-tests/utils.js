const _ = require('lodash');
const path = require('path');
const getPort = require('get-port');
const axios = require('axios');
const tough = require('tough-cookie');
const { default: axiosCookieJarSupport } = require('axios-cookiejar-support');
const Rares = require('rares');
const HapiRaresServer = require('hapi-rares/server');
const ExpressRaresServer = require('express-rares/server');

module.exports = {
  getFixtureBasePath,
  makeFixture,
  backends: ['hapi', 'express'],
};

// === //

axiosCookieJarSupport(axios);

async function getFixtureBasePath() {
  return path.resolve(__dirname, 'fixtures');
}

async function makeFixture(name, options) {
  const dir = path.resolve(__dirname, 'fixtures', name);
  options = _.defaultsDeep(null, options, { dir, whiny: false });

  const backend = _.get(options, 'backend');
  if (backend == null) {
    throw new Error('Test should specify backend');
  }

  let Backend;
  if (backend === 'hapi') {
    Backend = HapiRaresServer;
  }
  else if (backend === 'express') {
    Backend = ExpressRaresServer;
  }
  else {
    throw new Error(`Unexpected situation, backend = ${backend}`);
  }

  const port = await getPort();
  let App = await Rares.create(options);
  let server = await Backend(App, { port });
  await server.start();

  const axios = await makeAxiosClient(server.uri);
  const fixture = {
    axios,
    async cleanup() {
      await server.cleanup();
      server = null;
      await App.$destroy();
      App = null;
      fixture.axios = null;
      fixture.cleanup = null;
    },
  };
  return fixture;
}

const mixin = {};
for (const name of ['options', 'head', 'get', 'post', 'put', 'patch', 'delete']) {
  mixin['$' + name] = async function(...args) {
    const result = await this[name](...args);
    return result.data;
  };
}

async function makeAxiosClient(baseURL) {
  const cookieJar = new tough.CookieJar();
  const client = axios.create({ baseURL, jar: cookieJar, withCredentials: true, validateStatus: () => true });
  Object.assign(client, mixin);
  return client;
}
