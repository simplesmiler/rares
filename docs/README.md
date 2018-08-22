---
home: true
actionText: Get Started →
actionLink: /guide/
features:
- title: Simple and easy
  details: Install a single dependency and start building, no more steps required.
- title: Embrace conventions
  details: Save your time and time of others, most of the problems are already solved.
- title: Build API
  details: Focus on models and controllers, and leave the view part to the frontend.
footer: ISC Licensed | Copyright © 2018 Denis Karabaza
---

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
# Server running at: http://localhost:3000
```

Use the app:

```bash
curl http://localhost:3000/memory
# { "value": null }

curl -X PUT http://localhost:3000/memory?value=hello
# { "value": "hello" }

curl http://localhost:3000/memory
# { "value": "hello" }
```

::: warning
COMPATIBILITY NOTE: Rares requires Node.js >= 8.
:::
