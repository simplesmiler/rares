module.exports = App => class extends App.Controller {
  async controllerAndAction() {
    return { controller: this.$controller, action: this.$action };
  }
};
