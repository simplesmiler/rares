module.exports = App => {
  const PreloadedService = App.load('services/preloaded');
  return class IndexController extends App.Controller {
    async controller() {
      return { message: 'controller-modified' };
    }
    async preloadedService() {
      return PreloadedService.get();
    }
    async dynamicService() {
      const DynamicService = App.load('services/dynamic');
      return DynamicService.get();
    }
    async extra() {
      return { message: 'extra' };
    }
  };
};
