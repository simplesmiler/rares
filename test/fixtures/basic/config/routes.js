module.exports = (App, Rares) => {
  const { get } = Rares.Router;

  return [
    get('/', { controller: 'index', action: 'index' }),
  ];
};
