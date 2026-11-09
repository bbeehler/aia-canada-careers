/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#14284B", deep: "#0E1D38", soft: "#E8EDF5" },
        signal: { DEFAULT: "#C8102E", dark: "#A00D25" },
        steel: "#56606E",
        line: "#D9DEE5",
        paper: "#F7F8FA",
        ink: "#172033",
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
