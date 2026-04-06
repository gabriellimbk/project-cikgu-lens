/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8f7f2',
          100: '#d2efe6',
          500: '#1f9b75',
          600: '#167b5d',
          700: '#0f644b'
        }
      }
    }
  },
  plugins: []
};
