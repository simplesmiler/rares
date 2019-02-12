const Boom = require('boom');

module.exports = Contoller => {
  Contoller.$extend({
    async $can(action, subject) {
      if (!this.currentAbility) return false;
      return this.currentAbility.$can(action, subject, this);
    },

    async $authorize(action, subject) {
      const allowed = await this.$can(action, subject);
      if (!allowed) {
        throw Boom.forbidden('You do not have access to this resource');
      }
    },
  });
};
