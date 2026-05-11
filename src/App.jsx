import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, collection, onSnapshot, 
    deleteDoc, query 
} from 'firebase/firestore';
import { 
    GraduationCap, User, ShieldAlert, X, Loader2, 
    Calendar, CheckCircle, Printer, ChevronLeft, 
    Settings, AlertOctagon, StickyNote, Info 
} from 'lucide-react';

// Konfigürasyon ve Modüller
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
    // --- TEMEL STATE'LER ---
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

    // --- FORM VE MODAL STATE'LERİ ---
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [modal, setModal] = useState({ type: null, data: {} });
    const [modalInputVal, setModalInputVal] = useState("");
    
    // --- ÖZEL MODAL STATE'LERİ (RİSK VE AYARLAR) ---
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [activeRiskClass, setActiveRiskClass] = useState(null);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");
    const [printData, setPrintData] = useState(null);

    // --- FİREBASE VERİ AKIŞI ---
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

    // --- AKSİYON FONKSİYONLARI ---
    const handleLogout = () => { 
        setCurrentUserRole(null); 
        setLoggedInStudent(null); 
        setView('home'); 
        setAuthView('selection'); 
    };

    const verifyTeacherPin = () => {
        if (pinInput === "1234") {
            setCurrentUserRole('teacher');
            setAuthView('selection');
            setPinInput("");
        } else { alert("Hatalı PIN!"); }
    };

    const handleStudentLogin = () => {
        let found = null;
        classes.forEach(c => {
            const s = c.students?.find(std => 
                std.username.trim() === studentUser.trim() && 
                std.password.trim() === studentPass.trim()
            );
            if (s) { found = { student: s, class: c }; }
        });
        if (found) {
            setCurrentUserRole('student');
            setLoggedInStudent(found.student);
            setSelectedClass(found.class);
            setAuthView('selection');
        } else { alert("Hatalı giriş."); }
    };

    const updateStudentPassword = async () => {
        if (studentNewPassword.length < 4) return alert("Şifre en az 4 karakter olmalı.");
        const cls = classes.find(c => c.id === selectedClass.id);
        const updatedStudents = cls.students.map(s => 
            s.id === loggedInStudent.id ? { ...s, password: studentNewPassword } : s
        );
        await setDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { ...cls, students: updatedStudents }, { merge: true });
        setLoggedInStudent({ ...loggedInStudent, password: studentNewPassword });
        setStudentSettingsModal(false);
        setStudentNewPassword("");
        alert("Şifreniz güncellendi.");
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">YÜKLENİYOR...</div>;

    // --- GİRİŞ EKRANI TASARIMI (KURUMSAL) ---
    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
                <div className="w-full max-w-[440px] relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 rounded-3xl bg-indigo-600 shadow-2xl mb-6">
                            <GraduationCap size={48} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Halkalı Fen Bilimleri</h1>
                    </div>
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                        {authView === 'selection' ? (
                            <div className="space-y-4">
                                <button onClick={() => setAuthView('student')} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-5 transition-all text-white">
                                    <User className="text-indigo-400" size={24}/>
                                    <div className="text-left"><p className="font-bold text-lg">Öğrenci & Veli</p><p className="text-slate-400 text-xs">Takip Paneli</p></div>
                                </button>
                                <button onClick={() => setAuthView('teacher')} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-5 transition-all text-white">
                                    <ShieldAlert className="text-rose-400" size={24}/>
                                    <div className="text-left"><p className="font-bold text-lg">Öğretmen</p><p className="text-slate-400 text-xs">Yönetim Merkezi</p></div>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <button onClick={() => setAuthView('selection')} className="text-slate-500 hover:text-white text-xs font-bold flex items-center gap-2"><ChevronLeft size={16}/> GERİ DÖN</button>
                                {authView === 'student' ? (
                                    <div className="space-y-4">
                                        <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                                        <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                                        <button onClick={handleStudentLogin} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl">SİSTEME GİRİŞ YAP</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <input type="password" placeholder="••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-4xl tracking-widest focus:border-indigo-500" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyTeacherPin()} />
                                        <button onClick={verifyTeacherPin} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all">YÖNETİMİ AÇ</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- ANA UYGULAMA PANELİ ---
    return (
        <div className="min-h-screen bg-slate-50">
            <Header 
                role={currentUserRole} 
                view={view} 
                onLogout={handleLogout} 
                onGoHome={() => setView('home')} 
                onOpenSettings={() => setStudentSettingsModal(true)} // ÖĞRENCİ AYARLARI BURADA TETİKLENİR
                dailyQuote={dailyQuote}
            />
            <CountdownTimer />
            <AnnouncementBox content={announcement} isTeacher={currentUserRole === 'teacher'} />
            
            <main className="max-w-6xl mx-auto px-4 mt-8">
                {currentUserRole === 'teacher' ? (
                    <AdminPanel 
                        classes={classes}
                        onToggleClass={(id) => setClasses(classes.map(c => c.id === id ? {...c, isOpen: !c.isOpen} : c))}
                        onOpenModal={(type, data) => setModal({ type, data })}
                        onAddStudent={handleAddStudent}
                        newStudentName={newStudentName}
                        setNewStudentName={setNewStudentName}
                        onOpenRisk={(cls) => { setActiveRiskClass(cls); setShowRiskModal(true); }} // RİSK BUTONU BURADA TETİKLENİR
                        calculateStats={(s, t) => {
                            if (!s || !t || t.length === 0) return { percentage: 0, atRisk: [] };
                            let total = 0, completed = 0;
                            const atRisk = [];
                            const colIds = t.flatMap(topic => topic.subColumns?.map(c => c.id) || []);
                            s.forEach(student => {
                                let sTotal = 0, sComp = 0;
                                colIds.forEach(id => {
                                    sTotal++; if (student.grades?.[id] === 'done') sComp++;
                                });
                                total += sTotal; completed += sComp;
                                if (sTotal > 0 && (sComp/sTotal) < 0.5) atRisk.push(student.name);
                            });
                            return { percentage: total === 0 ? 0 : Math.round((completed/total)*100), atRisk };
                        }}
                        onPrintPasswords={(cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 300); }}
                        onPrintStudentReport={(cls, std) => { setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 300); }}
                        onDownloadReport={(cls) => console.log("Rapor İndiriliyor...")}
                        onDeleteClass={async (e, id) => { e.stopPropagation(); if(confirm("Sınıfı sil?")) await deleteDoc(doc(db, 'berkant_hoca_classes_secure', id)); }}
                    />
                ) : (
                    <StudentView student={loggedInStudent} selectedClass={selectedClass} />
                )}
            </main>

            {/* --- RİSK ANALİZİ MODALI --- */}
            {showRiskModal && activeRiskClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-fadeIn">
                        <div className="p-6 bg-rose-50 border-b border-rose-100 flex justify-between items-center text-rose-800">
                            <h3 className="font-extrabold flex items-center gap-2"><AlertOctagon size={20}/> Riskli Öğrenci Tespiti</h3>
                            <button onClick={() => setShowRiskModal(false)}><X/></button>
                        </div>
                        <div className="p-6 max-h-60 overflow-y-auto">
                            <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-widest">Başarı Oranı %50 Altında Olanlar:</p>
                            <div className="space-y-2">
                                {activeRiskClass.students.filter(s => {
                                    const stats = t => {
                                        let tot=0, comp=0;
                                        t.flatMap(tp => tp.subColumns.map(c => c.id)).forEach(id => {
                                            tot++; if(s.grades?.[id] === 'done') comp++;
                                        });
                                        return tot === 0 ? 1 : comp/tot;
                                    };
                                    return stats(activeRiskClass.topics) < 0.5;
                                }).map((s, i) => (
                                    <div key={i} className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold text-sm flex items-center gap-3">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div> {s.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HESABIM / ŞİFRE DEĞİŞTİRME MODALI --- */}
            {studentSettingsModal && loggedInStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl animate-fadeIn overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><Settings size={20} className="text-indigo-600"/> Şifre Güncelle</h3>
                            <button onClick={() => setStudentSettingsModal(false)}><X/></button>
                        </div>
                        <div className="p-6">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Yeni Şifreniz</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold tracking-widest" value={studentNewPassword} onChange={e => setStudentNewPassword(e.target.value)} placeholder="••••••" />
                            <button onClick={updateStudentPassword} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black mt-6 shadow-xl shadow-indigo-600/20">ŞİFREYİ KAYDET</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- YAZDIRMA EKRANI --- */}
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
                    <div className="p-4 no-print flex justify-between items-center bg-slate-50 border-b">
                        <button onClick={() => setPrintData(null)} className="px-4 py-2 border rounded-xl font-bold">Kapat</button>
                        <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Yazdır</button>
                    </div>
                    {/* Yazdırma içeriği burada render edilir (Önceki şifre kartları/rapor tasarımı aynen geçerli) */}
                </div>
            )}
        </div>
    );
};

export default App;
