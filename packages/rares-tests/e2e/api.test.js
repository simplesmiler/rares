// @NOTE: This test suite covers the api docs examples to make sure they work

const { backends, makeFixture } = require('../utils');

for (const backend of backends) {
  describe(`API (${backend})`, () => {

    describe('CLI commands', () => {
      // @TODO: Figure out how to test command cli
    });

    describe('File structure', () => {
      // @TODO: Figure out how to test different ways of specifying root directory
    });

    describe('App', () => {
      // @TODO: Figure out how to test this
    });

    describe('Router', () => {

      let fixture = null;

      beforeAll(async () => {
        fixture = await makeFixture('api/router', { backend });
      });

      afterAll(async () => {
        await fixture.cleanup();
      });

      describe('All HTTP verbs work', () => {

        test('Responds to the GET /methods/get', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/methods/get');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is methods:get' });
        });

        test('Responds to the POST /methods/post', async () => {
          expect.assertions(2);
          const response = await fixture.axios.post('/methods/post');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is methods:post' });
        });

        test('Responds to the PUT /methods/put', async () => {
          expect.assertions(2);
          const response = await fixture.axios.put('/methods/put');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is methods:put' });
        });

        test('Responds to the PATCH /methods/patch', async () => {
          expect.assertions(2);
          const response = await fixture.axios.patch('/methods/patch');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is methods:patch' });
        });

        test('Responds to the DELETE /methods/del', async () => {
          expect.assertions(2);
          const response = await fixture.axios.delete('/methods/del');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is methods:del' });
        });

      });

      describe('HTTP verbs example works', () => {

        test('Responds to the GET /', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is index:index' });
        });

        test('Responds to the GET /details', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/details');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is index:details' });
        });

        test('Responds to the POST /users', async () => {
          expect.assertions(2);
          const response = await fixture.axios.post('/users');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is users:create' });
        });

        test('Responds to the GET /users/:userId with numeric id', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/users/1');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is users:show', params: { userId: 1 } });
        });

        test('Responds to the GET /users/:userId with string id', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/users/john');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is users:show', params: { userId: 'john' } });
        });

        test('Responds to the GET /users/:userId with guid id', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/users/1539adfa-985a-4c2e-8a89-6dae23a0911c');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is users:show', params: { userId: '1539adfa-985a-4c2e-8a89-6dae23a0911c' } });
        });

      });

      describe('Scope example works', () => {

        test('Responds to the GET /api/profile', async () => {
          expect.assertions(2);
          const response = await fixture.axios.get('/api/profile');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is profile:show' });
        });

        test('Responds to the PUT /api/profile', async () => {
          expect.assertions(2);
          const response = await fixture.axios.put('/api/profile');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is profile:update' });
        });

        test('Responds to the DELETE /api/profile', async () => {
          expect.assertions(2);
          const response = await fixture.axios.delete('/api/profile');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ message: 'This is profile:destroy' });
        });

      });

    });

    describe('Controller', () => {

      let fixture = null;

      beforeAll(async () => {
        fixture = await makeFixture('api/controller', { backend });
      });

      afterAll(async () => {
        await fixture.cleanup();
      });

      test('$beforeAction example works', async () => {
        expect.assertions(14);

        // @NOTE: Initial session should be empty
        {
          const response = await fixture.axios.get('/session');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ currentUser: null });
        }

        // @NOTE: After failed sign in, session should be empty
        {
          const response = await fixture.axios.post('/session', { userId: 0 });
          expect(response.status).toBe(409);
          expect(response.data).toEqual({ message: 'No such user' });
        }
        {
          const response = await fixture.axios.get('/session');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ currentUser: null });
        }

        // @NOTE: After successful sign in, session should contain the user
        {
          const response = await fixture.axios.post('/session', { userId: 1 });
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ currentUser: { id: 1, name: 'John' } });
        }
        {
          const response = await fixture.axios.get('/session');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ currentUser: { id: 1, name: 'John' } });
        }

        // @NOTE: After successful sign out, session should contain the user
        {
          const response = await fixture.axios.delete('/session');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ currentUser: null });
        }
        {
          const response = await fixture.axios.get('/session');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ currentUser: null });
        }
      });

      test('$rescueFrom example works', async () => {
        expect.assertions(6);

        // @NOTE: Clear the errors
        {
          const response = await fixture.axios.post('/errors/clear');
          expect(response.status).toBe(200);
        }

        // @NOTE: Initially no errors
        {
          const response = await fixture.axios.get('/errors');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ errors: [] });
        }

        // @NOTE: One error after calling a deliberately faulty controller
        {
          const response = await fixture.axios.post('/test/error', { message: 'Demo' });
          expect(response.status).toBe(500);
        }
        {
          const response = await fixture.axios.get('/errors');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ errors: [{ url: '/test/error', message: 'Demo' }] });
        }
      });

      test('$aroundAction example works', async () => {
        expect.assertions(7);

        // @NOTE: Clear the times
        {
          const response = await fixture.axios.post('/times/clear');
          expect(response.status).toBe(200);
        }

        // @NOTE: Initially no times
        {
          const response = await fixture.axios.get('/times');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ times: [] });
        }

        // @NOTE: One time after calling a deliberately delayed controller
        {
          const response = await fixture.axios.post('/test/delay', { ms: 100 });
          expect(response.status).toBe(200);
        }
        {
          const response = await fixture.axios.get('/times');
          expect(response.status).toBe(200);
          expect(response.data.times).toHaveLength(1);
          const ms = Number(response.data.times[0].text.match(/(\d+)ms/)[1]);
          expect(ms).toBeCloseTo(100, -2);
        }
      });

    });

    describe('Controller instance', () => {

      let fixture = null;

      beforeAll(async () => {
        fixture = await makeFixture('api/controller-instance', { backend });
      });

      afterAll(async () => {
        await fixture.cleanup();
      });

      test('$controller and $action example works', async () => {
        expect.assertions(2);
        const response = await fixture.axios.get('/test/controller-and-action');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ controller: 'test', action: 'controllerAndAction' });
      });

      test('$params example works', async () => {
        expect.assertions(8);
        {
          const response = await fixture.axios.get('/echo?a=1');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ a: 1 });
        }
        {
          const response = await fixture.axios.get('/echo/0?a=1');
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ echoId: 0, a: 1 });
        }
        {
          const response = await fixture.axios.post('/echo', { b: 2 });
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ b: 2 });
        }
        {
          const response = await fixture.axios.post('/echo/0?a=1', { b: 2 });
          expect(response.status).toBe(200);
          expect(response.data).toEqual({ echoId: 0, a: 1, b: 2 });
        }
      });

      test('$response example works', async () => {
        expect.assertions(7);
        {
          const axiosOpts = {
            // @NOTE: We force axios to give us bytes, otherwise response will be processed, which may hide issues
            // @REF: https://github.com/axios/axios/issues/907
            responseType: 'arraybuffer',
          };
          const response = await fixture.axios.get('/about/text', axiosOpts);
          expect(response.status).toBe(418);
          expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
          expect(response.data.toString()).toEqual('The cake is a lie');
          expect(response.headers['x-powered-by']).toBe('Rares');
        }
        {
          const axiosOpts = {
            // @NOTE: We want binary response for the file
            responseType: 'arraybuffer',
          };
          const response = await fixture.axios.get('/about/file', axiosOpts);
          expect(response.status).toBe(200);
          expect(response.headers['content-type']).toBe('image/png');
          expect(response.data.length).toEqual(302);
        }
      });

    });

  });
}
