module.exports = async App => {
  const { get } = App.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
  ];
};
