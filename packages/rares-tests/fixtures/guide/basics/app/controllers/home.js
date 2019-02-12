module.exports = App => class extends App.Controller {
  async index() {
    return { message: 'Welcome!' };
  }
  async echo() {
    return this.$params;
  }
};
