module.exports = App => class extends App.Controller {
  async create() {
    return { message: 'This is users:create' };
  }

  async show() {
    return { message: 'This is users:show', params: this.$params };
  }
};
