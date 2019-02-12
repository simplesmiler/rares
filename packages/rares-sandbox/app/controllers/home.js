module.exports = App => {
  return class extends App.Controller {
    index() {
      return this.$response({ message: 'Hello from Rares!' });
    }
  };
};
