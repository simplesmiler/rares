module.exports = (App, Rares) => {

  return class extends Rares.Controller {
    static $setup() {
      this.$aroundAction('aroundAction', { only: 'around' });
      this.$beforeAction('beforeAction', { only: 'before' });
      this.$afterAction('afterAction', { only: 'after' });
      this.$rescueFrom('rescueFrom', { only: 'rescue' });
    }

    async around() {
      if (this.$params.expected === 'success') {
        return { from: 'hooks#around' };
      }
      else {
        throw new Error('from: hooks#around');
      }
    }

    async aroundAction(fn) {
      this.response = {};
      this.response.handler = `${this.$controller}#${this.$action}`;
      this.response.params = this.$params;
      try {
        const result = await fn(); // @NOTE: call original action
        this.response.status = 'success';
        this.response.result = result;
        return this.response;
      }
      catch (err) {
        this.response.status = 'failure';
        this.response.error = err.message;
        return this.response;
      }
    }

    async before() {
      return { from: this.from };
    }

    async beforeAction() {
      this.from = 'hooks#beforeAction';
    }

    async after() {
      return { from: 'hooks#after' };
    }

    // @NOTE: Because afterAction hooks can not modify the response, the return from this function will be silently ignored
    async afterAction() {
      return {
        from: 'hooks#afterAction',
      };
    }

    async rescue() {
      throw new Error('from: hooks#rescue');
    }

    async rescueFrom(err) {
      return {
        from: 'hooks#rescueFrom',
        error: err.message,
      };
    }

  };

};
