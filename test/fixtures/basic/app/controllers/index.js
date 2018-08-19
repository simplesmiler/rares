module.exports = (App, Rares) => class IndexController extends Rares.Controller {

  async index() {
    return {
      message: 'hello',
    };
  }

};
