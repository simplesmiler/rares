const { makeFixture } = require('../utils');

describe('Basic', () => {
  let fixture;

  beforeAll(async () => {
    fixture = await makeFixture('basic');
  });

  test('Says 200 to existing resources', async () => {
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

  afterAll(async () => {
    await fixture.stop();
  });
});
