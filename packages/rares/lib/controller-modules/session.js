module.exports = App => {
  App.Controller.$extend({
    /* eslint-disable no-unused-vars */
    async $store(key, value) {
      throw new Error('Controller method $store should have been overwritten, but was not');
    },

    async $load(key) {
      throw new Error('Controller method $load should have been overwritten, but was not');
    },

    async $clear(key) {
      throw new Error('Controller method $clear should have been overwritten, but was not');
    },
    /* eslint-enable no-unused-vars */
  });
};
