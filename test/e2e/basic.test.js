const { makeFixture } = require('../utils');

describe('Basic', () => {
  let fixture;

  beforeAll(async () => {
    fixture = await makeFixture('basic');
  });

  test('Says 200 to the index', async () => {
    expect.assertions(2);
    const response = await fixture.axios.get('/');
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ message: 'hello' });
  });

  test('Says 404 to not existing resources', async () => {
    expect.assertions(1);
    try {
      await fixture.axios.get('/no-such-resource');
    }
    catch (err) {
      expect(err.response.status).toBe(404);
    }
  });

  test('Memory is empty', async () => {
    expect.assertions(1);
    const memory = await fixture.axios.$get('/memory');
    expect(memory).toEqual({ value: null });
  });

  test('Memory can be set and read', async () => {
    expect.assertions(2);
    let memory;

    memory = await fixture.axios.$put('/memory', { value: 1 });
    expect(memory).toEqual({ value: 1 });

    memory = await fixture.axios.$put('/memory', { value: null });
    expect(memory).toEqual({ value: null });
  });

  afterAll(async () => {
    await fixture.stop();
  });
});
