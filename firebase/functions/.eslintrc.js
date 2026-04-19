module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    // Disallow explicit `any` — use `unknown` or proper types
    "@typescript-eslint/no-explicit-any": "error",

    // Allow unused vars prefixed with _ (common for destructuring)
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],

    // Require async functions that use await
    "@typescript-eslint/require-await": "off",

    // Allow non-null assertions only where needed
    "@typescript-eslint/no-non-null-assertion": "warn",

    // Consistent return types for functions
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",

    // Disable base rule in favor of TS-aware version
    "no-unused-vars": "off",

    // Allow console for Cloud Functions logging (use firebase-functions/logger instead)
    "no-console": "warn",
  },
  ignorePatterns: [
    "/lib/**/*",
    ".eslintrc.js",
  ],
};
