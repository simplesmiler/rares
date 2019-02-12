module.exports = async App => {
  return {
    development: {
      secretKeyBase: 'never-use-this-key-in-production',
    },
  };
};
