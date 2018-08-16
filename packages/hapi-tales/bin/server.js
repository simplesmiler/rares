const Hapi = require('hapi');

async function main() {
  const server = new Hapi.Server({
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 3000,

    // debug: { request: ['error'] },
  });

  await server.register([
    require('..'),
  ]);

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
}

main().catch(console.error);
