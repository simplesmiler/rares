module.exports = async App => {
  return {
    development: {
      dialect: 'sqlite',
      storage: 'database.sqlite',
    },
  };
};
