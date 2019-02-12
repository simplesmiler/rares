module.exports = App => {
  const { get, resource } = App.Router;
  return [
    get('/', { controller: 'index', action: 'index' }),
    resource('memory', { only: ['show', 'update'] }),
  ];
};
