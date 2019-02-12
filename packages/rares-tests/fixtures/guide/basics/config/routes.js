module.exports = App => {
  const { get, post } = App.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
    post('echo', { controller: 'home' }),
  ];
};
