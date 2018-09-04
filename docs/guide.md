---
sidebar: auto
---

# Guide

This guide assumes that you have some prior knowledge of Node.js and modern JavaScript and have some experience with the command line.

The guide is split in three parts.
First one goes over the basics of Rares.
Second one provides a complete example of building an API.
Third one fills you in on some concepts that did not fit into the example.   

## Basics

In this part we will build a simplistic API to cover basic concepts of Rares.

### Installation

1. Create a new directory and open it in the terminal.
2. Run `npm init` to set up the Node.js project.
3. Run `npm install rares` to add Rares as a dependency and install necessary files.
4. Run `npx rares dev` to start Rares in development mode. It will complain about some missing files, but we are about to fix that.

@TODO(unscheduled): Talk about `npx rares init` which would create the necessary files.
@TODO(unscheduled): Talk about `rares.config.js` and other configuration.

### Routes

A core concepts of Rares are routes, they define the API surface. Routes live in the `config/routes.js` file.
Create this file, and let's make a couple endpoints:

```js
// config/routes.js
module.exports = (App, Rares) => {
  const { get, post } = Rares.Router;
  return [
    get('/', { controller: 'home', action: 'index' }),
    post('echo', { controller: 'home' }),
  ];
};
```

As you can see, we export a function with `(App, Rares) -> Value` signature, with `Value` in this case being an array.
The exact structure of this array is an implementation detail, so you should not worry about it too much.
And the signature allows us to access things without requiring them directly, like the `Rares.Router` we are accessing here.
If you want details, read the [Loading](#loading) section.

The `get` route above exposes the `GET /` endpoint, and associates it with the `index` action of the `home` controller,
and the `post` route exposes `POST /echo` with action `echo` of controller `home`.

### Controllers

While routes define the API surface, controller is what handles actual incoming requests.
In the routes we mapped `GET /` and `POST /echo` to actions `index` and `echo` of the controller `home`,
which is expected to be located at `app/controllers/home.js`. Let's create this controller:

```js
// app/controllers/home.js
module.exports = (App, Rares) => class extends Rares.Controller {
  async index() {
    return { message: 'Welcome!' };
  }
  async echo() {
    return this.$params;
  }
};
```

Again, we see this `(App, Rares) -> Value` signature, but this time the `Value` is an anonymous class,
that extends the base class `Rares.Controller` and defines actions. Let's talk more about these.

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

@TODO(v0.2): Talk about database configuration and migrations.

### Models and abilities (WIP)

@TODO(v0.2): Talk about models and abilities.

### Resource Routes

Let's define routes for the products.

```js{6}
// config/routes.js
module.exports = (App, Rares) => {
  const { post, resources } = Rares.Router;
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

@TODO(v0.2): Review the example and explanation below.

Now on to products controller:

```js
// app/controllers/product.js
module.exports = (App, Rares) => class extends Rares.Controller {
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

@TODO(v0.2): Finish the shop example.

## Extra credits

Things that are did fit into the example of building the shop API. 

### Responses (WIP)

@TODO(v0.3): Review after making response tool better.

To return the result with specific headers or specific HTTP status, Rares provides you with response utility:

```js
module.exports = (App, Rares) => class extends Rares.Controller {
  async index() {
    const message = 'Demoing http statuses and headers';
    const headers = { 'X-Custom-Header': 'Custom header with value' };
    return this.$response({ message }, { status: 400, headers }); 
  }
};
```

### Secrets and sessions

To associate data with the current client, Rares provide you with a storage utility:

```js
// app/controllers/session.js
module.exports = (App, Rares) => class extends Rares.Controller {
  async store() {
    await this.$store(this.$params.key, this.$params.value);
    return { value: await this.$load(this.$params.key) }; 
  }
  async load() {
    return { value: await this.$load(this.$params.key) };
  }
};
```

You can store arbitrary `JSON.stringify`-able data. Under the hood, the data is stored in encrypted user cookie, so it will survive the server restart without a need to a session storage like Redis.
But for this to work, you have to provide a `secretKeyBase` in your `config/secrets.js` file:

```js
// config/secrets.js
module.exports = (App, Rares) => {
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

### Authentication and authorization (WIP)

@TODO(v0.3): Talk about it after documenting models, integrate into the shop example.

### Loading

Pretty much every file you write in Rares will have the special `(App, Rares) => Value` signature.

This is the way Rares implements it's custom module loading mechanism.
The `App` is the instance of your application, and the `Rares` contains everything that does not fit on the instance.

You can load other modules with `App.Load('path/to/module')` with paths relative to the `/app` folder.

Benefits of this approach:

- Modules do not depend on singletons, making them really easy to test.
- Exported values are auto-enhanced. For classes, the static `$setup` method is called during loading. 
- @TODO(unscheduled): Code is hot-reloaded when running in development mode.

@TODO(unscheduled): Talk details about `$setup`.

### Action hooks

To perform something that does not belong to a single action, you can use action hooks:

```js
// app/controllers/items.js
module.exports = (App, Rares) => class extends Rares.Controller {
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

### Controller inheritance

Besides extending the base `Rares.Controller`, you can extend your own controllers.

```js
// app/controllers/application.js
let nextRequestId = 1;
module.exports = (App, Rares) => class extends Rares.Controller {
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
// app/controllers/index.js
module.exports = (App, Rares) => class extends App.Load('controllers/application') {
  async index() {
    return { message: 'Hello!' }; 
  }
};
```

Now every action of every controller that extends from the `application` controller will be logged.
As you see, combination of action hooks and controller inheritance is very powerful.

### Scoping and namespacing (WIP)

Sometimes you want to scope endpoints under a certain path without affecting controller paths.
Common use case is scoping API endpoints under `/api`. 

You can use `scope` to do that:

```js
// config/routes.js
module.exports = (App, Rares) => {
  const { scope, get } = Rares.Router;
  return [
    scope('api', [
      get('/', { controller: 'home', action: 'index' }),
      get('alpha', { controller: 'home' }),
    ]),
  ];
};
```

@TODO(v0.3): Talk about namespaces and four different outcomes of scope * namespace.

### Application and environment (WIP)

@TODO(v0.3): Talk about configuration hooks.
