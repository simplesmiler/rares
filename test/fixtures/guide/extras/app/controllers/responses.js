module.exports = (App, Rares) => class extends Rares.Controller {
  async index() {
    const message = 'This action will respond with requested status and headers';
    return this.$response({ message }, {
      status: this.$params.status || 200,
      headers: this.$params.headers || [],
    });
  }
};
