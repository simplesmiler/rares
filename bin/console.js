const REPL = require('repl');
const Tales = require('..');

async function main() {
  let App = await Tales.create();

  // @REFERENCE: https://github.com/balderdashy/sails/blob/v1.0.0-41/bin/sails-console.js

  let repl = REPL.start({
    // Set the REPL prompt.
    prompt: `tales(${ process.env.NODE_ENV || 'development' })> `,
    // Allow the REPL to use the same global space as the Sails app, giving it access
    // to things like globalized models.
    useGlobal: true,
    // Set `terminal` to true to allow arrow keys to work correctly,
    // even when we're using a custom output stream.  Otherwise pressing
    // the up arrow just outputs ^[[A instead of accessing history.
    terminal: true,
  });

  repl.context.App = App;

  return await new Promise(async function(resolve, reject) {
    // Bind a one-time-use handler that will run when the REPL instance emits its "exit" event.
    repl.once('exit', function(err) {
      err ? reject(err) : resolve();
    });
  });
}

main()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
