module.exports = (App, Rares) => {
  let value = null;

  return class MemoryController extends Rares.Controller {

    async show() {
      return { value };
    }

    async update() {
      value = this.$params.value;
      return { value };
    }

  };
};
