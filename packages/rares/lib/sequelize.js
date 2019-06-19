const path = require('path');
const fs = require('fs');
const Umzug = require('umzug');

// === //

module.exports = async function(App) {
  const dir = App.config.dir;

  // == @SECTION: check migrations == //

  const migrationsDir = path.resolve(dir, 'db/migrate');
  let pending = [];

  if (fs.existsSync(migrationsDir)) {
    const umzug = new Umzug({
      storage: 'sequelize',
      storageOptions: { sequelize: App.sequelize },
      migrations: {
        path: migrationsDir,
      },
    });

    pending = await umzug.pending();
  }

  else {
    console.warn('Database migration folder is not found, continuing without it');
  }

  if (pending.length) {
    // @TODO: in dev mode, start the server but complain about migrations on every request
    throw new Error('Can not start the server, some migrations are pending');
  }

  // == @SECTION: init and associate models == //

  const modelsDir = path.resolve(dir, 'models');

  if (fs.existsSync(modelsDir)) {
    const models = {};
    fs
      .readdirSync(modelsDir)
      .filter(file => {
        return file.slice(-3) === '.js';
      })
      .map(file => {
        return file.slice(0, -3);
      })
      .forEach(file => {
        const Model = App.load('models/' + file);
        const attributes = Model.attributes ? Model.attributes() : {};
        const options = Model.options ? Model.options() : {};
        options.sequelize = App.sequelize;
        Model.init(attributes, options);
        models[Model.name] = Model;
      });

    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate) {
        models[modelName].associate();
      }
    });
  }

  else {
    console.warn('Models folder is not found, continuing without it');
  }

};
