const { backends, makeFixture, getFixtureBasePath } = require('../utils');
const path = require('path');
const fse = require('fs-extra');

for (const backend of backends) {
  describe(`Hot reload (${backend})`, () => {
    // @TODO: Enable this test.
    // @NOTE: Currently this test does not work due to some issues between watchpack 1.6 (using chokidar) and jest.
    //        Watchpack 2.x seems to solve this issue (but not using chokidar), but as of time of writing it is in beta.
    test.skip('Works', async () => {
      expect.assertions(14);
      let fixture = null;
      try {
        const base = await getFixtureBasePath();

        // @NOTE: Copy initial files and start the app
        await fse.emptyDir(path.resolve(base, `hot-reload/tmp/${backend}`));
        await fse.copy(path.resolve(base, 'hot-reload/initial'), path.resolve(base, `hot-reload/tmp/${backend}`));
        fixture = await makeFixture(`hot-reload/tmp/${backend}`, { backend });

        // @NOTE: Check that actions return initial values
        {
          const response = await fixture.axios.get('/controller');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'controller-initial' });
        }
        {
          const response = await fixture.axios.get('/preloaded-service');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'preloaded-initial' });
        }
        {
          const response = await fixture.axios.get('/dynamic-service');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'dynamic-initial' });
        }

        // @NOTE: Replace initial files with modified ones
        await fse.copy(path.resolve(base, 'hot-reload/modified'), path.resolve(base, `hot-reload/tmp/${backend}`));

        // @NOTE: Jest does not interact with require.cache, which makes internal cache busting mechanism go
        //        out the window. To work around this, we have to hint jest to reset modules manually.
        jest.resetModules();

        // @NOTE: Check that things got reloaded without restarting the server
        {
          const response = await fixture.axios.get('/controller');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'controller-modified' });
        }
        {
          const response = await fixture.axios.get('/preloaded-service');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'preloaded-modified' });
        }
        {
          const response = await fixture.axios.get('/dynamic-service');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'dynamic-modified' });
        }
        {
          const response = await fixture.axios.get('/extra');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'extra' });
        }
      }
      finally {
        if (fixture) {
          await fixture.cleanup();
        }
      }
    });
  });
}
