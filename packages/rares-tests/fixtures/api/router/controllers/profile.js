module.exports = App => class extends App.Controller {
  async show() {
    return { message: 'This is profile:show' };
  }

  async update() {
    return { message: 'This is profile:update' };
  }

  async destroy() {
    return { message: 'This is profile:destroy' };
  }
};
