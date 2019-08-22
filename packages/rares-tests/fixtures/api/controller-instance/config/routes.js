module.exports = App => {
  const { get, post, del } = App.Router;
  return [
    // @NOTE: $controller and $action example
    get('test/controller-and-action', { controller: 'test', action: 'controllerAndAction' }),

    // @NOTE: $params example
    get('echo', { controller: 'home' }),
    get('echo/:echoId', { controller: 'home', action: 'echo' }),
    post('echo', { controller: 'home' }),
    post('echo/:echoId', { controller: 'home', action: 'echo' }),

    // @NOTE: $response example
    get('about/text', { controller: 'about', action: 'text' }),
    get('about/file', { controller: 'about', action: 'file' }),
  ];
};
