module.exports = (App, Rares) => class extends Rares.Controller {
  async index() {
    return { from: 'home#index' };
  }
  async alpha() {
    return { from: 'home#alpha' };
  }
};
