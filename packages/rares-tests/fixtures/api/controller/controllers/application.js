module.exports = App => {
  // @NOTE: Part of rollbar mock
  const rollbarMock = {
    reports: [],
    async error(request, error) {
      this.reports.push({ url: request.url, message: error.message });
    },
  };

  const timeMock = {
    reports: [],
    async log(text) {
      this.reports.push({ text });
    },
  };

  return class extends App.Controller {
    static $setup() {
      // @NOTE: $beforeAction example
      // @NOTE: makes current user available in subclassed controllers
      this.$beforeAction(async function() {
        const userId = await this.$load('userId'); // @NOTE: from session
        if (userId != null) {
          const User = App.load('models/user');
          this.currentUser = await User.find(userId); // @NOTE: from database
        }
      });

      // @NOTE: $rescueFrom example, except we use a mock of rollbar, and wrap the error to not spam the test log
      // @NOTE: reports unhandled exceptions to rollbar
      this.$rescueFrom(async function(err) {
        await rollbarMock.error(this.$request, err);
        throw App.Boom.internal(err);
      });

      // @NOTE: $aroundAction example, except we record instead of logging, and skip recording for a particular controller
      // @NOTE: logs every successful action with time information
      this.$aroundAction(async function(delegate) {
        const name = `${this.$controller}:${this.$action}`;
        const start = new Date();
        try {
          const response = await delegate(); // @NOTE: run the action (or other hooks)
          const end = new Date();
          const timestamp = end.toISOString();
          if (this.$controller !== 'times') {
            await timeMock.log(`[${timestamp}] ${name} took ${end - start}ms`);
          }
          return response; // @NOTE: continue normal processing
        }
        catch (err) {
          throw err; // @NOTE: continue normal processing
        }
      });
    }

    // private

    $getRollbarMock() {
      return rollbarMock;
    }

    $getTimeMock() {
      return timeMock;
    }
  };
};
