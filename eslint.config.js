import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

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
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        import: "readonly",
        export: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-undef": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-var": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "prefer-arrow-callback": "off",
      "no-console": "off",
      "require-yield": "off",
      "preserve-caught-error": "off",
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ["**/*.ts"],
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "preserve-caught-error": "off",
    },
  },
];