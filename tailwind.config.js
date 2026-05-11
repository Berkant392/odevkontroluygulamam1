/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: { primary: '#4f46e5', secondary: '#8b5cf6', accent: '#ec4899' },
        animation: { 
            'spin-slow': 'spin 4s linear infinite', 
            'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', 
            'blob': 'blob 7s infinite' 
        },
        keyframes: {
            pulseRed: { 
                '0%, 100%': { backgroundColor: 'rgba(254, 226, 226, 0.5)', borderColor: 'rgba(239, 68, 68, 0.5)' }, 
                '50%': { backgroundColor: 'rgba(254, 202, 202, 0.8)', borderColor: 'rgba(239, 68, 68, 1)' } 
            },
            blob: { 
                '0%': { transform: 'translate(0px, 0px) scale(1)' }, 
                '33%': { transform: 'translate(30px, -50px) scale(1.1)' }, 
                '66%': { transform: 'translate(-20px, 20px) scale(0.9)' }, 
                '100%': { transform: 'translate(0px, 0px) scale(1)' } 
            }
        },
        fontSize: { 'xxs': '0.6rem' }
    },
  },
  plugins: [],
}
