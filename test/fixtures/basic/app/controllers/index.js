module.exports = (App, Tales) => class IndexController extends Tales.Controller {

  async index() {
    return {
      message: 'hello',
    };
  }

};
