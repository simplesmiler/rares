module.exports = App => class IndexController extends App.Controller {

  async index() {
    return {
      message: 'hello',
    };
  }

};
