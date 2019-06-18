module.exports = App => class extends App.Controller {
  async index() {
    return { from: 'home#index' };
  }
  async alpha() {
    return { from: 'home#alpha' };
  }
};
