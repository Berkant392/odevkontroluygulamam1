import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, collection, onSnapshot, 
    updateDoc, query, deleteDoc 
} from 'firebase/firestore';
import { 
    GraduationCap, User, ShieldAlert, X, Book, Star, 
    ChevronLeft, ChevronRight, Settings, LogOut
} from 'lucide-react';

import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
// DİKKAT: Header'ı CommonUI'den çıkardık, direkt buraya gömdük.
import { CountdownTimer, AnnouncementBox } from './components/CommonUI.jsx';
import { StudentView } from './components/StudentView.jsx';
import { AdminPanel } from './components/AdminPanel.jsx';

const generateId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
    const [user, setUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null); 
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [classes, setClasses] = useState([]);
    const [library, setLibrary] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [authView, setAuthView] = useState('selection');
    const [announcement, setAnnouncement] = useState("");
    const [dailyQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    // Pencereler (Modals)
    const [modal, setModal] = useState({ type: null, data: {} });
    const [statusModal, setStatusModal] = useState(null); 
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");
    const [printData, setPrintData] = useState(null);
    
    // Giriş
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");

    useEffect(() => {
        signInAnonymously(auth);
        return onAuthStateChanged(auth, (u) => u && setUser(u));
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(query(collection(db, 'berkant_hoca_classes_secure')), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const libUnsub = onSnapshot(collection(db, 'berkant_hoca_library'), (snap) => {
            setLibrary(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const settingsUnsub = onSnapshot(doc(db, 'berkant_hoca_system_config_v2', 'main_config'), (snap) => {
            if (snap.exists()) setAnnouncement(snap.data().announcement);
        });
        return () => { unsub(); libUnsub(); settingsUnsub(); };
    }, [user]);

    // --- SİLME FONKSİYONLARI ---
    const handleDeleteTopic = async (classId, topicId) => {
        if (!confirm("Bu ödev grubunu silmek istediğinize emin misiniz?")) return;
        const cls = classes.find(c => c.id === classId);
        if(!cls) return;
        const updatedTopics = cls.topics.filter(t => t.id !== topicId);
        await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: updatedTopics });
    };

    const handleDeleteSource = async (classId, topicId, sourceId) => {
        if (!confirm("Bu kaynağı silmek istediğinize emin misiniz?")) return;
        const cls = classes.find(c => c.id === classId);
        if(!cls) return;
        const updatedTopics = cls.topics.map(t => {
            if (t.id === topicId) return { ...t, subColumns: t.subColumns.filter(s => s.id !== sourceId) };
            return t;
        });
        await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: updatedTopics });
    };

    // --- DURUM GÜNCELLEME ---
    const handleUpdateGrade = async (classId, studentId, colId, newStatus) => {
        const cls = classes.find(c => c.id === classId);
        const studentIdx = cls.students.findIndex(s => s && s.id === studentId);
        if (studentIdx === -1) return;
        const updatedStudents = [...cls.students];
        updatedStudents[studentIdx] = {
            ...updatedStudents[studentIdx],
            grades: { ...(updatedStudents[studentIdx].grades || {}), [colId]: newStatus }
        };
        await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { students: updatedStudents });
        setStatusModal(null);
    };

    // --- KÜTÜPHANE VE SINIF/ÖDEV/KAYNAK EKLEME (HATASI GİDERİLDİ) ---
    const handleModalSubmit = async () => {
        const inputElement = document.getElementById('modalInput');
        if (!inputElement) return;
        const inputVal = inputElement.value;
        if (!inputVal.trim()) return;

        if (modal.type === 'class') {
            // Sınıf Ekleme Mantığı Onarıldı
            const newId = `class_${Date.now()}`;
            await setDoc(doc(db, 'berkant_hoca_classes_secure', newId), { className: inputVal, topics: [], students: [], isOpen: true });
        } else if (modal.type === 'topic') {
            const cls = classes.find(c => c.id === modal.data.classId);
            if (cls) {
                await updateDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { topics: [...(cls.topics || []), { id: `topic_${Date.now()}`, title: inputVal, subColumns: [] }] });
                await setDoc(doc(collection(db, 'berkant_hoca_library')), { text: inputVal, type: 'topic' });
            }
        } else if (modal.type === 'source') {
            const cls = classes.find(c => c.id === modal.data.classId);
            if (cls) {
                const newColId = `col_${Date.now()}`;
                const updatedTopics = cls.topics.map(t => t.id === modal.data.topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: inputVal }] } : t);
                const updatedStudents = (cls.students || []).filter(Boolean).map(s => ({ ...s, grades: { ...(s.grades || {}), [newColId]: 'assigned' } }));
                await updateDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { topics: updatedTopics, students: updatedStudents });
                await setDoc(doc(collection(db, 'berkant_hoca_library')), { text: inputVal, type: 'source' });
            }
        }
        setModal({ type: null, data: {} });
    };

    // --- ÖĞRENCİ ŞİFRE GÜNCELLEME ---
    const updateStudentPassword = async () => {
        if (studentNewPassword.length < 4) return alert("Şifre en az 4 karakter olmalı.");
        const cls = classes.find(c => c.id === selectedClass.id);
        if (!cls) return alert("Sınıf bulunamadı.");
        const updatedStudents = cls.students.filter(Boolean).map(s => s.id === loggedInStudent.id ? { ...s, password: studentNewPassword } : s);
        await updateDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { students: updatedStudents });
        setLoggedInStudent({ ...loggedInStudent, password: studentNewPassword });
        setStudentSettingsModal(false); setStudentNewPassword("");
        alert("Şifreniz başarıyla güncellendi!");
    };

    const handleLogout = () => { setCurrentUserRole(null); setLoggedInStudent(null); setAuthView('selection'); };
    const verifyTeacherPin = () => pinInput === "1234" ? (setCurrentUserRole('teacher'), setPinInput("")) : alert("Hatalı PIN!");

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-indigo-400 font-bold tracking-widest animate-pulse">YÜKLENİYOR...</div>;

    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
                <div className="w-full max-w-[420px]">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-5 rounded-[2rem] bg-indigo-600 shadow-2xl mb-6"><GraduationCap size={52} className="text-white" /></div>
                        <h1 className="text-4xl font-black text-white tracking-tighter italic">BERKANT HOCA</h1>
                    </div>
                    <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                        {authView === 'selection' ? (
                            <div className="space-y-4">
                                <button onClick={() => setAuthView('student')} className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-5 transition-all text-white hover:bg-white/10">
                                    <User className="text-indigo-400" size={24}/><p className="font-bold text-lg text-left flex-1">Öğrenci & Veli</p><ChevronRight size={18}/>
                                </button>
                                <button onClick={() => setAuthView('teacher')} className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-5 transition-all text-white hover:bg-white/10">
                                    <ShieldAlert className="text-slate-400" size={24}/><p className="font-bold text-lg text-left flex-1">Öğretmen</p><ChevronRight size={18}/>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <button onClick={() => setAuthView('selection')} className="text-slate-500 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors"><ChevronLeft size={16}/> GERİ DÖN</button>
                                {authView === 'student' ? (
                                    <div className="space-y-4">
                                        <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                                        <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                                        <button onClick={() => {
                                            let found = null;
                                            classes.forEach(c => {
                                                const s = (c.students || []).filter(Boolean).find(std => std.username?.trim() === studentUser.trim() && std.password?.trim() === studentPass.trim());
                                                if (s) found = { student: s, class: c };
                                            });
                                            if (found) { setCurrentUserRole('student'); setLoggedInStudent(found.student); setSelectedClass(found.class); setAuthView('selection'); }
                                            else alert("Hatalı giriş.");
                                        }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black">GİRİŞ YAP</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <input type="password" placeholder="••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-5xl tracking-widest focus:border-indigo-500" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyTeacherPin()} />
                                        <button onClick={verifyTeacherPin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black">YÖNETİMİ AÇ</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* --- DOĞRUDAN GÖMÜLÜ BAŞLIK (ŞİFRE DEĞİŞTİRME BURADA) --- */}
            <header className="bg-white border-b border-slate-200 shadow-sm no-print">
                <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        <div className="w-10"></div>
                        <div className="text-center">
                            <h1 className="text-3xl font-black tracking-tighter text-slate-800 italic">BERKANT HOCA</h1>
                            <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Eğitim & Ödev Takip</p>
                        </div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {/* ÖĞRENCİ AYARLAR BUTONU KESİN GÖRÜNECEK */}
                            {currentUserRole === 'student' && (
                                <button onClick={() => setStudentSettingsModal(true)} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                                    <Settings size={22}/>
                                </button>
                            )}
                            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                                <LogOut size={22}/>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-8 pb-20">
                {currentUserRole === 'teacher' ? (
                    <AdminPanel 
                        classes={classes}
                        library={library}
                        onToggleClass={(id) => setClasses(classes.map(c => c.id === id ? {...c, isOpen: !c.isOpen} : c))}
                        onOpenModal={(type, data) => setModal({ type, data })}
                        onUpdateGradeClick={(data) => setStatusModal(data)}
                        onDeleteTopic={handleDeleteTopic}
                        onDeleteSource={handleDeleteSource}
                        calculateStats={(s, t) => {
                            if (!s || !t || t.length === 0) return { percentage: 0 };
                            let tot=0, comp=0;
                            const colIds = t.flatMap(tp => tp.subColumns?.map(c => c.id) || []);
                            (s || []).filter(Boolean).forEach(std => colIds.forEach(id => { tot++; if (std.grades?.[id] === 'done') comp++; }));
                            return { percentage: tot===0 ? 0 : Math.round((comp/tot)*100) };
                        }}
                        onPrintPasswords={(cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 500); }}
                        onPrintReport={(cls, std) => { setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 500); }}
                        onAddStudent={async (clsId, name) => {
                            if(!name.trim()) return;
                            const cls = classes.find(c => c.id === clsId);
                            const nStd = { id: `std_${Date.now()}`, name: name.trim(), username: `u${Date.now()}`, password: `p${Math.floor(1000+Math.random()*9000)}`, grades: {} };
                            await updateDoc(doc(db, 'berkant_hoca_classes_secure', clsId), { students: [...(cls.students || []), nStd] });
                        }}
                        onDeleteClass={async (id) => { if(confirm("Silinsin mi?")) await deleteDoc(doc(db, 'berkant_hoca_classes_secure', id)); }}
                    />
                ) : (
                    <StudentView student={loggedInStudent} selectedClass={selectedClass} />
                )}
            </main>

            {/* --- DURUM SEÇİMİ --- */}
            {statusModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-xs shadow-2xl overflow-hidden animate-fadeIn">
                        <div className="p-4 bg-slate-50 border-b text-center font-black text-xs text-slate-400 uppercase tracking-widest">Durum Seç</div>
                        <div className="p-4 grid grid-cols-1 gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button key={opt.id} onClick={() => handleUpdateGrade(statusModal.classId, statusModal.studentId, statusModal.colId, opt.id)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs border-2 transition-all hover:scale-95 ${opt.bg} ${opt.color} ${opt.border}`}>{opt.label}</button>
                            ))}
                            <button onClick={() => setStatusModal(null)} className="w-full py-3 text-slate-400 font-bold text-xs mt-2 italic hover:text-slate-600">İptal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- KÜTÜPHANELİ MODAL --- */}
            {modal.type && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center font-black text-slate-800 uppercase tracking-tighter">
                            {modal.type === 'class' ? 'Sınıf Ekle' : 'Sisteme Ekle'}
                            <button onClick={() => setModal({type:null, data:{}})} className="text-slate-400"><X/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <input id="modalInput" type="text" autoFocus className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold" placeholder="İsim yazınız..." />
                            
                            {modal.type !== 'class' && (
                                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2 ml-2 tracking-widest flex items-center gap-1"><Book size={10}/> Kütüphaneden Seç</p>
                                    {library.filter(i => i.type === modal.type).map(item => (
                                        <button key={item.id} onClick={() => { document.getElementById('modalInput').value = item.text; }} className="w-full text-left p-3 rounded-xl hover:bg-white text-xs font-bold text-slate-600 flex items-center gap-2"><Star size={10} className="text-amber-400 shrink-0"/> {item.text}</button>
                                    ))}
                                </div>
                            )}

                            <button onClick={handleModalSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-500 transition-all">KAYDET</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ÖĞRENCİ AYARLARI MODALI --- */}
            {studentSettingsModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center font-black text-slate-800 uppercase tracking-tighter">
                            Şifre Güncelle <button onClick={() => setStudentSettingsModal(false)} className="text-slate-400"><X/></button>
                        </div>
                        <div className="p-8">
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-center tracking-[0.3em] mb-6" value={studentNewPassword} onChange={e => setStudentNewPassword(e.target.value)} placeholder="YENİ ŞİFRE" />
                            <button onClick={updateStudentPassword} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">GÜNCELLE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- YAZDIRMA --- */}
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto p-10 print:p-0">
                    <div className="no-print flex justify-end gap-4 mb-8">
                        <button onClick={() => setPrintData(null)} className="px-6 py-2 border rounded-xl font-bold">Kapat</button>
                        <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md">Yazdır</button>
                    </div>
                    {printData.type === 'passwords' ? (
                        <div className="grid grid-cols-2 gap-4">
                            {(printData.classData.students || []).filter(Boolean).map(s => (
                                <div key={s.id} className="border-2 border-dashed border-slate-300 p-6 rounded-[2rem] text-center page-break-inside-avoid">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{printData.classData.className}</div>
                                    <div className="text-2xl font-black mb-4 italic">BERKANT HOCA</div>
                                    <div className="font-bold text-lg mb-1">{s.name}</div>
                                    <div className="text-xs text-slate-500 font-mono mb-2">Kullanıcı: {s.username}</div>
                                    <div className="bg-slate-100 p-3 rounded-2xl font-black text-xl tracking-[0.3em]">{s.password}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto border-t-8 border-slate-800 pt-10">
                            <div className="flex justify-between items-center mb-10">
                                <h1 className="text-4xl font-black italic tracking-tighter">GELİŞİM KARNESİ</h1>
                                <div className="text-right">
                                    <div className="font-black text-xl uppercase">{printData.studentData?.name}</div>
                                    <div className="text-sm text-slate-500 uppercase font-bold">{printData.classData.className}</div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                {printData.classData.topics?.map(topic => (
                                    <div key={topic.id} className="border-b-2 border-slate-100 pb-4 page-break-inside-avoid">
                                        <h3 className="font-black text-indigo-600 uppercase mb-4 tracking-widest">{topic.title}</h3>
                                        <table className="w-full text-left text-sm">
                                            <thead><tr className="text-slate-400 border-b font-bold"><th className="pb-2">KAYNAK</th><th className="pb-2 text-right">DURUM</th></tr></thead>
                                            <tbody>
                                                {topic.subColumns?.map(col => {
                                                    const statusId = printData.studentData?.grades?.[col.id] || 'assigned';
                                                    const opt = STATUS_OPTIONS.find(o => o.id === statusId);
                                                    return (
                                                        <tr key={col.id} className="border-b border-slate-50">
                                                            <td className="py-3 font-bold">{col.title}</td>
                                                            <td className="py-3 text-right font-black uppercase text-[10px] tracking-widest" style={{color: opt?.color?.replace('text-','')}}>{opt?.label}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;
