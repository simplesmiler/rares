module.exports = App => class extends App.load('controllers/application') {
  async delay() {
    const ms = this.$params.ms;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async error() {
    const message = this.$params.message;
    throw new Error(message);
  }
};
