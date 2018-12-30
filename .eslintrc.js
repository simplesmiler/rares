module.exports = {
  'extends': [
    'node',
    'node/style-guide',
  ],
  'env': {
    'node': true,
    'jest/globals': true,
  },
  'plugins': [
    'jest',
  ],
  'rules': {
    // @NOTE: not granular enough
    'arrow-body-style': 'off',
    'object-property-newline': 'off',
    'array-bracket-spacing': 'off',
    'template-curly-spacing': 'off',

    // @NOTE: puristic
    'no-else-return': 'off',
    'class-methods-use-this': 'off',
    'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
    'no-cond-assign': 'warn',
    'no-unused-vars': 'warn',
    'newline-per-chained-call': 'warn',

    // @NOTE: irrelevant
    'import/no-commonjs': 'off',
    'import/no-nodejs-modules': 'off',
    'no-console': 'off', // @TODO: turn on when logging feature is in

    // @NOTE: personal preference
    'indent': ['error', 2],
    'semi': ['error', 'always'],
    'brace-style': ['error', 'stroustrup', { 'allowSingleLine': true }],
    'space-before-function-paren': ['error', { 'anonymous': 'never', 'named': 'never', 'asyncArrow': 'always' }],
    'curly': ['error', 'multi-line', 'consistent'],
  },
};
