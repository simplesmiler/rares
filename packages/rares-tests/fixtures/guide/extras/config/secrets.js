module.exports = {
  development: {
    secretKeyBase: 'never-use-this-key-base-in-production',
  },
  test: {
    secretKeyBase: 'never-use-this-key-base-in-production',
  },
  production: {
    secretKeyBase: process.env.SECRET_KEY_BASE,
  },
};
