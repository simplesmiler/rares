module.exports = App => {
  const { get, post, put, patch, del, scope } = App.Router;
  return [
    // @NOTE: All HTTP verbs
    get('methods/get', { controller: 'methods', action: 'get' }),
    post('methods/post', { controller: 'methods', action: 'post' }),
    put('methods/put', { controller: 'methods', action: 'put' }),
    patch('methods/patch', { controller: 'methods', action: 'patch' }),
    del('methods/del', { controller: 'methods', action: 'del' }),

    // @NOTE: HTTP verbs example
    get('/', { controller: 'index', action: 'index' }),
    get('details', { controller: 'index' }),
    post('users', { controller: 'users', action: 'create' }),
    get('users/:userId', { controller: 'users', action: 'show' }),

    // @NOTE: Scope example
    scope('api', [
      get('profile', { controller: 'profile', action: 'show' }),
      put('profile', { controller: 'profile', action: 'update' }),
      del('profile', { controller: 'profile', action: 'destroy' }),
    ]),
  ];
};
