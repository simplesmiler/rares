---
sidebar: auto
---

# API Reference

This page documents the public API of Rares.

If you are just starting with Rares, it is strongly recommended to read the [guide](/guide.html) first.

## CLI commands

All CLI commands can be run via `npx rares`.

::: tip
In case you need it, you can use `node ./node_modules/rares/bin/rares` instead of `npx rares`.
Note that this only available after you install the Rares package locally.
:::

### `npx rares dev`

Boots the application in development mode and starts the web server. 

Environment variables:
- `NODE_ENV` is the environment. Defaults to `development`, other popular values are `test` and `production`.
- `HOST` is the hostname or IP address to listen on. Defaults to `localhost`, which will ignore
  requests that are coming from the network. Can be set `0.0.0.0` to listen for all requests.
- `PORT` is the port to listen on. Defaults to `3000`.

Arguments:
- `--server <server>`, `-s <server>` determines the web server that will be used.
  Supported servers are `hapi` and `express`. Defaults to `hapi`.
- `--host <host>`, `-h <host>` takes precedence over the `HOST` environment variable.
- `--port <port>`, `-p <port>` takes precedence over the `PORT` environment variable.

### `npx rares console`

Boots the application in development mode but does not start the web server.
Instead, an interactive console will open up, giving you access to `App`.

## File structure

### Root directory

This is the root directory for the application,
all other paths will be resolved relative to this directory.

Root directory is determined as the following (first applicable takes precedence):
1. Directory, specified in `dir` field of `rares.config.js` file (if it was found).
2. Directory, where the `rares.config.js` is located (if it was found).
3. Current working directory.

### `rares.config.js`

Before booting the application, Rares looks up the `rares.config.js` file,
starting from the current working directory and going up the tree. If the file is not found,
then Rares assumes default config.

```js
// rares.config.js
module.exports = App => {
  return {
    // Override the path to the root directory, relative to this file.
    // Should be left unspecified unless you have a good reason.
    dir: '.',

    // Whether to enable or disable certain features.
    features: {
      secrets: false,
    },
  };
};
```

### `config/routes.js`

This file defines the API surface of the application, and converts a request URL into a call to the corresponding action
of the corresponding controller.

The general format is:

```js
// config/routes.js
module.exports = App => {
  const { get } = App.Router;
  return [
    get('/', { controller: 'index', action: 'index' }),
  ];
};
```

See how to define routes in the [Router API section](#router).

### `config/secrets.js`

::: tip
This is an optional feature, and needs to be enabled with `secrets: true` in the feature config.
:::

This file defines the secret values for every environment.

The general format is:

```js
// config/secrets.js
module.exports = App => {
  return {
    [environmentName]: {
      secretKeyBase: 'some-thirty-two-character-string', // This is required secret
      [customKey]: customValue, // Other keys are up to you, values can be of any type
    },
  };
};
```

### `controllers`

This folder contains controllers that handle requests.

The general format of the controller is:

```js
// controllers/controller.js
module.exports = App => class extends App.Controller {
  async [actionName]() {
    return response;
  }
};
```

Controllers can extend from other controllers:

```js
// controllers/application.js
module.exports = App => class extends App.Controller {
  // ...
};

// controllers/home.js
module.exports = App => class extends App.load('controllers/application') {
  // ...
};
```

## App

### `App.env`

Contains the name of the current environment (e.g. `development`, `test`, `production`).

### `App.config`

Contains the current configuration.

### `App.secrets`

Contains the secrets for current environment.

### `App.resolve`

Resolves file paths relative to application [root directory](#root-directory).

Full signature: `(relativePath: String) -> absolutePath: String`.

### `App.load`

Lets you load other Rares modules via a path, relative to the [root directory](#root-directory).

Full signature: `(path: String) -> Value`.

Rares modules are build on top of regular Node modules. To count as a Rares module,
Node module should export a function with signature `App -> Value`.
The type of returned value can be anything that is appropriate for the module.

The returned value is enhanced depending on the kind module, e.g. `$setup` is called for controller.

Example:
```js
// lib/value.js
module.exports = App => 1;

// lib/value-squared.js
module.exports = App => {
  const value = App.load('lib/value');
  return Math.pow(x, value);
};
```

In development mode, Rares tracks changes made to module files and reload them when needed.

## Router

### `App.Router[verb]`

<!-- @TODO: Make search find things like `get` -->

Defines an endpoint that responds to corresponding HTTP verb.

Full signature: `(path: String, options: Optional<Object>) -> RouteNode`

Supported verbs:
- `get` corresponds to HTTP GET.
- `post` corresponds to HTTP POST.
- `put` corresponds to HTTP PUT.
- `patch` corresponds to HTTP PATCH.
- `del` corresponds to HTTP DELETE.

Arguments:
- `path` — Determines the url this route will match.
- `options.controller: String` — Name of the controller to use.
- `options.action: String` — Name of the controller action to use, defaults to the value of `path`.

The value of `path` can:
- Be a literal url section, e.g. `/`, `/about/contacts`.
- Be a simple name, e.g. `details`.
- Contain parameters, e.g. `users/:userId`.

Example:
```js
// config/routes.js
module.exports = App => {
  const { get, post } = App.Router;
  return [
    get('/', { controller: 'index', action: 'index' }),
    get('details', { controller: 'index' }),
    post('users', { controller: 'users', action: 'create '}),
    get('users/:userId', { controller: 'users', action: 'show' }),
  ];
};
```

### `App.Router.scope`

Prepends `path` to the children routes.

Full signature: `(path: String, children: Array<RouteNode>) -> RouteNode`.

Example:
```js
// config/routes.js
module.exports = App => {
  const { scope, get, put, del } = App.Router;
  return [
    scope('api', [
      get('profile', { controller: 'profile', action: 'show' }),
      put('profile', { controller: 'profile', action: 'update' }),
      del('profile', { controller: 'profile', action: 'destroy' }),
    ]),
  ];
};
```

<!-- ## @TODO: Resources -->

## Controller class

### `App.Controller.$setup`

If a controller has a static `$setup` method, it will be automatically called when the controller is [loaded](#app-load).

### `App.Controller[hook]`

<!-- @TODO: Make search find things like `beforeAction` -->

Sets up a hook to be called at a particular moment during the action processing.

There are four available hooks:
- `$beforeAction` — Hook handler will be called before the action.
- `$afterAction` — Hook handler will be called after the action.
- `$aroundAction` — Hook handler will be called around the action.
- `$rescueFrom` — Hook handler will be called when exception is thrown.

Full signature: `(handler: String | Function, options: Optional<Object>) -> None`

Arguments:
- `handler` — The hook handler, will be called with controller instance as `this`.
  - When `Function`, then the given function will be the handler.
  - When `String`, then the named controller method will be the handler.
- `options.args: Array<Any>` — A list of arguments to call the handler with.
- `options.only: String | Array<String>` — A whitelist of actions.
- `options.except: String | Array<String>` — A blacklist of actions.
- `options.matches: Match | Array<Match>` — A whitelist of error predicates.
  - `Match = String | Class | (err: Error) -> Boolean` — A single predicate.

Hook signatures:
- `$beforeAction` — `async (...args) -> None`
- `$afterAction` — `async (...args) -> None`
- `$rescueFrom` — `async (err: Error, ...args) -> None`
- `$aroundAction` — `async (delegate: Delegate, ...args) -> Response`
  - `Delegate = async () -> Response` — Call it to delegate the execution to the original action.

Examples:
```js
// controllers/application.js
module.exports = App => class extends App.Controller {
  static $setup() {
    // @NOTE: makes current user available in subclassed controllers
    this.$beforeAction(async function() {
      const userId = await this.$load('userId'); // @NOTE: from session
      if (userId != null) {
        const User = App.load('models/user');
        this.currentUser = await User.find(userId); // @NOTE: from database
      }
    });
  }
};
```
```js
// controllers/application.js
const Rollbar = require('rollbar');
const rollbar = new Rollbar({
  accessToken: 'POST_SERVER_ITEM_ACCESS_TOKEN',
});

module.exports = App => class extends App.Controller {
  static $setup() {
    // @NOTE: reports unhandled exceptions to rollbar
    this.$rescueFrom(async function(err) {
      rollbar.error(err);
      throw err;
    });
  }
};
```
```js
// controllers/application.js
module.exports = App => class extends App.Controller {
  static $setup() {
    // @NOTE: logs every action with time and response information
    this.$aroundAction(async function(delegate) {
      const name = `${this.$controller}:${this.$action}`;
      const start = new Date();
      try {
        const response = await delegate(); // @NOTE: run the action (or other hooks)
        const end = new Date();
        const timestamp = end.toISOString();
        console.log(`[${timestamp}] ${name} succeeded in ${end - start}ms`);
        return response; // @NOTE: continue normal processing
      }
      catch (err) {
        const end = new Date();
        const timestamp = end.toISOString();
        console.error(`[${timestamp}] ${name} failed in ${end - start}ms: ${err.message}`);
        throw err; // @NOTE: continue normal processing
      }
    });
  }
};
```

## Controller instance

### `$controller`

Contains the name of the current controller.

### `$action`

Contains the name of the current action.

### `$params`

Contains the params of the current request. Params are merged from all sources (query string, route segments,
json payload). Query string and route segment params are additionally passed through a JSON parser if possible.

Full signature: `Hash<name: String, value: Any>`.

Example:
```js
// config/routes.js
module.exports = App => {
  const { get, post } = App.Router;
  return [
    get('echo', { controller: 'home' }),
    get('echo/:echoId', { controller: 'home', action: 'echo' }),
    post('echo', { controller: 'home' }),
    post('echo/:echoId', { controller: 'home', action: 'echo' }),
  ];
};

// controllers/home.js
module.exports = App => class extends App.Controller {
  async echo() {
    return this.$params;
  }
};

// `GET /echo?a=1` will return `{ a: 1 }`
// `GET /echo/0?a=1` will return `{ echoId: 0, a: 1 }`
// `POST /echo` with body `{ b: 2 }` will return `{ b: 2 }` 
// `POST /echo/0?a=1` with body `{ b: 2 }` will return `{ echoId: 0, a: 1, b: 2 }` 
```

### `$response`

Constructs a `Response` with additional information. When you just return a value from the controller action,
it gets wrapped into `Response` with default values.

Full signature: `(body: Any, options: Optional<Object>) -> Response`

Arguments:
- `body: Any` — The body of the response.
- `options.type: String` — Content type of the response. Default will be `application/json`.
- `options.status: Number` — Status code of the response. Default is `200`.
- `options.headers: Hash<name: String, value: String>` — Additional HTTP headers of the response.

Example:
```js
// controllers/about.js
const fs = require('fs');
module.exports = App => class extends App.Controller {
  async text() {
    return this.$response('The cake is a lie', {
      type: 'text/plain',
      status: 418,
      headers: { 'X-Powered-By': 'Rares' },
    });
  }
  async file() {
    const stream = fs.createReadStream(App.resolve('static/image.png'));
    return this.$response(stream, { type: 'image/png' });
  }
};
```

### `$store`

::: tip
This is an optional feature, and needs to be enabled with `secrets: true` in the feature config.
:::

Store value in the client session.

Full signature: `async (key: String, value: Any) -> Null`.

### `$load`

::: tip
This is an optional feature, and needs to be enabled with `secrets: true` in the feature config.
:::

Load value from the client session.

Full signature: `async (key: String) -> Any`.
