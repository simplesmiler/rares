module.exports = App => {
  const PreloadedService = App.Load('services/preloaded');
  return class IndexController extends App.Controller {
    async controller() {
      return { message: 'controller-modified' };
    }
    async preloadedService() {
      return PreloadedService.get();
    }
    async dynamicService() {
      const DynamicService = App.Load('services/dynamic');
      return DynamicService.get();
    }
    async extra() {
      return { message: 'extra' };
    }
  };
};
