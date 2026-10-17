import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default defineConfig(
  {
    ignores: ['**/dist/**', 'node_modules', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2024
    }
  },
  {
    files: ['**/*.js'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/indent': ['error', 4],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'none',
          requireLast: false
        },
        singleline: {
          delimiter: 'comma',
          requireLast: false
        }
      }],
      '@stylistic/linebreak-style': ['error', 'windows'],
      'no-var': ['error'],
      'no-control-regex': 'off',
      'no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: false,
        argsIgnorePattern: '^_|^reject$'
      }],
    }
  },
  {
    files: ['app/assets/js/scripts/*.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  },
  {
    // New React/preload code: browser globals (not node), JSX parsing, and
    // deliberately NO no-undef/no-unused-vars exemption -- see plan doc §2's
    // "hygiene rule": this is what stops new code from silently growing a
    // dependency on a legacy ambient global the way app/assets/js/scripts/*.js
    // does above.
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      // Teaches no-unused-vars that `<Foo/>` counts as using `Foo` -- plain
      // JS-only analysis can't see JSX usage otherwise.
      'react/jsx-uses-vars': 'error'
    }
  }
);