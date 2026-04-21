/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 10px 35px -15px rgba(15, 23, 42, 0.35)'
      },
      keyframes: {
        rise: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0px)' }
        }
      },
      animation: {
        rise: 'rise 0.4s ease-out'
      }
    }
  },
  plugins: []
};
