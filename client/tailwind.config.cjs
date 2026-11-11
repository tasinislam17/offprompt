/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#111025",
          deep: "#201D3A",
          blue: "#FFBF3F",
          cyan: "#39D6E8",
          purple: "#C284F4",
          muted: "#C6C3DB",
          ink: "#0C0B18",
        },
        success: "#80E3A6",
        danger: "#FF6582",
        warning: "#FFBF3F",
      },
      boxShadow: {
        glow: "0 0 32px rgba(57, 214, 232, 0.24)",
        blue: "0 14px 36px rgba(5, 7, 28, 0.34)",
        purple: "0 14px 36px rgba(88, 39, 132, 0.25)",
      },
      fontFamily: {
        sans: [
          "DM Sans",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ["Space Grotesk", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
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
