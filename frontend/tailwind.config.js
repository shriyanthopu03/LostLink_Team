/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06132b",
        primary: "#0b2447",
        sand: "#fffaf2",
        gold: "#d97706",
        accent: "#ff7a59",
        coral: "#ef4444",
        muted: "#64748b"
      },
      boxShadow: {
        glow: "0 30px 80px rgba(11, 36, 71, 0.12)",
        soft: "0 8px 30px rgba(11,36,71,0.08)"
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(1200px 600px at -10% 20%, rgba(255,122,89,0.06), transparent 15%), radial-gradient(900px 400px at 110% 10%, rgba(217,151,41,0.04), transparent 12%)'
      }
    }
  },
  plugins: []
};