const inflect = require('inflect');

module.exports = App => {
  App.Controller.$extendStatic({
    $resource(opts) {
      this.$aroundAction({
        async handler(fn) {
          if (opts.load) {
            await this.$loadResource();
          }

          if (opts.authorize) {
            await this.$authorizeResource();
          }

          if (opts.blueprint) {
            if (this[this.$action]) {
              throw new Error(`Can not blueprint action '${this.$action}' on controller '${this.$controller}' because it already exists`);
            }
            return await this.$blueprintResource();
          }
          else {
            return await fn();
          }
        },
      });
    },
  });

  App.Controller.$extend({
    async $loadResource() {
      const Model = this.$app.Load('models/' + this.$model);

      // @TODO: support singleton resource
      // @TODO: support through

      // @REFERENCE: https://github.com/ryanb/cancan/wiki/authorizing-controller-actions

      const loadCollection = ['index'].includes(this.$action); // @TODO: add case for `on: 'collection'`
      const loadNew = ['new', 'create'].includes(this.$action);
      const loadMember = ['show', 'edit', 'update', 'destroy'].includes(this.$action); // @TODO: add case for `on: 'member'`

      const singular = this.$model;
      const plural = inflect.pluralize(this.$model);

      if (loadCollection) {
        this[plural] = await Model.all();
      }
      else if (loadNew) {
        this[singular] = await Model.build(this.$params[singular]);
      }
      else if (loadMember) {
        // @NOTE: DELETE is supposed to be idempotent,
        //        but that doesn't mean that we have to return the same result,
        //        just that further DELETE does not change the state
        this[singular] = await Model.findByPrimary(this.$params[singular + 'Id'], { rejectOnEmpty: true });
      }
      else {
        throw new Error(`Can not load resource for action '${this.$action}' on controller '${this.$controller}'`);
      }
    },

    async $authorizeResource() {
      const create = ['new', 'create'].includes(this.$action);
      const read = ['index', 'show'].includes(this.$action);
      const update = ['edit', 'update'].includes(this.$action);
      const destroy = ['destroy'].includes(this.$action);

      const plural = ['index'].includes(this.$action);
      const singular = ['new', 'create', 'show', 'edit', 'update', 'destroy'].includes(this.$action);

      const action = create && 'create'
        || read && 'read'
        || update && 'update'
        || destroy && 'destroy'
        || null;

      const subject = singular && this[this.$model]
        || plural && this.$app.Load(`models/${this.$model}`)
        || null;

      if (!action || !subject) {
        throw new Error(`Can not authorize resource for action '${this.$action}' on controller '${this.$controller}'`);
      }

      await this.$authorize(action, subject);
    },

    async $blueprintResource() {
      const singular = this.$model;
      const plural = inflect.pluralize(this.$model);

      // @TODO: add status codes to blueprinted actions

      if (this.$action === 'index') {
        return { [plural]: this[plural] };
      }
      else if (this.$action === 'new') {
        return { [singular]: this[singular] };
      }
      else if (this.$action === 'create') {
        await this[singular].save();
        return { [singular]: this[singular] };
      }
      else if (this.$action === 'show') {
        return { [singular]: this[singular] };
      }
      else if (this.$action === 'edit') {
        return { [singular]: this[singular] };
      }
      else if (this.$action === 'update') {
        await this[singular].update(this.$values[singular]);
        return { [singular]: this[singular] };
      }
      else if (this.$action === 'destroy') {
        await this[singular].destroy();
        return null;
      }
      else {
        throw new Error(`Can not blueprint action '${this.$action}' on controller '${this.$controller}'`);
      }
    },
  });
};
