import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#B4E4D4",
          dark: "#4A5568",
          accent: "#E0D5E8",
          light: "#F8FBF9"
        }
      },
      borderRadius: {
        xl: "1.5rem"
      },
      boxShadow: {
        card: "0 20px 45px -20px rgba(67, 71, 113, 0.25)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-plus-jakarta)", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
