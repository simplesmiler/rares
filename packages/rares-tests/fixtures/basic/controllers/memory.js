module.exports = App => {
  let value = null;

  return class MemoryController extends App.Controller {

    async show() {
      return { value };
    }

    async update() {
      value = this.$params.value;
      return { value };
    }

  };
};
