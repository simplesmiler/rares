// @NOTE: this test suite covers the guide examples to make sure they work

const { backends, makeFixture } = require('../utils');

for (const backend of backends) {
  describe(`Guide (${backend})`, () => {

    describe('Basics', () => {
      let fixture = null;

      beforeAll(async () => {
        fixture = await makeFixture('guide/basics', { backend });
      });

      afterAll(async () => {
        await fixture.cleanup();
      });

      test('Responds to the GET /', async () => {
        expect.assertions(2);
        const response = await fixture.axios.get('/');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ message: 'Welcome!' });
      });

      test('Responds to the POST /echo with no data', async () => {
        expect.assertions(2);
        const response = await fixture.axios.post('/echo');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({});
      });

      test('Responds to the POST /echo with query string', async () => {
        expect.assertions(2);
        const response = await fixture.axios.post('/echo?hello=world');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ hello: 'world' });
      });

      test('Responds to the POST /echo with JSON body', async () => {
        expect.assertions(2);
        const response = await fixture.axios.post('/echo', { hello: 'world' });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ hello: 'world' });
      });
    });

    describe('Extras', () => {
      let fixture = null;

      beforeAll(async () => {
        fixture = await makeFixture('guide/extras', { backend });
      });

      afterAll(async () => {
        await fixture.cleanup();
      });

      test('Responses', async () => {
        expect.assertions(4);
        let response = null;

        response = await fixture.axios.get('/response');
        expect(response.status).toBe(200);

        response = await fixture.axios.get('/response?status=204');
        expect(response.status).toBe(204);

        response = await fixture.axios.get('/response?headers[x-demo]=Sample');
        expect(response.status).toBe(200);
        expect(response.headers).toMatchObject({ 'x-demo': 'Sample' });
      });

      test('Secrets and session', async () => {
        expect.assertions(17);
        let response = null;

        response = await fixture.axios.$get('/session/load?key=str');
        expect(response).toEqual({ value: null });

        response = await fixture.axios.$put('/session/store?key=str&value=some-string');
        expect(response).toEqual({ value: 'some-string' });

        response = await fixture.axios.$get('/session/load?key=str');
        expect(response).toEqual({ value: 'some-string' });

        response = await fixture.axios.$put('/session/store?key=str&value=');
        expect(response).toEqual({ value: '' });

        response = await fixture.axios.$get('/session/load?key=str');
        expect(response).toEqual({ value: '' });

        response = await fixture.axios.$get('/session/load?key=num');
        expect(response).toEqual({ value: null });

        response = await fixture.axios.$put('/session/store?key=num&value=123');
        expect(response).toEqual({ value: 123 });

        response = await fixture.axios.$get('/session/load?key=num');
        expect(response).toEqual({ value: 123 });

        response = await fixture.axios.$put('/session/store?key=num&value=-123');
        expect(response).toEqual({ value: -123 });

        response = await fixture.axios.$get('/session/load?key=num');
        expect(response).toEqual({ value: -123 });

        response = await fixture.axios.$put('/session/store?key=num&value=0');
        expect(response).toEqual({ value: 0 });

        response = await fixture.axios.$get('/session/load?key=num');
        expect(response).toEqual({ value: 0 });

        response = await fixture.axios.$get('/session/load?key=bool');
        expect(response).toEqual({ value: null });

        response = await fixture.axios.$put('/session/store?key=bool&value=true');
        expect(response).toEqual({ value: true });

        response = await fixture.axios.$get('/session/load?key=bool');
        expect(response).toEqual({ value: true });

        response = await fixture.axios.$put('/session/store?key=bool&value=false');
        expect(response).toEqual({ value: false });

        response = await fixture.axios.$get('/session/load?key=bool');
        expect(response).toEqual({ value: false });
      });

      test('Action hooks', async () => {
        expect.assertions(10 - 2);
        let response = null;

        // @TODO: cover variation in hooks and rescues, namely:
        //        - `only` with a string and array
        //        - `except` with a string and array
        //        - `matches` for rescues with a class, string, function and array
        //        - order of hooks
        //        - order of rescues

        response = await fixture.axios.get('/hooks/around?expected=success');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          handler: 'hooks#around',
          params: { expected: 'success' },
          status: 'success',
          result: { from: 'hooks#around' },
        });

        response = await fixture.axios.get('/hooks/around?expected=failure');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          handler: 'hooks#around',
          params: { expected: 'failure' },
          status: 'failure',
          error: 'from: hooks#around',
        });

        response = await fixture.axios.get('/hooks/before');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ from: 'hooks#beforeAction' });

        // @FIXME(v0.4): this test is currently broken, figure out if it should work or not
        // response = await fixture.axios.get('/hooks/after');
        // expect(response.status).toBe(200);
        // expect(response.data).toEqual({
        //   original: { from: 'hooks#after' },
        //   modified: { from: 'hooks#afterAction' },
        // });

        response = await fixture.axios.get('/hooks/rescue');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          from: 'hooks#rescueFrom',
          error: 'from: hooks#rescue',
        });
      });

      test('Scoping and namespacing', async () => {
        expect.assertions(4);
        let response = null;

        response = await fixture.axios.get('/api');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ from: 'home#index' });

        response = await fixture.axios.get('/api/alpha');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ from: 'home#alpha' });
      });

    });

  });
}
