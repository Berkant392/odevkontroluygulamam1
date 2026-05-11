import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, collection, onSnapshot, 
    updateDoc, query, deleteDoc 
} from 'firebase/firestore';
import { 
    GraduationCap, User, ShieldAlert, X, Loader2, 
    Book, Star, ChevronLeft, ChevronRight, Trash2, CheckCircle
} from 'lucide-react';

import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
import { Header, CountdownTimer, AnnouncementBox } from './components/CommonUI.jsx';
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

    const [modal, setModal] = useState({ type: null, data: {} });
    const [statusModal, setStatusModal] = useState(null); 
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");
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
        if (!confirm("Bu ödev grubunu ve içindeki tüm kaynakları silmek istediğinize emin misiniz?")) return;
        const cls = classes.find(c => c.id === classId);
        const updatedTopics = cls.topics.filter(t => t.id !== topicId);
        await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: updatedTopics });
    };

    const handleDeleteSource = async (classId, topicId, sourceId) => {
        if (!confirm("Bu kaynağı silmek istediğinize emin misiniz?")) return;
        const cls = classes.find(c => c.id === classId);
        const updatedTopics = cls.topics.map(t => {
            if (t.id === topicId) {
                return { ...t, subColumns: t.subColumns.filter(s => s.id !== sourceId) };
            }
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

    // --- KÜTÜPHANE VE MODAL KAYIT ---
    const handleModalSubmit = async (inputVal) => {
        if (!inputVal.trim()) return;
        const { classId, topicId } = modal.data;
        const cls = classes.find(c => c.id === classId);

        if (modal.type === 'class') {
            await setDoc(doc(db, 'berkant_hoca_classes_secure', `class_${Date.now()}`), { className: inputVal, topics: [], students: [], isOpen: true });
        } else if (modal.type === 'topic') {
            await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: [...(cls.topics || []), { id: `topic_${Date.now()}`, title: inputVal, subColumns: [] }] });
            await setDoc(doc(collection(db, 'berkant_hoca_library')), { text: inputVal, type: 'topic' });
        } else if (modal.type === 'source') {
            const newColId = `col_${Date.now()}`;
            const updatedTopics = cls.topics.map(t => t.id === topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: inputVal }] } : t);
            const updatedStudents = (cls.students || []).filter(Boolean).map(s => ({ ...s, grades: { ...(s.grades || {}), [newColId]: 'assigned' } }));
            await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: updatedTopics, students: updatedStudents });
            await setDoc(doc(collection(db, 'berkant_hoca_library')), { text: inputVal, type: 'source' });
        }
        setModal({ type: null, data: {} });
    };

    const handleLogout = () => { setCurrentUserRole(null); setLoggedInStudent(null); setAuthView('selection'); };
    const verifyTeacherPin = () => pinInput === "1234" ? (setCurrentUserRole('teacher'), setPinInput("")) : alert("Hatalı PIN!");

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-indigo-400 font-bold animate-pulse tracking-widest">YÜKLENİYOR...</div>;

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
            <Header role={currentUserRole} onLogout={handleLogout} onOpenSettings={() => setStudentSettingsModal(true)} dailyQuote={dailyQuote} />
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
                            const cls = classes.find(c => c.id === clsId);
                            const nStd = { id: `std_${Date.now()}`, name, username: `u${Date.now()}`, password: `p${Date.now()}`, grades: {} };
                            await updateDoc(doc(db, 'berkant_hoca_classes_secure', clsId), { students: [...(cls.students || []), nStd] });
                        }}
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
                            <button onClick={() => setStatusModal(null)} className="w-full py-3 text-slate-400 font-bold text-xs mt-2 italic">İptal</button>
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
                            <input id="modalInput" type="text" autoFocus className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold" placeholder="İsim..." />
                            
                            {modal.type !== 'class' && (
                                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2 ml-2 tracking-widest flex items-center gap-1"><Book size={10}/> Kütüphaneden Seç</p>
                                    {library.filter(i => i.type === modal.type).map(item => (
                                        <button key={item.id} onClick={() => { document.getElementById('modalInput').value = item.text; }} className="w-full text-left p-3 rounded-xl hover:bg-white text-xs font-bold text-slate-600 flex items-center gap-2"><Star size={10} className="text-amber-400"/> {item.text}</button>
                                    ))}
                                </div>
                            )}

                            <button onClick={() => handleModalSubmit(document.getElementById('modalInput').value)} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-500 transition-all">SİSTEME KAYDET</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
