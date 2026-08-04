/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // Mirror the design tokens declared in `src/layouts/Layout.astro` so
      // utility classes and the older scoped CSS stay in visual lockstep.
      colors: {
        bg: 'var(--bg)',
        elevated: 'var(--bg-elevated)',
        surface: 'var(--surface)',
        hairline: 'var(--border)',
        ink: 'var(--text)',
        dim: 'var(--text-dim)',
        accent: 'var(--accent)',
        'accent-contrast': 'var(--accent-contrast)',
      },
      fontFamily: {
        display: ['Clash Display', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
