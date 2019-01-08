const { backends, makeFixture } = require('../utils');

for (const backend of backends) {
  describe(`Basic (${backend})`, () => {
    let fixture = null;

    beforeAll(async () => {
      fixture = await makeFixture('basic', { backend });
    });

    afterAll(async () => {
      await fixture.cleanup();
    });

    test('Says 200 with JSON body to the index', async () => {
      expect.assertions(2);
      const response = await fixture.axios.get('/');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ message: 'hello' });
    });

    test('Says 404 with JSON body to not existing resources', async () => {
      expect.assertions(2);
      try {
        await fixture.axios.get('/no-such-resource');
      }
      catch (err) {
        expect(err.response.status).toBe(404);
        expect(err.response.data).toEqual({ statusCode: 404, error: 'Not Found', message: 'Not Found' });
      }
    });

    test('Memory is empty', async () => {
      expect.assertions(1);
      const memory = await fixture.axios.$get('/memory');
      expect(memory).toEqual({ value: null });
    });

    test('Memory can be set and read', async () => {
      expect.assertions(6);
      let memory;

      // @NOTE: set 1
      memory = await fixture.axios.$put('/memory', { value: 1 });
      expect(memory).toEqual({ value: 1 });

      // @NOTE: read 1
      memory = await fixture.axios.$get('/memory');
      expect(memory).toEqual({ value: 1 });

      // @NOTE: set 2
      memory = await fixture.axios.$put('/memory?value=2');
      expect(memory).toEqual({ value: 2 });

      // @NOTE: read 2
      memory = await fixture.axios.$get('/memory');
      expect(memory).toEqual({ value: 2 });

      // @NOTE: set null
      memory = await fixture.axios.$put('/memory', { value: null });
      expect(memory).toEqual({ value: null });

      // @NOTE: read null
      memory = await fixture.axios.$get('/memory');
      expect(memory).toEqual({ value: null });
    });
  });
}
