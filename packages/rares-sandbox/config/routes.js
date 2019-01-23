module.exports = async (App, Rares) => {
  const { get } = Rares.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
  ];
};
