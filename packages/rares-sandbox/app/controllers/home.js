module.exports = (App, Rares) => {
  return class extends Rares.Controller {
    index() {
      return this.$response({ message: 'Hello from Rares!' });
    }
  };
};
