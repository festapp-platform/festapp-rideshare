const { colors } = require("../../packages/shared/src/constants/design");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pastel: {
          bg: colors.light.background,
          surface: colors.light.surface,
          primary: colors.light.primary,
          "primary-light": colors.light.primaryLight,
          secondary: colors.light.secondary,
          accent: colors.light.accent,
          text: colors.light.text,
          "text-secondary": colors.light.textSecondary,
          border: colors.light.border,
          success: colors.light.success,
          warning: colors.light.warning,
          error: colors.light.error,
        },
        "pastel-dark": {
          bg: colors.dark.background,
          surface: colors.dark.surface,
          primary: colors.dark.primary,
          "primary-light": colors.dark.primaryLight,
          secondary: colors.dark.secondary,
          accent: colors.dark.accent,
          text: colors.dark.text,
          "text-secondary": colors.dark.textSecondary,
          border: colors.dark.border,
          success: colors.dark.success,
          warning: colors.dark.warning,
          error: colors.dark.error,
        },
      },
    },
  },
  plugins: [],
};
