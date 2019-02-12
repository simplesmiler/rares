const Boom = require('boom');

module.exports = Contoller => {
  Contoller.$extend({
    async $signIn(id) {
      await this.$store('auth', id);
      await this.$authenticate();
    },

    async $signOut() {
      await this.$clear('auth');
      await this.$deauthenticate();
    },

    async $signedAs() {
      return await this.$load('auth');
    },

    async $authenticate(hard = false) {
      const id = await this.$signedAs();
      if (hard && id == null) {
        throw Boom.unauthorized('No auth signature');
      }

      const user = await this.$app.Load(`models/user`).findByPrimary(id);
      if (hard && user == null) {
        throw Boom.unauthorized('Did not find a user with given a auth signature');
      }
      this.currentUser = user;

      const ability = await this.$app.Load('lib/ability').$for(user);
      this.currentAbility = ability;
    },

    async $deauthenticate() {
      this.currentUser = null;
      this.currentAbility = null;
    },
  });
};
