/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      backgroundImage: {
        'mandala': 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 30%, transparent 60%), conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
      },
    },
  },
  plugins: [],
}
