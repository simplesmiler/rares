module.exports = {
  development: {
    secretKeyBase: 'never-use-this-key-in-production',
  },
  test: {
    secretKeyBase: 'never-use-this-key-in-production',
  },
  production: {
    secretKeyBase: process.env.SECRET_KEY_BASE,
  },
};
