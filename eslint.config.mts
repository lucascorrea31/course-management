// eslint.config.mts

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
    // 0. GLOBAL IGNORES (Always first to prevent file processing)
    {
        ignores: ["**/*.css", "**/*.scss", "**/*.less", ".next/**", "out/**", "dist/**", "node_modules/**"],
    },

    // 1. BASE JAVASCRIPT CONFIGURATION (Applies to all files)
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        ...js.configs.recommended,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },

    // 2. APPLICATION CODE CONFIGURATION (TypeScript and React)
    ...tseslint.configs.recommended,
    // 2. Application-Specific Rule Overrides for TypeScript
    {
        files: ["**/*.{ts,mts,cts,tsx}"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: true, // Enables type-aware linting for application code
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Allows 'any' type (used to disable the 'no-explicit-any' error)
            "@typescript-eslint/no-explicit-any": "off",
            // Disables the requirement for explicit return types
            "@typescript-eslint/explicit-module-boundary-types": "off",
            // Ignores unused variables/arguments prefixed with an underscore (e.g., _req)
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
            ],
        },
    },
    {
        files: ["**/*.{jsx,tsx}"],
        ...pluginReact.configs.flat.recommended,
        settings: {
            react: { version: "detect" }, // Detects React version for New JSX Transform
        },
        rules: {
            // Disables the historical 'React must be in scope' error (for React 17+)
            "react/react-in-jsx-scope": "off",
            // Forces use of .jsx and .tsx extensions for files containing JSX
            "react/jsx-filename-extension": [1, { extensions: [".jsx", ".tsx"] }],
        },
    },

    // 3. BUILD/CONFIG FILES OVERRIDE (MUST COME LAST)
    // This block ensures that config files are not analyzed with the strict 'project: true' setting.
    {
        files: ["**/*.config.ts", "**/*.config.js", "**/*.config.mts", "**/*.config.mjs"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                // *** CRITICAL FIX: Disables type analysis for config files to resolve the parsing error. ***
                project: false,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Fixes the 'require()' error in config files (CommonJS syntax)
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-var-requires": "off",
        },
    },
]);
