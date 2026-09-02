/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#062633",
        primary: "#0f766e", // teal
        indigo: "#4f46e5",
        sand: "#f8fafc",
        teal: "#0d9488",
        accent: "#06b6d4",
        coral: "#ef4444",
        muted: "#64748b"
      },
      boxShadow: {
        glow: "0 30px 80px rgba(11, 36, 71, 0.12)",
        soft: "0 8px 30px rgba(11,36,71,0.08)"
      },
      backgroundImage: {
        'hero-gradient': "radial-gradient(900px 500px at 0% 10%, rgba(15,118,110,0.06), transparent 15%), radial-gradient(800px 400px at 100% 20%, rgba(79,70,229,0.05), transparent 12%)"
      }
    }
  },
  plugins: []
};