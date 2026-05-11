// --- FİREBASE AYARLARI ---
export const firebaseConfig = {
    apiKey: "AIzaSyDNfK49NR1dfbN0TSb35FI85huw8YJfcyQ",
    authDomain: "odevtakip-145f5.firebaseapp.com",
    projectId: "odevtakip-145f5",
    storageBucket: "odevtakip-145f5.firebasestorage.app",
    messagingSenderId: "1083778395806",
    appId: "1:1083778395806:web:c67f99e34a11e5a330958f"
};

// --- MOTİVASYON SÖZLERİ ---
export const MOTIVATIONAL_QUOTES = [
    { text: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", author: "Robert Collier" },
    { text: "Gelecek, bugünden ona hazırlananlara aittir.", author: "Malcolm X" },
    { text: "Bir şeyi başarmak için önce ona inanmalısın.", author: "Nikos Kazancakis" },
    { text: "Eğitim, dünyayı değiştirmek için kullanabileceğiniz en güçlü silahtır.", author: "Nelson Mandela" }
];

// --- TABLO TEMA RENKLERİ (Hata buradaydı!) ---
export const TOPIC_THEMES = [
    { main: 'bg-indigo-100 text-indigo-900 border-indigo-200', sub: 'bg-indigo-50 text-indigo-800 border-indigo-100', cell: 'bg-indigo-50/30 border-indigo-100', text: 'text-indigo-900' },
    { main: 'bg-rose-100 text-rose-900 border-rose-200', sub: 'bg-rose-50 text-rose-800 border-rose-100', cell: 'bg-rose-50/30 border-rose-100', text: 'text-rose-900' },
    { main: 'bg-emerald-100 text-emerald-900 border-emerald-200', sub: 'bg-emerald-50 text-emerald-800 border-emerald-100', cell: 'bg-emerald-50/30 border-emerald-100', text: 'text-emerald-900' },
    { main: 'bg-amber-100 text-amber-900 border-amber-200', sub: 'bg-amber-50 text-amber-800 border-amber-100', cell: 'bg-amber-50/30 border-amber-100', text: 'text-amber-900' },
    { main: 'bg-cyan-100 text-cyan-900 border-cyan-200', sub: 'bg-cyan-50 text-cyan-800 border-cyan-100', cell: 'bg-cyan-50/30 border-cyan-100', text: 'text-cyan-900' },
];

// --- DURUM SEÇENEKLERİ ---
export const STATUS_OPTIONS = [
    { id: 'assigned', label: 'Verildi', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'done', label: 'Yapıldı', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { id: 'missing', label: 'Eksik', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { id: 'exempt', label: 'Muaf', color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' },
];
