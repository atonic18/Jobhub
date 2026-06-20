/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F4F8FF",
        primary: "#2563EB",
        secondary: "#4F46E5",
        card: "#FFFFFF",
        text: "#0F172A",
        secondaryText: "#64748B",
        darkBg: "#0E1B2A",
        darkSurface: "#142437",
        darkSurface2: "#1B2F46",
        darkText: "#E6EEF8",
        darkMuted: "#9FB0C3",
        darkBorder: "#24384F",
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
};
