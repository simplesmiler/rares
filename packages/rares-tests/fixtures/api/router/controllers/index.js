module.exports = App => class extends App.Controller {
  async index() {
    return { message: 'This is index:index' };
  }

  async details() {
    return { message: 'This is index:details' };
  }
};
