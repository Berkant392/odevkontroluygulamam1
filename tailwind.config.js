/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { 
          // Eski Renkler (Bozulma olmaması için)
          primary: '#4f46e5', 
          secondary: '#8b5cf6', 
          accent: '#ec4899',
          surface: '#f8fafc',
          surfaceDark: '#f1f5f9',
          
          // YENİ V2 TASARIM SİSTEMİ RENKLERİ
          vipBg: '#0a0a1f',         // Öğrenci modu derin lacivert
          vipCard: '#12123a',       // VIP Kart yüzeyi
          vipGold: '#ffd700',       // VIP Altın
          vipGoldAccent: '#c99600', // Altın vurgu (koyu)
          brandPurple: '#7c3aed',   // Yeni Mor Birincil
          lightBg: '#f8f7ff',       // Yeni Yönetici Paneli (Ferah arka plan)
          successGreen: '#22c55e',  // Başarı
          errorRed: '#ef4444'       // Eksik/Hata
      },
      transitionTimingFunction: {
          'overshoot': 'cubic-bezier(0.16, 1, 0.3, 1)',   // Giriş (Apple tarzı)
          'exit': 'cubic-bezier(0.5, 0, 0.75, 0)',        // Çıkış
          'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Zıplama
      },
      boxShadow: {
          'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          'glow': '0 0 20px rgba(124, 58, 237, 0.3)',
          'float': '0 10px 30px -5px rgba(0, 0, 0, 0.15)',
          'vip-glow': '0 0 25px rgba(255, 215, 0, 0.15)',
          'vip-card': '0 10px 40px -10px rgba(0, 0, 0, 0.5)'
      },
      animation: { 
          // Eski animasyonlar
          'spin-slow': 'spin 4s linear infinite', 
          'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', 
          'blob': 'blob 7s infinite',
          'sound-wave': 'soundWave 1s ease-in-out infinite alternate',
          'bounce-slight': 'bounceSlight 2s infinite',
          
          // YENİ V2 ANİMASYONLARI
          'card-enter': 'cardEnter 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'fade-in-up': 'fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'scale-in': 'scaleIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          'shimmer': 'shimmer 3s ease-in-out infinite alternate',
          'twinkle': 'twinkle 3s ease-in-out infinite'
      },
      keyframes: {
          pulseRed: { '0%, 100%': { backgroundColor: 'rgba(254, 226, 226, 0.5)', borderColor: 'rgba(239, 68, 68, 0.5)' }, '50%': { backgroundColor: 'rgba(254, 202, 202, 0.8)', borderColor: 'rgba(239, 68, 68, 1)' } },
          blob: { '0%': { transform: 'translate(0px, 0px) scale(1)' }, '33%': { transform: 'translate(30px, -50px) scale(1.1)' }, '66%': { transform: 'translate(-20px, 20px) scale(0.9)' }, '100%': { transform: 'translate(0px, 0px) scale(1)' } },
          soundWave: { '0%': { transform: 'scaleY(0.5)', opacity: '0.5' }, '100%': { transform: 'scaleY(1.5)', opacity: '1' } },
          bounceSlight: { '0%, 100%': { transform: 'translateY(-5%)' }, '50%': { transform: 'translateY(0)' } },
          
          // YENİ V2 KEYFRAMES
          cardEnter: { '0%': { opacity: 0, transform: 'translateY(24px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
          fadeInUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
          scaleIn: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
          shimmer: { '0%': { opacity: 0.6, transform: 'scale(1)' }, '100%': { opacity: 1, transform: 'scale(1.02)' } },
          twinkle: { '0%, 100%': { opacity: 0.2, transform: 'scale(0.8)' }, '50%': { opacity: 1, transform: 'scale(1.2)' } }
      },
      fontSize: { 'xxs': '0.6rem' }
    }
  },
  plugins: [],
}
