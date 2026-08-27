/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        sand: "#f8fafc",
        gold: "#d97706",
        coral: "#ef4444"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(217, 119, 6, 0.18)"
      }
    }
  },
  plugins: []
};