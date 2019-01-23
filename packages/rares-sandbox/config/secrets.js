module.exports = async (App, Rares) => {
  return {
    development: {
      secretKeyBase: 'never-use-this-key-in-production',
    },
  };
};
