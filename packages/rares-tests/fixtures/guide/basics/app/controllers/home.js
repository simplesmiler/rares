module.exports = (App, Rares) => class extends Rares.Controller {
  async index() {
    return { message: 'Welcome!' };
  }
  async echo() {
    return this.$params;
  }
};
