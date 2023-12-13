/* eslint-env node */
module.exports = {
  extends: ['@dcl/eslint-config/dapps'],
  ignorePatterns: ['.eslintrc.cjs', 'jest.config.ts', 'scripts/prebuild.cjs', 'test-queue-server/index.js', 'vite.config.ts'],
  parserOptions: {
    project: ['tsconfig.json']
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        "endOfLine": "auto"
      }
    ]
  }
}
