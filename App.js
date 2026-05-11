import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
    updateDoc, deleteDoc, addDoc, query, orderBy 
} from 'firebase/firestore';

// Ayarlar ve Bileşenleri içe aktarırken .js uzantısını asla unutma
import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
import { Header, CountdownTimer, AnnouncementBox } from './components/CommonUI.js';
import { StudentView } from './components/StudentView.js';
import { AdminPanel } from './components/AdminPanel.js';

// --- YARDIMCI ARAÇLAR ---
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

const HomeworkTracker = () => {
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

    // Formlar
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [modal, setModal] = useState({ type: null, data: {} });

    // --- VERİ AKIŞI ---
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

    // --- AKSİYONLAR ---
    const handleLogout = () => {
        setCurrentUserRole(null);
        setLoggedInStudent(null);
        setView('home');
        setAuthView('selection');
    };

    const verifyTeacherPin = () => {
        // PIN: 1234 (Bunu ileride Firestore'dan çekebiliriz)
        if (pinInput === "1234") {
            setCurrentUserRole('teacher');
            setAuthView('selection');
            setPinInput("");
        } else { alert("Hatalı PIN!"); }
    };

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
        } else { alert("Hatalı giriş! Lütfen bilgileri kontrol edin."); }
    };

    const updateClassInDb = async (updatedClass) => {
        await setDoc(doc(db, 'berkant_hoca_classes_secure', updatedClass.id), updatedClass, { merge: true });
    };

    const handleAddStudent = (classId) => {
        if (!newStudentName.trim()) return;
        const cls = classes.find(c => c.id === classId);
        const newStudent = {
            id: `std_${Date.now()}`,
            name: newStudentName.trim(),
            username: generateUsername(newStudentName.trim()),
            password: generatePassword(),
            grades: {},
            assignmentNotes: {}
        };
        updateClassInDb({ ...cls, students: [...(cls.students || []), newStudent] });
        setNewStudentName("");
    };

    const calculateStats = (students, topics) => {
        if (!students || !topics || topics.length === 0) return { percentage: 0 };
        let total = 0, completed = 0;
        const colIds = topics.flatMap(t => t.subColumns?.map(c => c.id) || []);
        students.forEach(s => {
            colIds.forEach(id => {
                total++;
                if (s.grades?.[id] === 'done') completed++;
            });
        });
        return { percentage: total === 0 ? 0 : Math.round((completed/total)*100) };
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-900">
            <div className="text-center">
                <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={48}/>
                <p className="text-white font-bold tracking-widest">YÜKLENİYOR...</p>
            </div>
        </div>
    );

    // --- GİRİŞ EKRANI TASARIMI ---
    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2rem] w-full max-w-md border border-white/20 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                            <GraduationCap size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">BERKANT HOCA</h1>
                        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-1">Eğitim Platformu</p>
                    </div>

                    {authView === 'selection' ? (
                        <div className="space-y-4">
                            <button onClick={() => setAuthView('student')} className="w-full p-5 bg-white/5 text-white rounded-2xl flex items-center gap-4 hover:bg-white/10 border border-white/5 transition-all group">
                                <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/40"><User className="text-indigo-400"/></div>
                                <div className="text-left"><p className="font-bold">Öğrenci Girişi</p><p className="text-xs text-slate-400">Ödev ve karne takibi</p></div>
                            </button>
                            <button onClick={() => setAuthView('teacher')} className="w-full p-5 bg-white/5 text-white rounded-2xl flex items-center gap-4 hover:bg-white/10 border border-white/5 transition-all group">
                                <div className="p-3 bg-rose-500/20 rounded-xl group-hover:bg-rose-500/40"><ShieldAlert className="text-rose-400"/></div>
                                <div className="text-left"><p className="font-bold">Öğretmen Girişi</p><p className="text-xs text-slate-400">Sınıf ve öğrenci yönetimi</p></div>
                            </button>
                        </div>
                    ) : authView === 'student' ? (
                        <div className="space-y-5">
                            <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                            <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                            <button onClick={handleStudentLogin} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5 transition-all">GİRİŞ YAP</button>
                            <button onClick={() => setAuthView('selection')} className="w-full text-indigo-300 text-sm font-bold">Geri Dön</button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <p className="text-center text-slate-400 text-xs font-bold uppercase">Yönetici PIN Kodunu Giriniz</p>
                            <input type="password" placeholder="••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-4xl tracking-widest focus:border-rose-500 transition-all" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyTeacherPin()} />
                            <button onClick={verifyTeacherPin} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-600/30 hover:-translate-y-0.5 transition-all">SİSTEME GİR</button>
                            <button onClick={() => setAuthView('selection')} className="w-full text-rose-300 text-sm font-bold">Geri Dön</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- ANA UYGULAMA GÖVDESİ ---
    return (
        <div className="min-h-screen bg-slate-50">
            <Header 
                role={currentUserRole} 
                view={view} 
                onLogout={handleLogout} 
                onGoHome={() => setView('home')} 
                dailyQuote={dailyQuote}
            />
            
            <CountdownTimer />
            
            <AnnouncementBox 
                content={announcement} 
                isTeacher={currentUserRole === 'teacher'} 
                onEdit={() => alert("Duyuru düzenleme yakında eklenecek.")}
            />
            
            <main className="max-w-6xl mx-auto px-4 mt-8">
                {currentUserRole === 'teacher' ? (
                    <AdminPanel 
                        classes={classes}
                        onToggleClass={(id) => setClasses(classes.map(c => c.id === id ? {...c, isOpen: !c.isOpen} : c))}
                        onOpenModal={(type, data) => setModal({ type, data })}
                        onAddStudent={handleAddStudent}
                        newStudentName={newStudentName}
                        setNewStudentName={setNewStudentName}
                        calculateStats={calculateStats}
                        onDeleteClass={(e, id) => {
                            e.stopPropagation();
                            if(confirm("Sınıfı silmek istediğinize emin misiniz?")) deleteDoc(doc(db, 'berkant_hoca_classes_secure', id));
                        }}
                    />
                ) : (
                    <StudentView 
                        student={loggedInStudent} 
                        selectedClass={selectedClass} 
                    />
                )}
            </main>

            {/* Basit Modal Placeholder */}
            {modal.type && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold capitalize">{modal.type} İşlemi</h3>
                            <button onClick={() => setModal({type:null, data:{}})}><X/></button>
                        </div>
                        <p className="text-sm text-slate-500">Bu özellik bir sonraki güncelleme ile aktif edilecektir.</p>
                        <button onClick={() => setModal({type:null, data:{}})} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Tamam</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// React 18 ile Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HomeworkTracker />);
