/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#050819",
          deep: "#080D2A",
          blue: "#0C42FD",
          cyan: "#3EF9FF",
          purple: "#8F54FD",
          muted: "#A7B0D8",
          ink: "#000537",
        },
        success: "#3EF29A",
        danger: "#FF4D6D",
        warning: "#FFD166",
      },
      boxShadow: {
        glow: "0 0 36px rgba(62, 249, 255, 0.22)",
        blue: "0 18px 50px rgba(12, 66, 253, 0.28)",
        purple: "0 18px 50px rgba(143, 84, 253, 0.22)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "panel-in": "panelIn 420ms ease-out",
        "pulse-soft": "pulseSoft 1600ms ease-in-out infinite",
        "bar-grow": "barGrow 680ms ease-out",
      },
      keyframes: {
        panelIn: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.68" },
        },
        barGrow: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
    },
  },
  plugins: [],
};
