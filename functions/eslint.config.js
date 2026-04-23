const js = require("@eslint/js");

module.exports = [
  {
    ignores: ["node_modules/**", "lib/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        exports: "writable",
        fetch: "readonly",
        process: "readonly",
        require: "readonly",
        URL: "readonly",
      },
    },
  },
];
