module.exports = (App, Rings) => class IndexController extends Rings.Controller {

  async index() {
    return {
      message: 'hello',
    };
  }

};
