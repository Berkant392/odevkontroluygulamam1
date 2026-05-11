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
    Settings, AlertOctagon, LogOut, Book, Star
} from 'lucide-react';

import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
import { Header, CountdownTimer, AnnouncementBox } from './components/CommonUI.jsx';
import { StudentView } from './components/StudentView.jsx';
import { AdminPanel } from './components/AdminPanel.jsx';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
    const [user, setUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null); 
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [classes, setClasses] = useState([]);
    const [library, setLibrary] = useState([]); // Kütüphane State
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [authView, setAuthView] = useState('selection');
    const [announcement, setAnnouncement] = useState("");
    const [dailyQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    // Modallar
    const [modal, setModal] = useState({ type: null, data: {} });
    const [statusModal, setStatusModal] = useState(null); // Durum seçme penceresi
    const [printData, setPrintData] = useState(null);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);

    useEffect(() => {
        signInAnonymously(auth);
        return onAuthStateChanged(auth, (u) => u && setUser(u));
    }, []);

    useEffect(() => {
        if (!user) return;
        // Sınıfları Dinle
        const unsub = onSnapshot(query(collection(db, 'berkant_hoca_classes_secure')), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        // Kütüphaneyi Dinle
        const libUnsub = onSnapshot(collection(db, 'berkant_hoca_library'), (snap) => {
            setLibrary(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // Duyuruları Dinle
        const settingsUnsub = onSnapshot(doc(db, 'berkant_hoca_system_config_v2', 'main_config'), (snap) => {
            if (snap.exists()) setAnnouncement(snap.data().announcement);
        });
        return () => { unsub(); libUnsub(); settingsUnsub(); };
    }, [user]);

    // --- DURUM GÜNCELLEME (Pencereden Seçilen) ---
    const handleUpdateGrade = async (classId, studentId, colId, newStatus) => {
        const cls = classes.find(c => c.id === classId);
        const studentIdx = cls.students.findIndex(s => s.id === studentId);
        const updatedStudents = [...cls.students];
        updatedStudents[studentIdx] = {
            ...updatedStudents[studentIdx],
            grades: { ...updatedStudents[studentIdx].grades, [colId]: newStatus }
        };
        await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { students: updatedStudents });
        setStatusModal(null); // Pencereyi kapat
    };

    // --- KÜTÜPHANEYE EKLE (Otomatik) ---
    const addToLibrary = async (text, type) => {
        const exists = library.find(item => item.text === text && item.type === type);
        if (!exists) {
            await setDoc(doc(collection(db, 'berkant_hoca_library')), { text, type });
        }
    };

    const handleModalSubmit = async (inputVal) => {
        if (!inputVal.trim()) return;
        const { classId, topicId, type } = modal.data;
        const cls = classes.find(c => c.id === classId);

        if (modal.type === 'class') {
            await setDoc(doc(db, 'berkant_hoca_classes_secure', `class_${Date.now()}`), { className: inputVal, topics: [], students: [], isOpen: true });
        } else if (modal.type === 'topic') {
            await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: [...(cls.topics || []), { id: `topic_${Date.now()}`, title: inputVal, subColumns: [] }] });
            await addToLibrary(inputVal, 'topic');
        } else if (modal.type === 'source') {
            const newColId = `col_${Date.now()}`;
            const updatedTopics = cls.topics.map(t => t.id === topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: inputVal }] } : t);
            const updatedStudents = cls.students.map(s => ({ ...s, grades: { ...s.grades, [newColId]: 'assigned' } }));
            await updateDoc(doc(db, 'berkant_hoca_classes_secure', classId), { topics: updatedTopics, students: updatedStudents });
            await addToLibrary(inputVal, 'source');
        }
        setModal({ type: null, data: {} });
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white italic">YÜKLENİYOR...</div>;

    if (!currentUserRole) {
        // Giriş ekranı kodun aynı kalabilir...
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <Header role={currentUserRole} onLogout={() => setCurrentUserRole(null)} dailyQuote={dailyQuote} />
            <main className="max-w-6xl mx-auto px-4 mt-8 pb-20">
                {currentUserRole === 'teacher' ? (
                    <AdminPanel 
                        classes={classes}
                        library={library}
                        onOpenModal={(type, data) => setModal({ type, data })}
                        onUpdateGradeClick={(data) => setStatusModal(data)} // Pencereyi açan tetik
                        onPrintPasswords={(cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 500); }}
                        onPrintReport={(cls, std) => { setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 500); }}
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

            {/* --- DURUM SEÇME PENCERESİ (YENİ) --- */}
            {statusModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-xs shadow-2xl overflow-hidden animate-fadeIn">
                        <div className="p-4 bg-slate-50 border-b text-center font-black text-xs text-slate-400 uppercase tracking-widest">Ödev Durumu Seç</div>
                        <div className="p-4 grid grid-cols-1 gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => handleUpdateGrade(statusModal.classId, statusModal.studentId, statusModal.colId, opt.id)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs border-2 transition-all hover:scale-95 ${opt.bg} ${opt.color} ${opt.border}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <button onClick={() => setStatusModal(null)} className="w-full py-3 text-slate-400 font-bold text-xs mt-2 italic">İptal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ÖDEV/KAYNAK EKLEME MODALI (KÜTÜPHANELİ) --- */}
            {modal.type && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center font-black text-slate-800 uppercase tracking-tighter text-sm">
                            {modal.type === 'topic' ? 'Ödev Grubu Ekle' : 'Kaynak Ekle'}
                            <button onClick={() => setModal({type:null, data:{}})}><X/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Manuel Giriş */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Yeni İsim Yaz</label>
                                <input id="modalInput" type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold" placeholder="..." />
                            </div>
                            
                            {/* Kütüphaneden Seçim */}
                            <div>
                                <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 block tracking-widest flex items-center gap-1"><Book size={12}/> Kütüphaneden Hızlı Seç</label>
                                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/50 grid grid-cols-1 gap-1">
                                    {library.filter(i => i.type === modal.type).length > 0 ? (
                                        library.filter(i => i.type === modal.type).map(item => (
                                            <button 
                                                key={item.id}
                                                onClick={() => { document.getElementById('modalInput').value = item.text; }}
                                                className="text-left p-3 rounded-xl hover:bg-white hover:shadow-sm text-xs font-bold text-slate-600 transition-all flex items-center gap-2"
                                            >
                                                <Star size={10} className="text-amber-400"/> {item.text}
                                            </button>
                                        ))
                                    ) : <div className="text-[10px] text-slate-400 p-4 italic">Kütüphane henüz boş...</div>}
                                </div>
                            </div>

                            <button 
                                onClick={() => handleModalSubmit(document.getElementById('modalInput').value)}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-500 transition-all"
                            >
                                KAYDET VE SİSTEME EKLE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- YAZDIRMA ALANI (GİZLİ KARNE TASARIMI) --- */}
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto p-10 print:p-0">
                    {printData.type === 'passwords' ? (
                        <div className="grid grid-cols-2 gap-4">
                            {printData.classData.students.map(s => (
                                <div key={s.id} className="border-2 border-dashed p-6 rounded-[2rem] text-center page-break">
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
                                    <div className="font-black text-xl">{printData.studentData.name}</div>
                                    <div className="text-sm text-slate-500 uppercase font-bold">{printData.classData.className}</div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                {printData.classData.topics.map(topic => (
                                    <div key={topic.id} className="border-b-2 border-slate-100 pb-4">
                                        <h3 className="font-black text-indigo-600 uppercase mb-4 tracking-widest">{topic.title}</h3>
                                        <table className="w-full text-left text-sm">
                                            <thead><tr className="text-slate-400 border-b font-bold"><th className="pb-2">KAYNAK</th><th className="pb-2 text-right">DURUM</th></tr></thead>
                                            <tbody>
                                                {topic.subColumns.map(col => (
                                                    <tr key={col.id} className="border-b border-slate-50">
                                                        <td className="py-3 font-bold">{col.title}</td>
                                                        <td className="py-3 text-right font-black uppercase text-xs tracking-widest">
                                                            {STATUS_OPTIONS.find(o => o.id === (printData.studentData.grades?.[col.id] || 'assigned'))?.label}
                                                        </td>
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
        </div>
    );
};

export default App;
