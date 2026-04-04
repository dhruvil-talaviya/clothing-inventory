/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        zinc: {
            800: '#27272a',
            900: '#18181b', 
        }
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 20px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}