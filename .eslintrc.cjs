module.exports = {
  root: true,

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    browser: true,
    es2021: true,
    node: true, // для supabase client
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off', // less noise for now
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // intentional - legacy code with any types
    'react-hooks/exhaustive-deps': 'off', // will be fixed when plugin is available
    'no-console': 'warn',
    'prefer-const': 'warn',
    eqeqeq: ['error', 'always'],
  },
};
