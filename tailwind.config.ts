import type { Config } from "tailwindcss";
const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"), surface: c("surface"), line: c("line"), ink: c("ink"), muted: c("muted"),
        brand: { DEFAULT: c("brand"), fg: c("brand-fg"), soft: c("brand-soft") },
        signal: c("signal"), danger: c("danger"), ok: c("ok"),
      },
      fontFamily: { sans: ["var(--font-body)", "system-ui", "sans-serif"], display: ["var(--font-display)", "system-ui", "sans-serif"] },
      borderRadius: { xl: "0.875rem" },
    },
  },
  plugins: [],
} satisfies Config;
