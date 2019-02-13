module.exports = App => {
  const PreloadedService = App.Load('services/preloaded');
  return class IndexController extends App.Controller {
    async controller() {
      return { message: 'controller-initial' };
    }
    async preloadedService() {
      return PreloadedService.get();
    }
    async dynamicService() {
      const DynamicService = App.Load('services/dynamic');
      return DynamicService.get();
    }
  };
};
