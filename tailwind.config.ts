import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        surface: "#0f172a",
        panel: "#1e293b",
        accent: "#22d3ee",
        electric: "#a855f7",
        signal: "#60a5fa",
        success: "#4ade80",
        warning: "#fbbf24",
        danger: "#fb7185",
        ink: "#f1f5f9",
        muted: "#94a3b8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Times New Roman", "Times", "Georgia", "serif"],
        mono: ["ui-monospace", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "brand-glow": "brand-glow 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        "brand-glow": {
          "0%, 100%": { opacity: "0.6", filter: "blur(12px)" },
          "50%": { opacity: "1", filter: "blur(20px)" },
        },
      },
      boxShadow: {
        neon: "0 0 40px -10px rgba(34, 211, 238, 0.5)",
        "neon-purple": "0 0 40px -10px rgba(168, 85, 247, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
