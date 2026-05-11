import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
    updateDoc, deleteDoc, addDoc, query, orderBy 
} from 'firebase/firestore';
import { GraduationCap, User, ShieldAlert, ChevronRight, X, KeyRound, Loader2 } from 'lucide-react';

// Kendi oluşturduğumuz modülleri içeri alıyoruz
import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
import { Header, CountdownTimer, AnnouncementBox } from './components/CommonUI.js';
import { StudentView } from './components/StudentView.js';
import { AdminPanel } from './components/AdminPanel.js';

// --- YARDIMCI ARAÇLAR (UTILS) ---
const generatePassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 6; i++) { pwd += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return pwd;
};

const generateUsername = (name) => {
    const trMap = { 'ç':'c', 'ğ':'g', 'ı':'i', 'ö':'o', 'ş':'s', 'ü':'u' };
    let baseName = name.toLowerCase().replace(/[çğıöşü]/g, m => trMap[m] || m).replace(/[^a-z0-9]/g, '.');
    return `${baseName}.${Math.floor(100 + Math.random() * 900)}`;
};

// --- FİREBASE BAŞLATMA ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const HomeworkTracker = () => {
    // --- STATE (DURUM) YÖNETİMİ ---
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

    // Form Inputları
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");
    const [newStudentName, setNewStudentName] = useState("");

    // Modal ve Menü State'leri
    const [modal, setModal] = useState({ type: null, data: {} });

    // --- FİREBASE VERİ DİNLEME ---
    useEffect(() => {
        signInAnonymously(auth);
        return onAuthStateChanged(auth, (u) => u && setUser(u));
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, 'berkant_hoca_classes_secure'), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        const settingsUnsub = onSnapshot(doc(db, 'berkant_hoca_system_config_v2', 'main_config'), (snap) => {
            if (snap.exists()) setAnnouncement(snap.data().announcement);
        });
        return () => { unsub(); settingsUnsub(); };
    }, [user]);

    // --- TEMEL FONKSİYONLAR ---
    const handleLogout = () => {
        setCurrentUserRole(null);
        setLoggedInStudent(null);
        setView('home');
        setAuthView('selection');
    };

    const verifyTeacherPin = () => {
        if (pinInput === "1234") { // Burayı config'e taşıyabiliriz
            setCurrentUserRole('teacher');
            setAuthView('selection');
            setPinInput("");
        } else { alert("Hatalı PIN!"); }
    };

    const handleStudentLogin = () => {
        let found = null;
        classes.forEach(c => {
            const s = c.students?.find(std => std.username === studentUser && std.password === studentPass);
            if (s) { found = { student: s, class: c }; }
        });
        if (found) {
            setCurrentUserRole('student');
            setLoggedInStudent(found.student);
            setSelectedClass(found.class);
            setAuthView('selection');
            setStudentUser(""); setStudentPass("");
        } else { alert("Hatalı kullanıcı adı veya şifre!"); }
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
        if (!students || !topics || topics.length === 0) return { percentage: 0, atRisk: [] };
        let total = 0, completed = 0;
        const colIds = topics.flatMap(t => t.subColumns.map(c => c.id));
        students.forEach(s => {
            colIds.forEach(id => {
                total++;
                if (s.grades?.[id] === 'done') completed++;
            });
        });
        return { percentage: total === 0 ? 0 : Math.round((completed/total)*100) };
    };

    // --- RENDER (EKRAN GÖSTERİMİ) ---
    if (loading) return <div className="flex h-screen items-center justify-center text-indigo-600"><Loader2 className="animate-spin" size={48}/></div>;

    // GİRİŞ EKRANLARI
    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] w-full max-w-md border border-white/20">
                    <div className="text-center mb-8">
                        <GraduationCap size={48} className="text-indigo-400 mx-auto mb-4" />
                        <h1 className="text-3xl font-black text-white">BERKANT HOCA</h1>
                    </div>
                    {authView === 'selection' ? (
                        <div className="space-y-4">
                            <button onClick={() => setAuthView('student')} className="w-full p-4 bg-white/5 text-white rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all">
                                <User className="text-indigo-400"/> Öğrenci Girişi
                            </button>
                            <button onClick={() => setAuthView('teacher')} className="w-full p-4 bg-white/5 text-white rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all">
                                <ShieldAlert className="text-rose-400"/> Öğretmen Girişi
                            </button>
                        </div>
                    ) : authView === 'student' ? (
                        <div className="space-y-4">
                            <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                            <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                            <button onClick={handleStudentLogin} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">Giriş Yap</button>
                            <button onClick={() => setAuthView('selection')} className="w-full text-indigo-300 text-sm">Geri Dön</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input type="password" placeholder="PIN Kodu" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-2xl" value={pinInput} onChange={e=>setPinInput(e.target.value)} />
                            <button onClick={verifyTeacherPin} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold">Sisteme Gir</button>
                            <button onClick={() => setAuthView('selection')} className="w-full text-rose-300 text-sm">Geri Dön</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ANA PANEL
    return (
        <div className="min-h-screen">
            <Header 
                role={currentUserRole} 
                view={view} 
                onLogout={handleLogout} 
                onGoHome={() => setView('home')} 
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
                        calculateStats={calculateStats}
                        // İleride diğer admin fonksiyonları buraya eklenecek
                    />
                ) : (
                    <StudentView 
                        student={loggedInStudent} 
                        selectedClass={selectedClass} 
                    />
                )}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HomeworkTracker />);
