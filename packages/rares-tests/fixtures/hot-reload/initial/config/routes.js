module.exports = App => {
  const { get } = App.Router;
  return [
    get('controller', { controller: 'index' }),
    get('preloaded-service', { controller: 'index', action: 'preloadedService' }),
    get('dynamic-service', { controller: 'index', action: 'dynamicService' }),
  ];
};
