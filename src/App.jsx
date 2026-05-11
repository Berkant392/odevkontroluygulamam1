import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
    deleteDoc, query, addDoc
} from 'firebase/firestore';
import { GraduationCap, User, ShieldAlert, X, Loader2, Calendar, CheckCircle, Printer } from 'lucide-react';

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
    const [user, setUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null); 
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('home');
    const [selectedClass, setSelectedClass] = useState(null);
    const [authView, setAuthView] = useState('selection');
    const [announcement, setAnnouncement] = useState("");
    const [dailyQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    // Form ve Modal Durumları
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [modal, setModal] = useState({ type: null, data: {} });
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalDateVal, setModalDateVal] = useState("");
    const [useLibrary, setUseLibrary] = useState(false);
    
    // Yazdırma Durumu
    const [printData, setPrintData] = useState(null);

    // --- VERİ DİNLEME ---
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
        
        const libUnsub = onSnapshot(collection(db, 'berkant_hoca_library'), (snap) => {
            setLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const settingsRef = doc(db, 'berkant_hoca_system_config_v2', 'main_config');
        const settingsUnsub = onSnapshot(settingsRef, (snap) => {
            if (snap.exists()) setAnnouncement(snap.data().announcement);
        });
        return () => { unsub(); settingsUnsub(); libUnsub(); };
    }, [user]);

    // --- MODAL İŞLEMLERİ ---
    const handleModalSubmit = async () => {
        if (!modalInputVal.trim()) return;
        if (modal.type === 'class') {
            const newClass = { id: generateId('class'), className: modalInputVal, topics: [], students: [] };
            await setDoc(doc(db, 'berkant_hoca_classes_secure', newClass.id), newClass);
        } 
        else if (modal.type === 'topic') {
            const cls = classes.find(c => c.id === modal.data.classId);
            const newTopic = { id: generateId('topic'), title: modalInputVal, date: modalDateVal, subColumns: [] };
            await setDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { ...cls, topics: [...(cls.topics || []), newTopic] }, { merge: true });
        }
        else if (modal.type === 'source') {
            const cls = classes.find(c => c.id === modal.data.classId);
            const newColId = generateId('col');
            const updatedTopics = cls.topics.map(t => t.id === modal.data.topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: modalInputVal }] } : t);
            const updatedStudents = cls.students.map(std => ({ ...std, grades: { ...std.grades, [newColId]: 'assigned' } }));
            await setDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { ...cls, topics: updatedTopics, students: updatedStudents }, { merge: true });
        }
        setModal({ type: null, data: {} });
        setModalInputVal("");
        setModalDateVal("");
    };

    // --- TEMEL FONKSİYONLAR ---
    const handleLogout = () => { setCurrentUserRole(null); setLoggedInStudent(null); setView('home'); setAuthView('selection'); };
    const verifyTeacherPin = () => { if (pinInput === "1234") { setCurrentUserRole('teacher'); setAuthView('selection'); setPinInput(""); } else { alert("Hatalı PIN!"); } };
    
    const handleStudentLogin = () => {
        let found = null;
        classes.forEach(c => {
            const s = c.students?.find(std => std.username.trim() === studentUser.trim() && std.password.trim() === studentPass.trim());
            if (s) { found = { student: s, class: c }; }
        });
        if (found) {
            setCurrentUserRole('student');
            setLoggedInStudent(found.student);
            setSelectedClass(found.class);
            setAuthView('selection');
            setStudentUser(""); setStudentPass("");
        } else { alert("Giriş bilgileri hatalı."); }
    };

    const handleAddStudent = async (classId) => {
        if (!newStudentName.trim()) return;
        const cls = classes.find(c => c.id === classId);
        const newStudent = { id: generateId('std'), name: newStudentName.trim(), username: generateUsername(newStudentName.trim()), password: generatePassword(), grades: {}, assignmentNotes: {} };
        await setDoc(doc(db, 'berkant_hoca_classes_secure', cls.id), { ...cls, students: [...(cls.students || []), newStudent] }, { merge: true });
        setNewStudentName("");
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-black tracking-widest">YÜKLENİYOR...</div>;

    // Giriş ekranı kısmını (if (!currentUserRole)) bununla değiştirin:
if (!currentUserRole) {
    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-[440px] relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-2xl shadow-indigo-500/20 mb-6">
                        <GraduationCap size={48} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Halkalı Fen Bilimleri</h1>
                    <p className="text-slate-400 font-medium tracking-widest uppercase text-[10px]">Kurumsal Eğitim Yönetim Portalı</p>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
                    {authView === 'selection' ? (
                        <div className="space-y-4">
                            <button onClick={() => setAuthView('student')} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-5 transition-all group">
                                <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/40 text-indigo-400"><User size={24}/></div>
                                <div className="text-left"><p className="text-white font-bold text-lg">Öğrenci & Veli</p><p className="text-slate-400 text-xs">Kişisel gelişim paneli</p></div>
                            </button>
                            <button onClick={() => setAuthView('teacher')} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-5 transition-all group">
                                <div className="p-3 bg-slate-500/20 rounded-xl group-hover:bg-slate-500/40 text-slate-400"><ShieldAlert size={24}/></div>
                                <div className="text-left"><p className="text-white font-bold text-lg">Öğretmen</p><p className="text-slate-400 text-xs">Yönetim ve analiz merkezi</p></div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <button onClick={() => setAuthView('selection')} className="text-slate-500 hover:text-white text-xs font-bold flex items-center gap-2 mb-2 transition-colors">
                                <ChevronLeft size={16}/> SEÇİME DÖN
                            </button>
                            {authView === 'student' ? (
                                <div className="space-y-4">
                                    <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                                    <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                                    <button onClick={handleStudentLogin} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20">SİSTEME GİRİŞ YAP</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-slate-400 text-center text-[10px] font-bold uppercase tracking-widest">Yönetici PIN Kodunu Giriniz</p>
                                    <input type="password" placeholder="••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-4xl tracking-[0.5em] focus:border-indigo-500" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyTeacherPin()} />
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

    return (
        <div className="min-h-screen bg-slate-50">
            <Header role={currentUserRole} view={view} onLogout={handleLogout} onGoHome={() => setView('home')} dailyQuote={dailyQuote} />
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
                        calculateStats={(s, t) => {
                            if (!s || !t || t.length === 0) return { percentage: 0 };
                            let total = 0, completed = 0;
                            const colIds = t.flatMap(topic => topic.subColumns?.map(c => c.id) || []);
                            s.forEach(student => { colIds.forEach(id => { total++; if (student.grades?.[id] === 'done') completed++; }); });
                            return { percentage: total === 0 ? 0 : Math.round((completed/total)*100) };
                        }}
                        onDeleteClass={async (e, id) => { e.stopPropagation(); if(confirm("Silmek istediğinize emin misiniz?")) await deleteDoc(doc(db, 'berkant_hoca_classes_secure', id)); }}
                        onPrintPasswords={(cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 300); }}
                        onPrintStudentReport={(cls, std) => { setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 300); }}
                        onDownloadReport={(cls) => {
                            let csvContent = "data:text/csv;charset=utf-8,Öğrenci,Kullanıcı Adı,Şifre\n";
                            cls.students.forEach(std => { csvContent += `${std.name},${std.username},${std.password}\n`; });
                            const link = document.createElement("a");
                            link.setAttribute("href", encodeURI(csvContent));
                            link.setAttribute("download", `${cls.className}_Sifreler.csv`);
                            link.click();
                        }}
                    />
                ) : (
                    <StudentView student={loggedInStudent} selectedClass={selectedClass} />
                )}
            </main>

            {/* Yazdırma Önizleme Ekranı */}
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
                    <div className="p-4 no-print flex justify-between items-center bg-slate-100 border-b shadow-sm sticky top-0">
                        <span className="font-bold text-slate-700">Yazdırma Önizlemesi</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPrintData(null)} className="bg-white border px-4 py-2 rounded-lg font-bold">Kapat</button>
                            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={16}/> Yazdır</button>
                        </div>
                    </div>
                    
                    {printData.type === 'passwords' && (
                        <div className="p-10 grid grid-cols-2 gap-4">
                            {printData.classData.students?.map((std, i) => (
                                <div key={i} className="border-2 border-dashed p-4 rounded-xl text-center">
                                    <div className="font-black text-lg">{std.name}</div>
                                    <div className="text-xs text-slate-400 mt-2">Kullanıcı Adı: {std.username}</div>
                                    <div className="font-mono font-black text-xl tracking-widest mt-1">{std.password}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {printData.type === 'report' && (
                        <div className="p-10 max-w-3xl mx-auto">
                            <h1 className="text-3xl font-black border-b-4 border-slate-800 pb-4 mb-6">Öğrenci Gelişim Raporu</h1>
                            <div className="flex justify-between mb-8">
                                <div><div className="text-slate-400 uppercase text-xs font-bold">Öğrenci</div><div className="text-xl font-bold">{printData.studentData.name}</div></div>
                                <div className="text-right"><div className="text-slate-400 uppercase text-xs font-bold">Sınıf</div><div className="text-xl font-bold">{printData.classData.className}</div></div>
                            </div>
                            <div className="space-y-6">
                                {printData.classData.topics?.map(topic => (
                                    <div key={topic.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                                        <div className="font-bold text-lg mb-2 uppercase">{topic.title}</div>
                                        <table className="w-full text-sm">
                                            <thead><tr className="text-left text-slate-400"><th className="pb-2">Kaynak</th><th className="pb-2">Durum</th></tr></thead>
                                            <tbody>
                                                {topic.subColumns?.map(col => (
                                                    <tr key={col.id} className="border-t">
                                                        <td className="py-2 font-medium">{col.title}</td>
                                                        <td className="py-2 font-bold uppercase">{STATUS_OPTIONS.find(o => o.id === (printData.studentData.grades?.[col.id] || 'exempt'))?.label}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Ekranı */}
            {modal.type && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl modal-anim">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{modal.type === 'class' ? 'Yeni Sınıf' : (modal.type === 'topic' ? 'Yeni Ödev' : 'Yeni Kaynak')}</h3>
                            <button onClick={() => setModal({type:null, data:{}})} className="text-slate-400"><X size={20}/></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            {modal.type !== 'class' && (
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => setUseLibrary(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!useLibrary ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Yeni Yaz</button>
                                    <button onClick={() => setUseLibrary(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${useLibrary ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Kütüphaneden</button>
                                </div>
                            )}
                            {useLibrary ? (
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50">
                                    {libraryItems.filter(i => i.type === (modal.type === 'topic' ? 'topic' : 'source')).map(item => (
                                        <button key={item.id} onClick={() => setModalInputVal(item.text)} className={`w-full text-left p-3 text-sm border-b border-slate-100 hover:bg-white flex items-center justify-between ${modalInputVal === item.text ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
                                            {item.text} {modalInputVal === item.text && <CheckCircle size={14}/>}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input autoFocus type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-medium" placeholder="İsim Giriniz..." value={modalInputVal} onChange={(e) => setModalInputVal(e.target.value)} />
                            )}
                            {modal.type === 'topic' && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Son Teslim Tarihi</label>
                                    <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" value={modalDateVal} onChange={(e) => setModalDateVal(e.target.value)} />
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setModal({type:null, data:{}})} className="flex-1 py-3 text-sm font-bold text-slate-500">Vazgeç</button>
                            <button onClick={handleModalSubmit} className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 shadow-md">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
