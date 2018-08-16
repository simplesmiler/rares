const path = require('path');
const fs = require('fs');
const Umzug = require('umzug');

// === //

module.exports = async function(dir, sequelize) {

  // == @SECTION: check migrations == //

  let migrationsDir = path.resolve(dir, 'db/migrate');

  try {
    let rc = require(path.resolve(process.cwd(), '.sequelizerc'));
    migrationsDir = rc['migrations-path'];
  }
  catch (err) {
    console.warn('Failed to require .sequelizerc file, continuing without it');
  }

  let pending = [];

  if (fs.existsSync(migrationsDir)) {
    let umzug = new Umzug({
      storage: 'sequelize',
      storageOptions: { sequelize },
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
    throw new Error('Can not start the server, some migrations are pending');
  }

  // == @SECTION: init and associate models == //

  let modelsDir = path.resolve(dir, 'app/models');

  if (fs.existsSync(modelsDir)) {
    let models = {};
    fs
      .readdirSync(modelsDir)
      .filter(file => {
        return file.slice(-3) === '.js';
      })
      .forEach(file => {
        let Model = require(path.join(modelsDir, file));
        let attributes = Model.attributes ? Model.attributes() : {};
        let options = Model.options ? Model.options() : {};
        options.sequelize = sequelize;
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
