module.exports = (App, Rares) => {
  const { get, resource } = Rares.Router;
  return [
    get('/', { controller: 'index', action: 'index' }),
    resource('memory', { only: ['show', 'update'] }),
  ];
};
