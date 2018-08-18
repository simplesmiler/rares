module.exports = {
  'extends': [
    'node',
  ],
  'rules': {
    // @NOTE: no granular config
    'arrow-body-style': 'off',

    // @NOTE: puristic
    'no-else-return': 'off',
    'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
    'no-cond-assign': 'warn',
    'class-methods-use-this': 'warn',

    // @NOTE: irrelevant
    'import/no-commonjs': 'off',
    'import/no-nodejs-modules': 'off',
    'no-process-exit': 'warn',
    'no-console': 'warn',
  },
};
