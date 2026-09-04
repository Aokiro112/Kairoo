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
        background: "#090909",
        ink: "#090909",
        charcoal: "#111111",
        surface: {
          DEFAULT: "#161616",
          hover: "#1F1F1F",
          active: "#252525",
          elevated: "#181818",
        },
        offwhite: "#F4F4F0",
        mutedwhite: "#A3A3A0",
        dimgray: "#686865",
        brutalist: {
          bg: "#090909",
          card: "#111111",
          elevated: "#161616",
          border: "#2A2A28",
          subtle: "#1D1D1B",
          text: "#F4F4F0",
          muted: "#A3A3A0",
          dim: "#686865",
        },
        acid: {
          DEFAULT: "#B8FF3D",
          glow: "rgba(184, 255, 61, 0.15)",
        },
        severity: {
          critical: "#FF5C5C",
          high: "#FF9F43",
          medium: "#FFD166",
          low: "#6EE7A0",
        },
        border: {
          DEFAULT: "#2A2A28",
          subtle: "#1D1D1B",
          strong: "#3A3A38",
        },
        primary: {
          DEFAULT: "#F4F4F0",
          foreground: "#090909",
        },
        secondary: {
          DEFAULT: "#A3A3A0",
          foreground: "#F4F4F0",
        },
        muted: {
          DEFAULT: "#686865",
          foreground: "#A3A3A0",
        },
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
