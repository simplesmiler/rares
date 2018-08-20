module.exports = (App, Rares) => {
  let memory = { value: null };

  return class MemoryController extends Rares.Controller {

    async show() {
      return memory;
    }

    async update() {
      return memory = this.$body;
    }

  };
};
