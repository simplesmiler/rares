const fs = require('fs');

module.exports = App => class extends App.Controller {
  async text() {
    return this.$response('The cake is a lie', {
      type: 'text/plain',
      status: 418,
      headers: { 'X-Powered-By': 'Rares' },
    });
  }

  async file() {
    const stream = fs.createReadStream(App.resolve('static/image.png'));
    return this.$response(stream, { type: 'image/png' });
  }
};
