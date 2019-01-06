module.exports = (App, Rares) => {
  const { get, post } = Rares.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
    post('echo', { controller: 'home' }),
  ];
};
