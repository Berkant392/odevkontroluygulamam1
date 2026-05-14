/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { 
          primary: '#4f46e5', 
          secondary: '#8b5cf6', 
          accent: '#ec4899',
          surface: '#f8fafc',
          surfaceDark: '#f1f5f9'
      },
      boxShadow: {
          'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          'glow': '0 0 20px rgba(79, 70, 229, 0.3)',
          'float': '0 10px 30px -5px rgba(0, 0, 0, 0.15)'
      },
      animation: { 
          'spin-slow': 'spin 4s linear infinite', 
          'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', 
          'blob': 'blob 7s infinite',
          'sound-wave': 'soundWave 1s ease-in-out infinite alternate',
          'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
          'scale-in': 'scaleIn 0.3s ease-out forwards',
          'bounce-slight': 'bounceSlight 2s infinite'
      },
      keyframes: {
          pulseRed: { '0%, 100%': { backgroundColor: 'rgba(254, 226, 226, 0.5)', borderColor: 'rgba(239, 68, 68, 0.5)' }, '50%': { backgroundColor: 'rgba(254, 202, 202, 0.8)', borderColor: 'rgba(239, 68, 68, 1)' } },
          blob: { '0%': { transform: 'translate(0px, 0px) scale(1)' }, '33%': { transform: 'translate(30px, -50px) scale(1.1)' }, '66%': { transform: 'translate(-20px, 20px) scale(0.9)' }, '100%': { transform: 'translate(0px, 0px) scale(1)' } },
          soundWave: { '0%': { transform: 'scaleY(0.5)', opacity: '0.5' }, '100%': { transform: 'scaleY(1.5)', opacity: '1' } },
          fadeInUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
          scaleIn: { '0%': { opacity: 0, transform: 'scale(0.9)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
          bounceSlight: { '0%, 100%': { transform: 'translateY(-5%)' }, '50%': { transform: 'translateY(0)' } }
      },
      fontSize: { 'xxs': '0.6rem' }
    }
  },
  plugins: [],
}
