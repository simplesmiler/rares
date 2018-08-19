module.exports = (App, Rings) => {
  const { get } = Rings.Router;

  return [
    get('/', { controller: 'index', action: 'index' }),
  ];
};
