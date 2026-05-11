import React, { useState, useEffect } from 'react';
import { LogOut, Settings, GraduationCap, Clock, CheckCircle, XCircle, MinusCircle, Info, CalendarDays, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, CLASSES_COLLECTION } from '../lib/firebase';
import { MOTIVATIONAL_QUOTES, calculateStats, formatDate, isOverdue } from '../lib/utils';

const STATUS_OPTIONS = [
    { id: 'assigned', label: 'Verildi', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'done', label: 'Yapıldı', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { id: 'missing', label: 'Eksik', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { id: 'exempt', label: 'Muaf', icon: MinusCircle, color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' },
];

export default function StudentPanel({ student, classData, onLogout, classes }) {
    const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");
    const [currentStudent, setCurrentStudent] = useState(student);

    useEffect(() => {
        setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    }, []);

    // Firebase'den güncel veriyi almak için classData güncellendiğinde student state'ini güncelle
    useEffect(() => {
       if (classData) {
           const updatedStudent = classData.students.find(s => s.id === currentStudent.id);
           if (updatedStudent) {
               setCurrentStudent(updatedStudent);
           }
       }
    }, [classData]);

    const updateStudentPassword = async () => {
        if(studentNewPassword.length < 4) return alert("Şifre en az 4 karakter olmalıdır.");
        const cls = classes.find(c => c.id === classData.id);
        if(cls && currentStudent) {
            const updatedStudents = cls.students.map(s => s.id === currentStudent.id ? { ...s, password: studentNewPassword } : s);
            try {
                await setDoc(doc(db, CLASSES_COLLECTION, String(cls.id)), { ...cls, students: updatedStudents }, { merge: true });
                setCurrentStudent({ ...currentStudent, password: studentNewPassword });
                setStudentSettingsModal(false);
                setStudentNewPassword("");
                alert("Şifreniz başarıyla güncellendi!");
            } catch (error) {
                console.error("Şifre güncellenirken hata:", error);
                alert("Şifre güncellenemedi.");
            }
        }
    };

    return (
        <div className="min-h-screen pb-20 bg-slate-50 relative">
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        <div className="w-10"></div>
                        <div className="text-center">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 flex items-center justify-center gap-2"><GraduationCap className="text-indigo-600" /> BERKANT HOCA</h1>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">Eğitim & Ödev Takip Platformu</p>
                        </div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            <button onClick={() => setStudentSettingsModal(true)} className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-colors" title="Hesabım"><Settings size={20}/></button>
                            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="Çıkış Yap"><LogOut size={20}/></button>
                        </div>
                    </div>
                    <div className="text-center max-w-lg mx-auto mt-1 opacity-80 hover:opacity-100 transition-opacity">
                        <p className="text-xs text-slate-500 italic">"{dailyQuote.text}"</p>
                        <p className="text-[10px] text-indigo-600 font-bold mt-0.5">— {dailyQuote.author}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-8">
                <div className="bg-white rounded-3xl p-4 md:p-8 shadow-2xl border border-slate-200">
                    <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-200">
                            {currentStudent.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-1">{currentStudent.name}</h2>
                            <p className="text-slate-500 font-medium">{classData.className}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-10">
                        {classData.topics?.map(topic => {
                            const topicStats = calculateStats([currentStudent], [{...topic, subColumns: topic.subColumns}]);
                            const pct = topicStats.percentage || 0;
                            return (
                                <div key={topic.id} className="relative">
                                    <div className="flex justify-between items-center mb-4 border-l-4 border-indigo-500 pl-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-indigo-700 uppercase tracking-wider">{topic.title}</h3>
                                            {topic.date && ( 
                                                <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isOverdue(topic.date) && pct < 100 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                                    <span className="font-normal text-slate-400">Son Teslim :</span> {formatDate(topic.date)}
                                                </div> 
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">%{pct} Tamamlandı</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {topic.subColumns?.map(col => {
                                            const status = currentStudent.grades?.[col.id] || 'exempt'; 
                                            const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3]; 
                                            const StatusIcon = statusData.icon; 
                                            const note = currentStudent.assignmentNotes?.[col.id]; 
                                            const isLate = isOverdue(topic.date) && status !== 'done';
                                            
                                            return (
                                                <div key={col.id} className={`bg-white border ${isLate ? 'border-red-300 animate-pulse-red' : 'border-slate-100'} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-lg transition-all duration-300 group relative`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>KAYNAK
                                                            </span>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-base font-bold text-slate-700 group-hover:text-indigo-700 transition-colors leading-tight">{col.title}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${statusData.bg} ${statusData.border} ${statusData.color}`}>
                                                            <StatusIcon size={18} strokeWidth={2.5} />
                                                            <span className="text-xs font-black uppercase tracking-wide">{statusData.label}</span>
                                                        </div>
                                                    </div>
                                                    {note && ( 
                                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 items-start text-xs text-amber-800">
                                                            <Info size={14} className="mt-0.5 shrink-0"/> 
                                                            <span><span className="font-bold">Öğretmen Notu:</span> {note}</span>
                                                        </div> 
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {(!classData.topics || classData.topics.length === 0) && (
                            <div className="text-center py-10 text-slate-400">Henüz atanmış bir ödev bulunmamaktadır.</div>
                        )}
                    </div>
                </div>
            </main>

            {/* Öğrenci Şifre Değiştirme Modalı (Hesabım) */}
            {studentSettingsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden modal-anim shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex gap-2 items-center"><Settings className="text-indigo-600"/> Hesabım</h3>
                            <button onClick={() => setStudentSettingsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center font-black text-xl">{currentStudent.name.charAt(0)}</div>
                                <div><div className="font-bold text-slate-800">{currentStudent.name}</div><div className="text-xs text-slate-500 font-mono mt-0.5">{currentStudent.username}</div></div>
                            </div>
                            <div className="mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Yeni Şifre Belirle</label>
                                <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-slate-800 font-medium tracking-widest" placeholder="En az 4 karakter" value={studentNewPassword} onChange={(e) => setStudentNewPassword(e.target.value)} />
                            </div>
                            <button onClick={updateStudentPassword} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md mt-4 transition-colors">Şifremi Güncelle</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
