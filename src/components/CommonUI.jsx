import React, { useState, useEffect } from 'react';
import { 
    GraduationCap, LogOut, Settings, Library, 
    CalendarDays, Megaphone, Edit3, ChevronLeft 
} from 'lucide-react';
import { MOTIVATIONAL_QUOTES } from '../config.js';

// --- BİLEŞEN: ÜST BAŞLIK (HEADER) ---
export const Header = ({ role, view, onLogout, onGoHome, onOpenLibrary, onOpenSettings, dailyQuote }) => {
    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 w-full justify-between">
                    {role !== 'student' && view !== 'home' ? (
                        <button onClick={onGoHome} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700 transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                    ) : <div className="w-10"></div>}
                    
                    <div className="text-center">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 flex items-center justify-center gap-2">
                            <GraduationCap className="text-indigo-600" /> BERKANT HOCA
                        </h1>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">Eğitim & Ödev Takip Platformu</p>
                    </div>

                    <div className="flex items-center gap-2 min-w-[80px] justify-end">
                        {role === 'teacher' && (
                            <button onClick={onOpenLibrary} className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-colors">
                                <Library size={20}/>
                            </button>
                        )}
                        {role === 'student' && (
                            <button onClick={onOpenSettings} className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-colors">
                                <Settings size={20}/>
                            </button>
                        )}
                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors">
                            <LogOut size={20}/>
                        </button>
                    </div>
                </div>
                <div className="text-center max-w-lg mx-auto mt-1 opacity-80 hover:opacity-100 transition-opacity">
                    <p className="text-xs text-slate-500 italic">"{dailyQuote?.text}"</p>
                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5">— {dailyQuote?.author}</p>
                </div>
            </div>
        </header>
    );
};

// --- BİLEŞEN: SINAV GERİ SAYIM SAYACI ---
export const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    
    useEffect(() => {
        const targetDate = new Date('2026-06-20T00:00:00'); // LGS/YKS Hedef Tarihi
        const timer = setInterval(() => {
            const now = new Date();
            const diff = targetDate - now;
            if (diff < 0) { clearInterval(timer); return; }
            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / 1000 / 60) % 60),
                seconds: Math.floor((diff / 1000) % 60)
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const Unit = ({ val, label, color }) => (
        <div className="flex flex-col items-center">
            <div className={`text-xl md:text-2xl font-black ${color}`}>{val}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 mt-6 no-print">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <CalendarDays className="text-indigo-600" size={16} />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Sınava Kalan Süre</h3>
                </div>
                <div className="flex justify-center gap-8">
                    <Unit val={timeLeft.days} label="Gün" color="text-yellow-500" />
                    <Unit val={timeLeft.hours} label="Saat" color="text-sky-500" />
                    <Unit val={timeLeft.minutes} label="Dak" color="text-emerald-500" />
                    <Unit val={timeLeft.seconds} label="Sn" color="text-teal-400" />
                </div>
            </div>
        </div>
    );
};

// --- BİLEŞEN: DUYURU PANOSU ---
export const AnnouncementBox = ({ content, isTeacher, onEdit }) => {
    return (
        <div className="max-w-6xl mx-auto px-4 mt-6 no-print">
            <div className="bg-white rounded-2xl p-1 shadow-md border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                <div className="p-4 flex items-start gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg text-white shadow-lg">
                        <Megaphone size={20}/>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-800 mb-1">Duyurular</h3>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{content || "Henüz duyuru yok."}</p>
                    </div>
                    {isTeacher && (
                        <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600 transition-colors">
                            <Edit3 size={16}/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
