import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, User, ShieldAlert, GraduationCap } from 'lucide-react';

export default function Auth({ onTeacherLogin, onStudentLogin }) {
    const [authView, setAuthView] = useState('selection'); 
    const [studentUsernameInput, setStudentUsernameInput] = useState("");
    const [studentPasswordInput, setStudentPasswordInput] = useState("");
    const [pinInput, setPinInput] = useState("");

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Arka plan animasyonları */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>

            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 modal-anim">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30 rotate-3 hover:rotate-0 transition-transform">
                        <GraduationCap size={48} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">BERKANT HOCA</h1>
                    <p className="text-indigo-200 text-xs font-bold tracking-[0.3em] uppercase">Eğitim Platformu</p>
                </div>
                
                {authView === 'selection' && (
                    <div className="space-y-4">
                        <button onClick={() => setAuthView('student-login')} className="w-full group relative overflow-hidden rounded-2xl p-5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-5 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1">
                            <div className="bg-indigo-500/20 p-4 rounded-xl text-indigo-300 group-hover:text-indigo-200 group-hover:bg-indigo-500/40 transition-colors"><User size={28}/></div>
                            <div className="text-left"><h3 className="text-white font-black text-lg tracking-wide">Öğrenci Girişi</h3><p className="text-indigo-200/70 text-xs mt-0.5">Ödev takip ve karne paneli</p></div>
                            <ChevronRight className="ml-auto text-white/30 group-hover:text-white transition-colors" size={24}/>
                        </button>
                        <button onClick={() => setAuthView('teacher-login')} className="w-full group relative overflow-hidden rounded-2xl p-5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-5 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1">
                            <div className="bg-rose-500/20 p-4 rounded-xl text-rose-300 group-hover:text-rose-200 group-hover:bg-rose-500/40 transition-colors"><ShieldAlert size={28}/></div>
                            <div className="text-left"><h3 className="text-white font-black text-lg tracking-wide">Öğretmen Girişi</h3><p className="text-rose-200/70 text-xs mt-0.5">Yönetim ve raporlama</p></div>
                            <ChevronRight className="ml-auto text-white/30 group-hover:text-white transition-colors" size={24}/>
                        </button>
                    </div>
                )}
                
                {authView === 'student-login' && (
                    <div className="space-y-5 modal-anim">
                        <button onClick={() => setAuthView('selection')} className="text-indigo-200 hover:text-white text-sm font-bold flex items-center gap-1 mb-2 transition-colors"><ChevronLeft size={18}/> Geri Dön</button>
                        <div>
                            <label className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1">Kullanıcı Adı</label>
                            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:border-indigo-400 focus:bg-white/10 outline-none transition-all font-medium" placeholder="örn: ahmet.yilmaz.123" value={studentUsernameInput} onChange={e => setStudentUsernameInput(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1">Şifre</label>
                            <input type="password" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:border-indigo-400 focus:bg-white/10 outline-none transition-all font-medium tracking-widest" placeholder="••••••" value={studentPasswordInput} onChange={e => setStudentPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onStudentLogin(studentUsernameInput, studentPasswordInput)} />
                        </div>
                        <button onClick={() => onStudentLogin(studentUsernameInput, studentPasswordInput)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black mt-4 shadow-xl shadow-indigo-600/30 transition-all text-lg tracking-wide hover:-translate-y-1">GİRİŞ YAP</button>
                    </div>
                )}
                
                {authView === 'teacher-login' && (
                    <div className="space-y-5 modal-anim">
                        <button onClick={() => setAuthView('selection')} className="text-rose-200 hover:text-white text-sm font-bold flex items-center gap-1 mb-2 transition-colors"><ChevronLeft size={18}/> Geri Dön</button>
                        <div>
                            <label className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1 text-center">Yönetici PIN Kodu</label>
                            <input type="password" autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:border-rose-400 focus:bg-white/10 outline-none transition-all text-center text-3xl tracking-[0.5em] font-black" placeholder="••••" value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onTeacherLogin(pinInput)} />
                        </div>
                        <button onClick={() => onTeacherLogin(pinInput)} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black mt-4 shadow-xl shadow-rose-600/30 transition-all text-lg tracking-wide hover:-translate-y-1">SİSTEME GİR</button>
                    </div>
                )}
            </div>
        </div>
    );
}
