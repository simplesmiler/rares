const _ = require('lodash');

module.exports = App => class extends App.load('controllers/application') {
  async index() {
    return { errors: this.$getRollbarMock().reports };
  }
  async clear() {
    this.$getRollbarMock().reports = [];
  }
};
