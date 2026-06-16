import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette from the design brief
        brand: {
          primary: "#35a9fe",   // bright blue — primary actions, focus
          secondary: "#4d8ecc", // muted blue — accents, headers
          success: "#6cb800",   // green — confirmation
          accent: "#9fc54d",    // light green — active/quick-action states
        },
        ink: "#14213d",
        muted: "#5b6478",
        line: "#e4e8ef",
        field: "#f5f7fa",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
