module.exports = (App, Rares) => class extends Rares.Controller {
  async store() {
    await this.$store(this.$params.key, this.$params.value);
    return { value: await this.$load(this.$params.key) };
  }
  async load() {
    return { value: await this.$load(this.$params.key) };
  }
};
