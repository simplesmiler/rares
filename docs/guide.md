---
sidebar: auto
---

# Guide

This guide provides an example of building an app with Rares.
It assumes that you have some prior knowledge of Node.js and JavaScript and have some experience with the command line.

## Getting started

To get familiar with Rares, we will build a simple shop API. The stories we need to cover:

- User can see available products
- User has a shopping cart for products
- User can checkout to create an order
- User can see their orders
- Manager can edit products
- Manager can see all orders
- Manager can update order progress

## Basics

### Installation

First, create a new directory. Open it in the terminal and run `npm init` inside to set up the project.
Then run `npm install rares` to add Rares as a dependency. Now you can run `npx rares dev` to verify that it's working.
It will complain about some missing files, but we are about to fix that.

### Routes

A core concepts of Rares are routes, they define the API surface. Routes live in the `config/routes.js` file.
Create this file, and let's make an echo endpoint so that we can test if our API is working at all:

```js
// config/routes.js
module.exports = (App, Rares) => {
  const { post } = Rares.Router;
  return [
    post('echo', { controller: 'home' }),
  ];
};
```

As you can see, we export a function with `(App, Rares) -> Value` signature, with `Value` in this case being an array.
The exact structure of this array is an implementation detail, so you should not worry about it too much.

This signature is an example of the technique called dependency injection, and you will see this signature many times when working with Rares.
The `App` is the instance of your application, and the `Rares` can be seen for now as a bag of useful goodies,
like the `Rares.Router` we are using here.

### Controllers

The `post('echo', ...)` route exposes the `POST /echo` endpoint, and associates it with the `echo` action of the `home` controller,
which is then expected to be located at `app/controllers/home.js`.
 
Let's create this controller:

```js
// app/controllers/home.js
module.exports = (App, Rares) => class extends Rares.Controller {
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

## Advanced

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

Things that are not fit into the guide yet. 

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
module.exports = (App, Rares) => class extends Rares.Controller {
  async store() {
    await this.$store('value', this.$params.value);
    return { value: this.$params.value }; 
  }
  async load() {
    return { value: await this.$load('value') };
  }
};
```

But for this to work, you have to provide a `secretKeyBase` in your `config/secrets.js` file:

```js
// config/secrets.js
module.exports = (App, Rares) => {
  return {
    development: {
      secretKeyBase: 'never-use-this-key-base-in-production',
    },
    production: {
      secretKeyBase: process.env.SECRET_KEY_BASE,
    },
  };
};
```

You can store arbitrary `JSON.stringify`-able data. Under the hood, the data is stored in encrypted user cookie, so it will survive the server restart without a need to a session storage like Redis.

### Action hooks

To perform something that does not belong to a specific action (e.g. generic logging and analytics), you can use action hooks:

```js
let nextRequestId = 1;

module.exports = (App, Rares) => class extends Rares.Controller {
  static $setup() {
    this.$aroundAction(function(fn) {
      const id = nextRequestId++; // @NOTE: make unique id to track the request
      console.log(`${id}: Controller: ${this.$controller}#${this.$action}`); 
      console.log(`${id}: Params:`, this.$params);
      try {
        const response = await fn(); // @NOTE: call original action
        console.log(`${id}: Success:`, response);
        return response;
      }
      catch (err) {
        console.log(`${id}: Fail:`, err);
        throw err;
      }
    });
  }
};
```

Now every action of this controller will be logged. This is a very powerful mechanism, especially in combination with the controller inheritance. Besides the generic `$aroundAction`, there are also three more specialized hooks: `$beforeAction`, `$afterAction`, and `$rescueFrom`.   

### Nesting (WIP)

@TODO: Talk about scopes and namespaces.

### Application and environment (WIP)

@TODO: Talk about configuration hooks.

### Loader (WIP)

@TODO: Talk more about the signature, loading and `$setup`.
