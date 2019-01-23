module.exports = async (App, Rares) => {
  return {
    development: {
      dialect: 'sqlite',
      storage: 'database.sqlite',
    },
  };
};
