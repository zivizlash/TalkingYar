import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        process: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "arrow-body-style": ["error", "as-needed"],
      "prefer-arrow-callback": "error",
      "no-console": "off",
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPrettierRecommended,
];
