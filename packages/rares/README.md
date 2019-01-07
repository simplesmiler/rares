# Rares

Rares helps you build API backend faster.

# Why yet another framework?

**TL;DR:** because convention is better than bikeshedding. 

Despite their claims, [express](https://expressjs.com/) and [hapi](https://hapijs.com/) are not application frameworks, but rather **http frameworks**. They liberally avoid you application code, providing you with flexibility, but wasting human resources on hidden costs.

Rares is a proper **application framework**. It gives your application code the foundation and structure, leaving less room for opinion.

# Getting started

Install:

```bash
npm install rares
```

Simple app:

```js
// config/routes.js
module.exports = (App, Rares) => {
  const { resource } = Rares.Router;
  return [
    resource('memory', { only: ['show', 'update'] }), 
  ];
};
```

```js
// app/controllers/memory.js
module.exports = (App, Rares) => {
  let value = null; // @NOTE: in the real world you would have a data store

  return class MemoryController extends Rares.Controller {

    async show() {
      return { value };
    }

    async update() {
      value = this.$params.value;
      return { value };
    }

  };
};
```

Run the app in development mode:

```bash
npx rares dev
> Server running at: http://localhost:3000
```

Use the app:

```bash
curl http://localhost:3000/memory
> { "value": null }

curl -X PUT http://localhost:3000/memory?value=hello
> { "value": "hello" }

curl http://localhost:3000/memory
> { "value": "hello" }
```

# Contribute

- Issue Tracker: [GitHub Issues](https://github.com/simplesmiler/rares/issues)
- Source Code:
  - Core: [rares](https://github.com/simplesmiler/rares/tree/master/packages/rares) 
  - Bindings for Hapi: [hapi-rares](https://github.com/simplesmiler/rares/tree/master/packages/hapi-rares) 
  - Bindings for Express: [express-rares](https://github.com/simplesmiler/rares/tree/master/packages/express-rares) 

# License

The project is licensed under the ISC license.
