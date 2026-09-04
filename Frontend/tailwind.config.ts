import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#141414",
        neutral: {
          DEFAULT: "#141414",
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A0A0A0",
          500: "#757575",
          600: "#525252",
          700: "#333333",
          800: "#1A1A1A",
          900: "#141414",
        },
        surface: {
          DEFAULT: "#1A1A1A",
          hover: "#242424",
          active: "#2A2A2A",
          elevated: "#222222",
        },
        border: {
          DEFAULT: "#333333",
          subtle: "#262626",
          strong: "#444444",
        },
        primary: {
          DEFAULT: "#FFFFFF",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#A0A0A0",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#757575",
          foreground: "#A0A0A0",
        },
        error: {
          DEFAULT: "#FF5A5F",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "6px",
        md: "10px",
        lg: "22px",
        xl: "28px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
