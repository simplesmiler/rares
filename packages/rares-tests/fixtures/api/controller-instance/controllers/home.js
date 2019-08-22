module.exports = App => class extends App.Controller {
  async echo() {
    return this.$params;
  }
};
