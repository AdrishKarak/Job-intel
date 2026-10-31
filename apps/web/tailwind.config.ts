import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        ink: "#141414",
        pink: {
          DEFAULT: "#FFB4D8",
          light: "#FFC5E1",
        },
        sky: {
          DEFAULT: "#9ED8FF",
          light: "#B8E3FF",
        },
        mint: {
          DEFAULT: "#B6F2C4",
          light: "#CEF6D8",
        },
        blush: {
          DEFAULT: "#FFA8A0",
          light: "#FFBCB5",
        },
        border: "#141414",
        background: "#FFFFFF",
        foreground: "#141414",
      },
      fontFamily: {
        display: ["var(--font-archivo-black)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      boxShadow: {
        neo: "4px 4px 0px #141414",
        "neo-sm": "2px 2px 0px #141414",
        "neo-lg": "6px 6px 0px #141414",
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
        md: "2px",
        lg: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
