const _ = require('lodash');

module.exports = App => class extends App.load('controllers/application') {
  async index() {
    return { times: this.$getTimeMock().reports };
  }

  async clear() {
    this.$getTimeMock().reports = [];
  }
};
