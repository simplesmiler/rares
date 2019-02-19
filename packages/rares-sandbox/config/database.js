module.exports = App => {
  return {
    development: {
      dialect: 'sqlite',
      storage: 'database.sqlite',
    },
  };
};
