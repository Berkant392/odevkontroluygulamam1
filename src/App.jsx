import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, collection, onSnapshot, 
    deleteDoc, query 
} from 'firebase/firestore';
import { GraduationCap, User, ShieldAlert, X, Loader2 } from 'lucide-react';

// Konfigürasyon ve Yardımcı Bileşenler (Yeni Yapıya Uygun)
import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config';
import { Header, CountdownTimer, AnnouncementBox } from './components/CommonUI';
import { StudentView } from './components/StudentView';
import { AdminPanel } from './components/AdminPanel';

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

const App = () => {
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

    // Form Durumları
    const [pinInput, setPinInput] = useState("");
    const [studentUser, setStudentUser] = useState("");
    const [studentPass, setStudentPass] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [modal, setModal] = useState({ type: null, data: {} });

    // --- FİREBASE VERİ DİNLEME ---
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

    // --- TEMEL FONKSİYONLAR ---
    const handleLogout = () => {
        setCurrentUserRole(null);
        setLoggedInStudent(null);
        setView('home');
        setAuthView('selection');
    };

    const verifyTeacherPin = () => {
        // Standart PIN: 1234
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
            setStudentUser(""); setStudentPass("");
        } else { alert("Giriş bilgileri hatalı."); }
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

    // --- GİRİŞ EKRANI ---
    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2rem] w-full max-w-md border border-white/20 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <GraduationCap size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white">BERKANT HOCA</h1>
                    </div>

                    {authView === 'selection' ? (
                        <div className="space-y-4">
                            <button onClick={() => setAuthView('student')} className="w-full p-5 bg-white/5 text-white rounded-2xl flex items-center gap-4 hover:bg-white/10 border border-white/5 transition-all">
                                <User className="text-indigo-400"/> Öğrenci Girişi
                            </button>
                            <button onClick={() => setAuthView('teacher')} className="w-full p-5 bg-white/5 text-white rounded-2xl flex items-center gap-4 hover:bg-white/10 border border-white/5 transition-all">
                                <ShieldAlert className="text-rose-400"/> Öğretmen Girişi
                            </button>
                        </div>
                    ) : authView === 'student' ? (
                        <div className="space-y-5">
                            <input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={studentUser} onChange={e=>setStudentUser(e.target.value)} />
                            <input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={studentPass} onChange={e=>setStudentPass(e.target.value)} />
                            <button onClick={handleStudentLogin} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">GİRİŞ YAP</button>
                            <button onClick={() => setAuthView('selection')} className="w-full text-indigo-300 text-sm font-bold mt-2">Geri Dön</button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <input type="password" placeholder="PIN Kodu" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-4xl tracking-widest" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyTeacherPin()} />
                            <button onClick={verifyTeacherPin} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg">SİSTEME GİR</button>
                            <button onClick={() => setAuthView('selection')} className="w-full text-rose-300 text-sm font-bold mt-2">Geri Dön</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- ANA PANEL ---
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

            {/* Basit Modal */}
            {modal.type && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold uppercase">{modal.type}</h3>
                            <button onClick={() => setModal({type:null, data:{}})}><X/></button>
                        </div>
                        <p className="text-sm text-slate-500">Bu alan bir sonraki güncellemede aktif olacaktır.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
