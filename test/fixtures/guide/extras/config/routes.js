module.exports = (App, Rares) => {
  const { scope, get } = Rares.Router;
  return [
    // @SECTION: action hooks
    scope('hooks', [
      get('around', { controller: 'hooks' }),
      get('before', { controller: 'hooks' }),
      get('after', { controller: 'hooks' }),
      get('rescue', { controller: 'hooks' }),
    ]),

    // @SECTION: nesting
    scope('api', [
      get('/', { controller: 'home', action: 'index' }),
      get('alpha', { controller: 'home' }),
    ]),
  ];
};
