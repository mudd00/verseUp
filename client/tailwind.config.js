/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6366f1',
          indigo: '#4f46e5',
          cyan: '#06b6d4',
          teal: '#14b8a6',
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float 4s ease-in-out infinite',
        'float-slower': 'float 5s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'drift': 'drift 6s ease-in-out infinite',
        'drift-reverse': 'driftReverse 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-gentle': 'bounceGentle 3s ease-in-out infinite',
        'sway': 'sway 4s ease-in-out infinite',
        'card-float': 'cardFloat 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '25%': { transform: 'translate(10px, -10px)' },
          '50%': { transform: 'translate(-5px, -20px)' },
          '75%': { transform: 'translate(-15px, -10px)' },
        },
        driftReverse: {
          '0%, 100%': { transform: 'translate(0px, 0px)' },
          '25%': { transform: 'translate(-10px, -10px)' },
          '50%': { transform: 'translate(5px, -20px)' },
          '75%': { transform: 'translate(15px, -10px)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-15px) scale(1.05)' },
        },
        sway: {
          '0%, 100%': { transform: 'translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateX(10px) rotate(2deg)' },
          '50%': { transform: 'translateX(0px) rotate(0deg)' },
          '75%': { transform: 'translateX(-10px) rotate(-2deg)' },
        },
        cardFloat: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-10px) translateX(5px)' },
          '66%': { transform: 'translateY(-5px) translateX(-5px)' },
        }
      }
    },
  },
  plugins: [],
}
