module.exports = App => class extends App.Controller {
  async get() {
    return { message: 'This is methods:get' };
  }

  async post() {
    return { message: 'This is methods:post' };
  }

  async put() {
    return { message: 'This is methods:put' };
  }

  async patch() {
    return { message: 'This is methods:patch' };
  }

  async del() {
    return { message: 'This is methods:del' };
  }
};
