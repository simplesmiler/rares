# Rares

Rares helps you build API backend faster.

# Why yet another framework?

**TL;DR:** because convention is better than bikeshedding. 

Despite their claims, [express](https://expressjs.com/) and [hapi](https://hapijs.com/) are not application frameworks, but rather **http frameworks**. They liberally avoid you application code, providing you with flexibility, but wasting human resources on hidden costs.

Rares is a proper **application framework**. It gives your application code the foundation and structure, leaving less room for opinion.

# Not sold yet?

- Rares will be familiar if you have Ruby on Rails background

# Installation

Install:

```sh
# npm install --save rares
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
  let memory = { value: null }; // @NOTE: in the real world you would have a data store

  return class MemoryController extends Rares.Controller {

    async show() {
      return memory;
    }

    async update() {
      return memory = this.$body;
    }

  };
};
```

Run the app in development mode:

```sh
# npx rares dev
```

Perform some requests:

```sh
# curl http://localhost:3000/memory
```

# Contribute

- Issue Tracker: https://github.com/simplesmiler/rares/issues
- Source Code: https://github.com/simplesmiler/rares

# License

The project is licensed under the ISC license.
