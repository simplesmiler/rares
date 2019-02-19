module.exports = App => {
  const { get } = App.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
  ];
};
