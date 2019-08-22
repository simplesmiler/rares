module.exports = App => {
  const { get, post, del } = App.Router;
  return [
    // @NOTE: Actions to be called during tests
    post('test/error', { controller: 'test', action: 'error' }),
    post('test/delay', { controller: 'test', action: 'delay' }),

    // @NOTE: $beforeAction example
    get('session', { controller: 'session', action: 'show' }),
    post('session', { controller: 'session', action: 'create' }),
    del('session', { controller: 'session', action: 'destroy' }),

    // @NOTE: $rescueFrom example
    get('errors', { controller: 'errors', action: 'index' }),
    post('errors/clear', { controller: 'errors', action: 'clear' }),

    // @NOTE: $aroundAction example
    get('times', { controller: 'times', action: 'index' }),
    post('times/clear', { controller: 'times', action: 'clear' }),
  ];
};
