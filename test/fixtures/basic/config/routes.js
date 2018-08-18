module.exports = (App, Tales) => {
  const { get } = Tales.Router;

  return [
    get('/', { controller: 'index', action: 'index' }),
  ];
};
