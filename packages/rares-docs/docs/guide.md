---
sidebar: auto
---

# Guide

This guide assumes that you have some prior knowledge of Node.js and modern JavaScript and have some experience with the command line.

## Basics

In this part we will build a simplistic API to cover basic concepts of Rares.

### Installation

1. Create a new directory and open it in the terminal.
2. Run `npm init` to set up the Node.js project.
3. Run `npm install rares` to add Rares as a dependency and install necessary files.
4. Run `npx rares dev` to start Rares in development mode. It will complain about some missing files, but we are about to fix that.

<!--
@TODO(0.4): Talk about `npx rares init` which would create the necessary files.
-->

### Routes

A core concepts of Rares are routes, they define the API surface. Routes live in the `config/routes.js` file.
Create this file, and let's make a couple endpoints:

```js
// config/routes.js
module.exports = App => {
  const { get, post } = App.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
    post('echo', { controller: 'home' }),
  ];
};
```

As you can see, we export a function with `App -> Value` signature, with `Value` in this case being an array.
The exact structure of this array is an implementation detail, so you should not worry about it too much.
And the signature allows us to access things without requiring them directly, like the `App.Router` we are accessing here.
If you want details, read the [Loading](#loading) section.

The `get` route above exposes the `GET /` endpoint, and associates it with the `index` action of the `home` controller,
and the `post` route exposes `POST /echo` with action `echo` of controller `home`.

### Controllers

While routes define the API surface, controller is what handles actual incoming requests.
In the routes we mapped `GET /` and `POST /echo` to actions `index` and `echo` of the controller `home`,
which is expected to be located at `controllers/home.js`. Let's create this controller:

```js
// controllers/home.js
module.exports = App => class extends App.Controller {
  async index() {
    return { message: 'Welcome!' };
  }
  async echo() {
    return this.$params;
  }
};
```

Again, we see this `App -> Value` signature, but this time the `Value` is an anonymous class,
that extends the base class `App.Controller` and defines actions. Let's talk more about these.

### Actions

Rares actions are just functions that return the response, with `this` inside an action being the instance of the controller.
Without going into details, anything you return or throw from the action will be handled appropriately depending on its type.

Actions can access params as `this.$params`. Rares does not distinguish between different ways of passing params,
but merges all params it can find into a single object. For example, a request with query string `?hello=world` is not that different from a request with JSON payload `{ "hello": "world" }`.

### It's alive!

Open the terminal, and run `npx rares dev`, and the app will start on [http://localhost:3000/](http://localhost:3000/).
Now open this URL it the browser, and you will hit the `GET /` and see the response of the `index` action.
To try the `POST /echo` endpoint you will have to use a dedicated tool like [Insomnia](https://insomnia.rest/) or [Postman](https://www.getpostman.com/).

::: tip
If you want Rares to listen for different host and port, you can override corresponding environmental variables `HOST` and `PORT`.
One way to do this is to `npm i cross-env` and then `npx cross-env PORT=3001 rares dev` to start the app on `http://localhost:3001`.  
:::

::: tip
App running on `localhost` can only be accessed from your computer.
If you want it to be accessible over the network (e.g. show to a friend or run in staging/production),
you have to use the network IP as the host, or you can use the universal `0.0.0.0` host.
::: 

<!--
## Advanced

Now that we know the basics, let's practice by building a shop API. The stories we need to cover:

- User can see available products
- User has a shopping cart for products
- User can sign up and authenticate
- Authenticated user can checkout to create an order
- Authenticated user can see their orders
- Manager can edit products
- Manager can see all orders
- Manager can update order progress

### Database and migrations (WIP)

@TODO(v0.3): Talk about database configuration and migrations.

### Models and abilities (WIP)

@TODO(v0.3): Talk about models and abilities.

### Resource Routes

Let's define routes for the products.

```js{6}
// config/routes.js
module.exports = App => {
  const { post, resources } = App.Router;
  return [
    post('echo', { controller: 'home' }),
    resources('products'),
  ];
};
```

The `resources('products')` exposes REST-ish endpoints under the `/products` route, and associates them with the following actions of the `products` controller:

| Route                         | Action                   | Meaning                |
| ---                           | ---                      | ---                    |
| `GET /products`               | `index`                  | Get a list of products |
| `GET /products/:productId`    | `show`                   | Get a single product   |
| `GET /products/new`           | `new`                    | Get a product scaffold |
| `POST /products`              | `create`                 | Create new product     |
| `PUT /products/:productId`    | `update`                 | Update a product       |
| `DELETE /products/:productId` | `destroy`                | Remove a product       |

These are conventional REST endpoints, with an exception of the `/new`.
But providing an endpoint with default values for creating a resource is such a common use case for an API, that Rares includes it by default.
You can also add your own endpoints, but we will talk about that later.

### Resource Controllers (WIP)

@TODO(v0.3): Review the example and explanation below.

Now on to products controller:

```js
// controllers/product.js
module.exports = App => class extends App.Controller {
  static $setup() {
    // @NOTE: `this` here is the controller class
    this.$resource();
  }
  
  productParams() {
    return _.pick(this.$params.product, ['title', 'price']);
  }
};
```

Here we see a few new concepts. First, the static `$setup` method is run when the class is loaded by Rares, and allows you to extend the behavior of the class. 

One such extension is `$resource`, which does:

- Load the matching resource appropriately, so that it is accessible through `this`.
- Authorize access to the resource by the current authenticated user.
- Create default actions to match REST-ish endpoints defined by the `resources` route (see the table above).

You can also see `productParams`, and it is used by the default implementation of the `new`, `create` and `update` actions.

@TODO(v0.3): Finish the shop example.
-->

## Extra credits

### Loading

Pretty much every file you write in Rares will have the special `App -> Value` signature.

This is the way Rares implements it's custom module loading mechanism. The `App` is the instance of your application.

You can load other modules with `App.Load('path/to/module')` with paths relative to the app root directory.

Benefits of this approach:

- Modules do not depend on singletons, making them really easy to test.
- Exported values can be auto-enhanced appropriately. 
- Code can be hot-reloaded when running in development mode.

### Config

You can configure certain aspects of Rares with the `rares.config.js` file placed in the root directory of your application:

```js
// rares.config.js
module.exports = App => {
  return {
    // Override the path to the root directory.
    // Do not do this unless you need to do something unconventional.
    dir: process.cwd(),
    
    // Whether to complain in stdout when there are non-critical issues.
    whiny: true,

    // Whether to enable or disabled certain features.
    features: {
      secrets: false,
    },
  };
};
```
 
### Responses

<!--
@TODO(v0.4): Review after making response tool better.
-->

To return the result with specific headers or specific HTTP status, Rares provides you with response utility:

```js
// controllers/demo.js
module.exports = App => class extends App.Controller {
  async index() {
    const message = 'Demoing http statuses and headers';
    const headers = { 'X-Custom-Header': 'Custom header with value' };
    return this.$response({ message }, { status: 400, headers }); 
  }
};
```

### Environment

Environment represents circumstances, under which the application is running.
Application can act differently based on this value.
Commonly used values are `production`, `development`, and `test`.

Environment value can be accesses as `App.env`.

::: tip
When running the application, you can set this value with `NODE_ENV` environment variable.
When not specified, it defaults to `development`.
:::

### Secrets

Most applications need to store credentials to third party services, access tokens, secure keys.
They are supposed to live in the `config/secrets.js` file:

```js
// config/secrets.js
module.exports = App => {
  return {
    development: {
      secretKeyBase: 'never-use-this-key-base-in-production',
    },
    test: {
      secretKeyBase: 'never-use-this-key-base-in-production',
    },
    production: {
      secretKeyBase: process.env.SECRET_KEY_BASE,
    },
  };
};
```

This feature is experimental, and needs to be enabled with a flag:

```js
// rares.config.js
module.exports = {
  features: {
    secrets: true,
  },
};
```

When secrets are enabled, the `secretKeyBase` secret is required, because it is used internally for other features (e.g. sessions).

In runtime, secrets are available as `App.secrets`.

::: tip
For security reasons, you should never commit this file to the source code repository.
But you can make a template of it with fake or empty values, call it `secrets.example.js` and commit that.
:::

::: tip
It is often a good idea to fetch values from somewhere rather then to store directly.
The "somewhere" may be environment variables, third party secrets store, encrypted files, and so on.
:::

### Sessions

To associate data with clients, Rares provide you with a storage utility:

```js
// controllers/session.js
module.exports = App => class extends App.Controller {
  async store() {
    await this.$store(this.$params.key, this.$params.value);
    return { value: await this.$load(this.$params.key) }; 
  }
  async load() {
    return { value: await this.$load(this.$params.key) };
  }
};
```

The values are stored per client, and can be any `JSON.stringify`-able data. Under the hood, the data is stored in encrypted user cookie, so it will survive the server restart without a need to a session storage like Redis.

::: tip
Sessions utility depends on secrets, so you have to enable them in the config.
:::

<!--
### Authentication and authorization (WIP)

@TODO(v0.4): Talk about it after documenting models, integrate into the shop example.
-->

### Controller extensions

When a controller has a static method `$setup`, Rares will call this method when the controller is loaded.

During the `$setup`, other static methods can be called. Such methods are referred to as controller extensions,
and Rares provides a few.

### Action hooks

Action hooks are controller extensions that allow you to attach extra behavior to other actions:

```js
// controllers/items.js
module.exports = App => class extends App.Controller {
  static $setup() {
    this.$beforeAction('preloadData');
  }
  async index() {
    return { items: this.items };
  }
  async show() {
    return { item: this.items.find(item => item.id === params.itemId) };
  }
  // private
  async preloadItems() {
    this.items = [
      { id: 1, name: 'Apple' },
      { id: 2, name: 'Banana' },
    ];
  }
};
```

Paired with `$beforeAction`, there is `$afterAction`.
Also there is `$rescueFrom` for recovering from exceptions in actions,
and generic `$aroundAction`, with which you can do all of the above.

By default, action hooks are applied to all actions,
but they can be scoped to specific actions using `only` and `except` options.

### Controller inheritance

Besides extending the base `App.Controller`, you can extend your own controllers.

```js
// controllers/application.js
let nextRequestId = 1;
module.exports = App => class extends App.Controller {
  static $setup() {
    this.$aroundAction('wrapAction');
  }
  // private
  async wrapAction(fn) {
    const id = nextRequestId++; // @NOTE: make unique id to track the request in logs
    console.log(`${id}: Handler: ${this.$controller}#${this.$action}`); 
    console.log(`${id}: Params:`, this.$params);
    // @NOTE: catch exception to log them
    try {
      const response = await fn(); // @NOTE: call original action
      console.log(`${id}: Success:`, response);
      return response;
    }
    catch (err) {
      console.log(`${id}: Fail:`, err);
      throw err;
    }
  }
};
```

```js
// controllers/index.js
module.exports = App => class extends App.Load('controllers/application') {
  async index() {
    return { message: 'Hello!' }; 
  }
};
```

Now every action of every controller that extends from the `application` controller will be logged.
As you see, combination of action hooks and controller inheritance is very powerful.

### Scoping

Sometimes you want to scope endpoints under a certain path without affecting controller paths.
Common use case is scoping API endpoints under `/api`. 

You can use `scope` to do that:

```js
// config/routes.js
module.exports = App => {
  const { scope, get } = App.Router;
  return [
    scope('api', [
      get('/', { controller: 'home', action: 'index' }),
      get('alpha', { controller: 'home' }),
    ]),
  ];
};
```

<!--
@TODO(0.3): Talk about namespaces and four different outcomes of scope * namespace.
-->

<!--
### Bootstrap (WIP)

@TODO(v0.4): Talk about bootstrap.
-->
