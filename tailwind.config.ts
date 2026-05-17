import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        cardGlow: "0 0 50px rgba(251, 191, 36, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
