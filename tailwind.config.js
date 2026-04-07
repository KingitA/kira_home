/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kira: {
          50: '#fdf8f0',
          100: '#f9eddb',
          200: '#f2d8b6',
          300: '#e9bc86',
          400: '#df9a54',
          500: '#d78133',
          600: '#c96928',
          700: '#a75123',
          800: '#864222',
          900: '#6d371e',
          950: '#3b1b0e',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
