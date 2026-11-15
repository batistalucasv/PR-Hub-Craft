/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        zinc: {
          50: 'rgb(var(--c-fg-50) / <alpha-value>)',
          100: 'rgb(var(--c-fg-100) / <alpha-value>)',
          200: 'rgb(var(--c-fg-200) / <alpha-value>)',
          300: 'rgb(var(--c-fg-300) / <alpha-value>)',
          400: 'rgb(var(--c-fg-400) / <alpha-value>)',
          500: 'rgb(var(--c-fg-500) / <alpha-value>)',
          600: 'rgb(var(--c-fg-600) / <alpha-value>)',
          700: 'rgb(var(--c-bg-700) / <alpha-value>)',
          800: 'rgb(var(--c-bg-800) / <alpha-value>)',
          900: 'rgb(var(--c-bg-900) / <alpha-value>)',
          950: 'rgb(var(--c-bg-950) / <alpha-value>)',
        },
        indigo: {
          200: 'rgb(var(--c-acc-200) / <alpha-value>)',
          300: 'rgb(var(--c-acc-300) / <alpha-value>)',
          400: 'rgb(var(--c-acc-400) / <alpha-value>)',
          500: 'rgb(var(--c-acc-500) / <alpha-value>)',
          600: 'rgb(var(--c-acc-600) / <alpha-value>)',
          950: 'rgb(var(--c-acc-950) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
