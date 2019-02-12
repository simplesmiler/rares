module.exports = App => {
  const { scope, get, put } = App.Router;
  return [
    // @SECTION: action hooks
    scope('hooks', [
      get('around', { controller: 'hooks' }),
      get('before', { controller: 'hooks' }),
      get('after', { controller: 'hooks' }),
      get('rescue', { controller: 'hooks' }),
    ]),

    // @SECTION: responses
    get('response', { controller: 'responses', action: 'index' }),

    // @SECTION: secrets and session
    scope('session', [
      put('store', { controller: 'session' }),
      get('load', { controller: 'session' }),
    ]),

    // @SECTION: nesting
    scope('api', [
      get('/', { controller: 'home', action: 'index' }),
      get('alpha', { controller: 'home' }),
    ]),
  ];
};
