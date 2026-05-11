import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, collection, onSnapshot, 
    deleteDoc, query, updateDoc 
} from 'firebase/firestore';
import { 
    GraduationCap, User, ShieldAlert, X, Loader2, 
    Calendar, CheckCircle, Printer, ChevronLeft, 
    Settings, AlertOctagon, LogOut, ChevronRight
} from 'lucide-react';

// Konfigürasyon ve Alt Bileşenler
import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
import { Header, CountdownTimer, AnnouncementBox } from './components/CommonUI.jsx';
import { StudentView } from './components/StudentView.jsx';
import { AdminPanel } from './components/AdminPanel.jsx';

// --- YARDIMCI ARAÇLAR ---
const generateId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generatePassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 6; i++) { pwd += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return pwd;
};
const generateUsername = (name) => {
    const trMap = { 'ç':'c', 'ğ':'g', 'ı':'i', 'ö':'o', 'ş':'s', 'ü':'u', 'Ç':'C', 'Ğ':'G', 'İ':'I', 'Ö':'O', 'Ş':'S', 'Ü':'U' };
    let baseName = name.toLowerCase().replace(/[çğıöşüÇĞİÖŞÜ]/g, m => trMap[m] || m).replace(/[^a-z0-9]/g, '.');
    return `${baseName}.${Math.floor(100 + Math.random() * 900)}`;
};

// --- FİREBASE BAŞLATMA ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
    // --- TEMEL DURUMLAR ---
    const [user, setUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null); 
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('home');
    const [selectedClass, setSelectedClass] = useState(null);
    const [authView, setAuthView] = useState('selection');
    const [announcement, setAnnouncement] = useState("");
    const [dailyQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    // --- MODAL VE FORM DURUMLARI ---
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [modal, setModal] = useState({ type: null, data: {} });
    const [modalInputVal, setModalInputVal] = useState("");
    
    // --- ÖZEL FONKSİYON DURUMLARI ---
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [activeRiskClass, setActiveRiskClass] = useState(null);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");
    const [printData, setPrintData] = useState(null);

    // --- VERİ AKIŞI (FİREBASE) ---
    useEffect(() => {
        signInAnonymously(auth);
        return onAuthStateChanged(auth, (u) => u && setUser(u));
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'berkant_hoca_classes_secure'));
        const unsub = onSnapshot(q, (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const settingsRef = doc(db, 'berkant_hoca_system_config_v2', 'main_config');
        const settingsUnsub = onSnapshot(settingsRef, (snap) => {
            if (snap.exists()) setAnnouncement(snap.data().announcement);
        });
        return () => { unsub(); settingsUnsub(); };
    }, [user]);

    // --- ÖDEV DURUM GÜNCELLEME (TIKLAYINCA DEĞİŞEN MEKANİZMA) ---
    const handleUpdateGrade = async (classId, studentId, colId) => {
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        const studentIdx = cls.students.findIndex(s => s.id === studentId);
        if (studentIdx === -1) return;

        const currentStatus = cls.students[studentIdx].grades?.[colId] || 'assigned';
        const sequence = ['assigned', 'done', 'missing', 'exempt'];
        const nextStatus = sequence[(sequence.indexOf(currentStatus) + 1) % sequence.length];

        const updatedStudents = [...cls.students];
        updatedStudents[studentIdx] = {
            ...updatedStudents[studentIdx],
            grades: { ...updatedStudents[studentIdx].grades, [colId]: nextStatus }
        };

        await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { students: updatedStudents });
    };

    // --- MODAL KAYIT İŞLEMLERİ ---
    const handleModalSubmit = async () => {
        if (!modalInputVal.trim()) return;
        const clsId = modal.data.classId;
        const cls = classes.find(c => c.id === clsId);

        if (modal.type === 'class') {
            const newClass = { id: generateId('class'), className: modalInputVal, topics: [], students: [], isOpen: true };
            await setDoc(doc(db, 'berkant_hoca_classes_secure', newClass.id), newClass);
        } else if (modal.type === 'topic') {
            const newTopic = { id: generateId('topic'), title: modalInputVal, subColumns: [] };
            await updateDoc(doc(db, 'berkant_hoca_classes_secure', clsId), { topics: [...(cls.topics || []), newTopic] });
        } else if (modal.type === 'source') {
            const newColId = generateId('col');
            const updatedTopics = cls.topics.map(t => t.id === modal.data.topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: modalInputVal }] } : t);
            const updatedStudents = cls.students.map(s => ({ ...s, grades: { ...s.grades, [newColId]: 'assigned' } }));
            await updateDoc(doc(db, 'berkant_hoca_classes_secure', clsId), { topics: updatedTopics, students: updatedStudents });
        }
        setModal({ type: null, data: {} }); setModalInputVal("");
    };

    // --- GİRİŞ / ÇIKIŞ ---
    const handleLogout = () => { setCurrentUserRole(null); setLoggedInStudent(null); setAuthView('selection'); };
    const verifyTeacherPin = () => pinInput === "1234" ? (setCurrentUserRole('teacher'), setPinInput("")) : alert("Hatalı PIN!");
    
    const handleStudentLogin = () => {
        let found = null;
        classes.forEach(c => {
            const s = c.students?.find(std => std.username.trim() === studentUser.trim() && std.password.trim() === studentPass.trim());
            if (s) found = { student: s, class: c };
        });
        if (found) { setCurrentUserRole('student'); setLoggedInStudent(found.student); setSelectedClass(found.class); }
        else alert("Giriş bilgileri yanlış.");
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-indigo-400 font-bold tracking-tighter text-2xl animate-pulse">YÜKLENİYOR...</div>;

    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="w-full max-w-[420px] z-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-5 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-2xl mb-6">
                            <GraduationCap size={52} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter italic">BERKANT HOCA</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Akademik Takip Sistemi</p>
                    </div>

                    <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                        {authView === 'selection' ? (
                            <div className="space-y-4">
                                <button onClick={() => setAuthView('student')} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-5 transition-all group">
                                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400"><User size={24}/></div>
                                    <div className="text-left"><p className="text-white font-bold text-lg">Öğrenci & Veli</p><p className="text-slate-500 text-xs">Gelişim Karnesi</p></div>
                                    <ChevronRight className="ml-auto text-slate-600 group-hover:text-white transition-colors" />
                                </button>
                                <button onClick={() => setAuthView('teacher')} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-5 transition-all group">
                                    <div className="p-3 bg-slate-500/20 rounded-xl text-slate-400"><ShieldAlert size={24}/></div>
                                    <div className="text-left"><p className="text-white font-bold text-lg">Öğretmen</p><p className="text-slate-500 text-xs">Sınıf Yönetimi</p></div>
                                    <ChevronRight className="ml-auto text-slate-600 group-hover:text-white transition-colors" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <button onClick={() => setAuthView('selection')} className="text-slate-500 hover:text-white text-xs font-bold flex items-center gap-2"><ChevronLeft size={16}/> SEÇİME DÖN</button>
                                {authView === 'student' ? (
                                    <div className="space-y-4">
                                        <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                                        <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                                        <button onClick={handleStudentLogin} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20">SİSTEME GİRİŞ</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <input type="password" placeholder="••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-5xl tracking-widest focus:border-indigo-500" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyTeacherPin()} />
                                        <button onClick={verifyTeacherPin} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black">YÖNETİMİ AÇ</button>
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
            {/* GÜNCELLENMİŞ KAYAN BAŞLIK */}
            <header className="bg-white border-b border-slate-200 shadow-sm no-print">
                <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        <div className="w-10"></div>
                        <div className="text-center">
                            <h1 className="text-3xl font-black tracking-tighter text-slate-800 italic">BERKANT HOCA</h1>
                            <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Eğitim & Ödev Takip Platformu</p>
                        </div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {currentUserRole === 'student' && (
                                <button onClick={() => setStudentSettingsModal(true)} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"><Settings size={22}/></button>
                            )}
                            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><LogOut size={22}/></button>
                        </div>
                    </div>
                    <div className="text-center mt-3 max-w-md mx-auto opacity-70">
                        <p className="text-[11px] text-slate-500 italic">"{dailyQuote.text}"</p>
                        <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">— {dailyQuote.author}</p>
                    </div>
                </div>
            </header>

            <CountdownTimer />
            <AnnouncementBox content={announcement} isTeacher={currentUserRole === 'teacher'} />
            
            <main className="max-w-6xl mx-auto px-4 mt-8 pb-20">
                {currentUserRole === 'teacher' ? (
                    <AdminPanel 
                        classes={classes}
                        onToggleClass={(id) => setClasses(classes.map(c => c.id === id ? {...c, isOpen: !c.isOpen} : c))}
                        onOpenModal={(type, data) => setModal({ type, data })}
                        onAddStudent={handleAddStudent}
                        onUpdateGrade={handleUpdateGrade} // BAĞLANTI TAMAM
                        onOpenRisk={(cls) => { setActiveRiskClass(cls); setShowRiskModal(true); }}
                        onPrintPasswords={(cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 300); }}
                        onPrintStudentReport={(cls, std) => { setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 300); }}
                        onDeleteClass={async (e, id) => { e.stopPropagation(); if(confirm("Sınıf silinsin mi?")) await deleteDoc(doc(db, 'berkant_hoca_classes_secure', id)); }}
                        calculateStats={(s, t) => {
                            if (!s || !t || t.length === 0) return { percentage: 0 };
                            let tot=0, comp=0;
                            const colIds = t.flatMap(tp => tp.subColumns?.map(c => c.id) || []);
                            s.forEach(std => colIds.forEach(id => { tot++; if (std.grades?.[id] === 'done') comp++; }));
                            return { percentage: tot===0 ? 0 : Math.round((comp/tot)*100) };
                        }}
                    />
                ) : (
                    <StudentView student={loggedInStudent} selectedClass={selectedClass} />
                )}
            </main>

            {/* --- MODAL: SINIF/ÖDEV/KAYNAK EKLEME --- */}
            {modal.type && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center font-black text-slate-800 uppercase tracking-tighter">
                            {modal.type === 'class' ? 'Yeni Sınıf Oluştur' : (modal.type === 'topic' ? 'Yeni Ödev Grubu' : 'Yeni Kaynak Ekle')}
                            <button onClick={() => setModal({type:null, data:{}})} className="text-slate-400"><X/></button>
                        </div>
                        <div className="p-8">
                            <input autoFocus type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold" placeholder="İsim giriniz..." value={modalInputVal} onChange={(e) => setModalInputVal(e.target.value)} />
                            <button onClick={handleModalSubmit} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black mt-6 shadow-xl hover:bg-indigo-500 transition-colors">KAYDET VE KAPAT</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: RİSK ANALİZİ --- */}
            {showRiskModal && activeRiskClass && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 bg-rose-50 border-b border-rose-100 flex justify-between items-center text-rose-800 font-black uppercase tracking-tighter">
                            <div className="flex items-center gap-2"><AlertOctagon size={20}/> Akademik Risk Tespiti</div>
                            <button onClick={() => setShowRiskModal(false)}><X/></button>
                        </div>
                        <div className="p-8 space-y-3 max-h-60 overflow-y-auto">
                            {activeRiskClass.students.filter(s => {
                                let tot=0, comp=0;
                                activeRiskClass.topics.flatMap(tp => tp.subColumns.map(c => c.id)).forEach(id => { tot++; if(s.grades?.[id] === 'done') comp++; });
                                return tot > 0 && (comp/tot) < 0.4;
                            }).length > 0 ? activeRiskClass.students.filter(s => {
                                let tot=0, comp=0;
                                activeRiskClass.topics.flatMap(tp => tp.subColumns.map(c => c.id)).forEach(id => { tot++; if(s.grades?.[id] === 'done') comp++; });
                                return tot > 0 && (comp/tot) < 0.4;
                            }).map((s, i) => (
                                <div key={i} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 font-bold flex items-center gap-3">
                                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div> {s.name}
                                </div>
                            )) : <div className="text-center py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Şu an riskli öğrenci bulunmuyor.</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: ÖĞRENCİ ŞİFRE DEĞİŞTİRME --- */}
            {studentSettingsModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center font-black text-slate-800 uppercase tracking-tighter">
                            Şifre Güncelle
                            <button onClick={() => setStudentSettingsModal(false)}><X/></button>
                        </div>
                        <div className="p-8">
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-center tracking-[0.3em]" value={studentNewPassword} onChange={e => setStudentNewPassword(e.target.value)} placeholder="YENİ ŞİFRE" />
                            <button onClick={updateStudentPassword} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black mt-6 shadow-xl">KAYDET VE GÜNCELLE</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
