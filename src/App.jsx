import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
    updateDoc, deleteDoc, addDoc, query 
} from 'firebase/firestore';
import { 
    GraduationCap, User, ShieldAlert, ChevronRight, ChevronLeft, 
    CheckCircle, KeyRound, Megaphone, Edit3, X, Library, 
    AlertTriangle, AlertOctagon, StickyNote, Calendar, Settings, LogOut, Printer, ArrowDownToLine, Trash2, Pencil
} from 'lucide-react';

import { firebaseConfig, MOTIVATIONAL_QUOTES, STATUS_OPTIONS } from './config.js';
import { CountdownTimer } from './components/CommonUI.jsx';
import { StudentView } from './components/StudentView.jsx';
import { AdminPanel } from './components/AdminPanel.jsx';

// Yardımcılar
const LIBRARY_TYPES = { EXCUSE: 'excuse', TOPIC: 'topic', SOURCE: 'source' };
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : "";
const generatePassword = () => { const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; let pwd = ''; for (let i = 0; i < 6; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length)); return pwd; };
const generateUsername = (name) => { const trMap = { 'ç':'c', 'ğ':'g', 'ı':'i', 'i':'i', 'ö':'o', 'ş':'s', 'ü':'u', 'Ç':'C', 'Ğ':'G', 'İ':'I', 'Ö':'O', 'Ş':'S', 'Ü':'U' }; let baseName = name.toLowerCase().replace(/[çğıiöşüÇĞİÖŞÜ]/g, m => trMap[m] || m).replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, ''); return `${baseName}.${Math.floor(100 + Math.random() * 900)}`; };
const generateId = (p) => `${p}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const isOverdue = (d) => d ? new Date(d) < new Date(new Date().setHours(0,0,0,0)) : false;

const calculateStats = (students, topics) => {
    if (!students || !topics) return { percentage: 0, atRisk: [] };
    let total = 0, completed = 0; const atRisk = [];
    const allColIds = topics.flatMap(t => t.subColumns.map(c => c.id));
    if (allColIds.length === 0) return { percentage: 0, atRisk: [] };
    (students || []).filter(Boolean).forEach(std => {
        let sTotal = 0, sComp = 0;
        allColIds.forEach(id => { sTotal++; if (std.grades?.[id] === 'done') sComp++; });
        total += sTotal; completed += sComp;
        if (sTotal > 0 && (sComp / sTotal) < 0.5) atRisk.push({ name: std.name, rate: Math.round((sComp/sTotal)*100) });
    });
    return { percentage: total === 0 ? 0 : Math.round((completed / total) * 100), atRisk };
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
    // --- STATE'LER (HTML'DEKİ GİBİ) ---
    const [user, setUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null); 
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [authView, setAuthView] = useState('selection'); 
    
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [isTeacherMode, setIsTeacherMode] = useState(false);
    const [dbTeacherPin, setDbTeacherPin] = useState("1234");
    
    const [announcement, setAnnouncement] = useState("");
    const [tempAnnouncement, setTempAnnouncement] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    
    const [view, setView] = useState('home');
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    
    // Girdiler
    const [studentUsernameInput, setStudentUsernameInput] = useState("");
    const [studentPasswordInput, setStudentPasswordInput] = useState("");
    const [pinInput, setPinInput] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    
    // Modallar ve Menüler
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState({}); 
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalDateVal, setModalDateVal] = useState("");
    const [useLibrary, setUseLibrary] = useState(false);
    
    const [printData, setPrintData] = useState(null);
    const [showLibraryManager, setShowLibraryManager] = useState(false); 
    const [libraryInput, setLibraryInput] = useState("");
    const [libraryCategory, setLibraryCategory] = useState(LIBRARY_TYPES.TOPIC);
    const [libraryDate, setLibraryDate] = useState("");
    
    const [showRiskModal, setShowRiskModal] = useState(false); 
    const [activeRiskClass, setActiveRiskClass] = useState(null); 
    
    const [activeCell, setActiveCell] = useState(null); 
    const [activeColMenu, setActiveColMenu] = useState(null); 
    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    
    const [showCellNoteModal, setShowCellNoteModal] = useState(false);
    const [activeNoteCell, setActiveNoteCell] = useState(null);
    const [noteInput, setNoteInput] = useState(""); 
    const [useNoteLibrary, setUseNoteLibrary] = useState(false);
    
    // Öğrenci Şifre
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");
    const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);

    // --- EFFECTLER ---
    useEffect(() => { signInAnonymously(auth); setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]); return onAuthStateChanged(auth, (u) => u && setUser(u)); }, []);
    
    useEffect(() => {
        if (!user) return;
        const unsubClasses = onSnapshot(query(collection(db, 'berkant_hoca_classes_secure')), (snap) => { 
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.className.localeCompare(b.className)); 
            setClasses(prev => loaded.map(newC => { const oldC = prev.find(p => p.id === newC.id); return { ...newC, isOpen: oldC ? oldC.isOpen : false }; })); 
            setLoading(false); 
        });
        const unsubLib = onSnapshot(query(collection(db, 'berkant_hoca_library')), (snap) => setLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>a.text.localeCompare(b.text))));
        const initSettings = async () => { const snap = await getDoc(doc(db, 'berkant_hoca_system_config_v2', 'main_config')); if (!snap.exists()) await setDoc(doc(db, 'berkant_hoca_system_config_v2', 'main_config'), { pin: "1234", announcement: "Hoşgeldiniz!" }); };
        initSettings();
        const unsubSettings = onSnapshot(doc(db, 'berkant_hoca_system_config_v2', 'main_config'), (snap) => { if (snap.exists()) { const d = snap.data(); if (d.pin) setDbTeacherPin(String(d.pin).trim()); if (d.announcement) setAnnouncement(d.announcement); } });
        return () => { unsubClasses(); unsubLib(); unsubSettings(); };
    }, [user]);

    // --- TEMEL İŞLEMLER ---
    const updateClassInDb = async (updatedClass) => { await setDoc(doc(db, 'berkant_hoca_classes_secure', String(updatedClass.id)), updatedClass, { merge: true }); };
    
    const verifyPin = () => { if (String(pinInput).trim() === String(dbTeacherPin).trim()) { setIsTeacherMode(true); setCurrentUserRole('teacher'); setAuthView('selection'); setView('home'); setPinInput(""); } else { alert("Hatalı PIN!"); } };
    
    const handleStudentLogin = () => {
        let foundStudent = null, foundClass = null;
        for (const cls of classes) { const std = (cls.students||[]).filter(Boolean).find(s => s.username === studentUsernameInput.trim() && s.password === studentPasswordInput.trim()); if (std) { foundStudent = std; foundClass = cls; break; } }
        if (foundStudent) { setCurrentUserRole('student'); setLoggedInStudent(foundStudent); setSelectedClass(foundClass); setSelectedStudentForView(foundStudent); setView('student-detail'); setAuthView('selection'); setStudentUsernameInput(""); setStudentPasswordInput(""); } 
        else { alert('Kullanıcı adı veya şifre hatalı!'); }
    };

    const updateStudentPassword = () => {
        if(studentNewPassword.length < 4) return alert("Şifre en az 4 karakter olmalıdır.");
        const cls = classes.find(c => c.id === selectedClass.id);
        if(cls && loggedInStudent) {
            const updatedStudents = cls.students.map(s => s.id === loggedInStudent.id ? { ...s, password: studentNewPassword } : s);
            updateClassInDb({ ...cls, students: updatedStudents });
            setLoggedInStudent({ ...loggedInStudent, password: studentNewPassword });
            setStudentSettingsModal(false); setStudentNewPassword("");
            alert("Şifreniz başarıyla güncellendi!");
        }
    };

    // --- MODAL KAYIT İŞLEMLERİ (HTML İLE BİREBİR AYNI) ---
    const handleModalSubmit = () => {
        if (!modalInputVal || !modalInputVal.trim()) return;
        if (modalType === 'class') { setDoc(doc(db, 'berkant_hoca_classes_secure', generateId('class')), { className: modalInputVal, topics: [], students: [], isOpen: true }); } 
        else if (modalType === 'topic') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, topics: [...(cls.topics || []), { id: generateId('topic'), title: modalInputVal, date: modalDateVal, subColumns: [] }] }); }
        else if (modalType === 'source') { const cls = classes.find(c => c.id === modalData.classId); if (cls) { const newColId = generateId('col'); const updatedStudents = (cls.students||[]).filter(Boolean).map(std => ({ ...std, grades: { ...std.grades, [newColId]: 'assigned' } })); const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: modalInputVal }] } : t); updateClassInDb({ ...cls, topics: updatedTopics, students: updatedStudents }); } }
        else if (modalType === 'edit-class') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, className: modalInputVal }); }
        else if (modalType === 'edit-student') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, students: cls.students.map(s => s.id === modalData.studentId ? { ...s, name: modalInputVal } : s) }); }
        else if (modalType === 'edit-topic') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t) }); }
        else if (modalType === 'edit-date') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, date: modalDateVal } : t) }); }
        else if (modalType === 'edit-source') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, topics: cls.topics.map(t => { if (t.id === modalData.topicId) { return { ...t, subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal } : c) }; } return t; }) }); }
        setModalType(null); setModalData({}); setModalInputVal(""); setModalDateVal(""); setUseLibrary(false);
    };

    const addStudent = (classId) => { 
        if (!newStudentName.trim()) return; const cls = classes.find(c => c.id === classId); 
        if (cls) updateClassInDb({ ...cls, students: [...(cls.students||[]), { id: generateId('std'), name: newStudentName.trim(), username: generateUsername(newStudentName.trim()), password: generatePassword(), grades: {} }] }); 
        setNewStudentName(""); 
    };

    const updateGrade = (cId, sId, colId, status) => { const cls = classes.find(c => c.id === cId); if (cls) { const updatedStudents = cls.students.map(s => s.id === sId ? { ...s, grades: { ...s.grades, [colId]: status } } : s); updateClassInDb({ ...cls, students: updatedStudents }); } setActiveCell(null); };
    const handleTopicBulkAction = (action, classId, topicId) => { setActiveTopicMenu(null); const cls = classes.find(c => c.id === classId); if (!cls) return; if (action === 'delete') { setConfirmModal({ message: "Ödevi silmek istediğine emin misin?", type: 'danger', onConfirm: () => { updateClassInDb({ ...cls, topics: cls.topics.filter(t => t.id !== topicId) }); setConfirmModal(null); } }); return; } const topic = cls.topics.find(t => t.id === topicId); setConfirmModal({ message: `Tüm kaynaklar güncellenecek.`, type: 'info', onConfirm: () => { const targetColIds = topic.subColumns.map(sc => sc.id); const updatedStudents = cls.students.map(std => { const newGrades = { ...std.grades }; targetColIds.forEach(colId => newGrades[colId] = action); return { ...std, grades: newGrades }; }); updateClassInDb({ ...cls, students: updatedStudents }); setConfirmModal(null); } }); };
    
    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-indigo-400 font-bold">YÜKLENİYOR...</div>;

    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
                <div className="w-full max-w-[420px]">
                    <div className="text-center mb-10"><div className="inline-flex p-5 rounded-[2rem] bg-indigo-600 shadow-2xl mb-6"><GraduationCap size={52} className="text-white" /></div><h1 className="text-4xl font-black text-white tracking-tighter">BERKANT HOCA</h1></div>
                    <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                        {authView === 'selection' ? (
                            <div className="space-y-4">
                                <button onClick={() => setAuthView('student-login')} className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-5 text-white hover:bg-white/10"><User className="text-indigo-400" size={24}/><p className="font-bold text-lg text-left flex-1">Öğrenci Girişi</p><ChevronRight size={18}/></button>
                                <button onClick={() => setAuthView('teacher-login')} className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-5 text-white hover:bg-white/10"><ShieldAlert className="text-rose-400" size={24}/><p className="font-bold text-lg text-left flex-1">Öğretmen Girişi</p><ChevronRight size={18}/></button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <button onClick={() => setAuthView('selection')} className="text-slate-500 hover:text-white text-xs font-bold flex items-center gap-2"><ChevronLeft size={16}/> Geri Dön</button>
                                {authView === 'student-login' ? (
                                    <div className="space-y-4"><input type="text" placeholder="Kullanıcı Adı" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentUsernameInput} onChange={e=>setStudentUsernameInput(e.target.value)} /><input type="password" placeholder="Şifre" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500" value={studentPasswordInput} onChange={e=>setStudentPasswordInput(e.target.value)} /><button onClick={handleStudentLogin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black">GİRİŞ YAP</button></div>
                                ) : (
                                    <div className="space-y-4"><input type="password" placeholder="••••" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none text-center text-5xl tracking-widest focus:border-indigo-500" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPin()} /><button onClick={verifyPin} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black">YÖNETİMİ AÇ</button></div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 bg-slate-50">
            {/* HEADER İLE AYARLAR BUTONU GÜVENCE ALTINDA */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm no-print">
                 <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        {currentUserRole !== 'student' && view !== 'home' ? <button onClick={() => view === 'student-detail' ? setView('class-detail') : setView('home')} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><ChevronLeft size={24} /></button> : <div className="w-10"></div>}
                        <div className="text-center"><h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center justify-center gap-2"><GraduationCap className="text-indigo-600" /> BERKANT HOCA</h1><p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Eğitim Platformu</p></div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {isTeacherMode && <button onClick={() => setShowLibraryManager(true)} className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-100 rounded-full"><Library size={20}/></button>}
                            {/* ÖĞRENCİ İÇİN AYARLAR BURADA */}
                            {currentUserRole === 'student' && <button onClick={() => setStudentSettingsModal(true)} className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-100 rounded-full"><Settings size={20}/></button>}
                            <button onClick={() => { setCurrentUserRole(null); setLoggedInStudent(null); setIsTeacherMode(false); setView('home'); }} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-full"><LogOut size={20}/></button>
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="no-print"><CountdownTimer /></div>
            
            <main className="max-w-6xl mx-auto px-4 mt-8 no-print">
                {isTeacherMode ? (
                    <AdminPanel 
                        classes={classes} isTeacherMode={isTeacherMode} calculateStats={calculateStats} formatDate={formatDate}
                        onToggleClass={(id) => setClasses(classes.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c))}
                        onOpenModal={(type, data) => { setModalType(type); setModalData(data || {}); if(data?.date) setModalDateVal(data.date); }}
                        onOpenRisk={(cls) => { setActiveRiskClass(cls); setShowRiskModal(true); }}
                        onDownloadReport={(cls) => { let csv = "data:text/csv;charset=utf-8,Öğrenci,Kullanıcı,Şifre\n"; cls.students.forEach(s => csv+=`${s.name},${s.username},${s.password}\n`); const l=document.createElement("a"); l.href=encodeURI(csv); l.download=`${cls.className}.csv`; l.click(); }}
                        onPrintPasswords={(cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 300); }}
                        onOpenTopicMenu={setActiveTopicMenu} onOpenColMenu={setActiveColMenu}
                        onOpenStudent={(std) => { setSelectedStudentForView(std); setView('student-detail'); }}
                        onPrintStudentReport={(cls, std) => { setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 300); }}
                        onDeleteStudent={(e, cId, sId) => { e.stopPropagation(); setConfirmModal({ message: "Öğrenciyi sil?", type: 'danger', onConfirm: () => { const cls = classes.find(c => c.id === cId); updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== sId) }); setConfirmModal(null); } }); }}
                        onOpenNoteModal={({classId, studentId, colId, currentNote}) => { setNoteInput(currentNote || ""); setActiveNoteCell({ classId, studentId, colId }); setShowCellNoteModal(true); }}
                        onOpenCellMenu={setActiveCell}
                        onAddStudent={addStudent}
                        onDeleteClass={(e, id) => { e.stopPropagation(); setConfirmModal({ message: "Sınıfı sil?", type: 'danger', onConfirm: () => { deleteDoc(doc(db, 'berkant_hoca_classes_secure', String(id))); setConfirmModal(null); } }); }}
                        newStudentName={newStudentName} setNewStudentName={setNewStudentName}
                    />
                ) : (
                    <StudentView student={loggedInStudent} selectedClass={selectedClass} />
                )}
            </main>

            {/* --- MODALLAR VE MENÜLER --- */}
            {modalType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800">{modalType === 'class' ? 'Sınıf Ekle' : 'İşlem Yap'}</h3><button onClick={() => setModalType(null)}><X size={20}/></button></div>
                        <div className="p-6">
                            <input autoFocus type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none" placeholder="İsim Giriniz..." value={modalInputVal} onChange={(e) => setModalInputVal(e.target.value)} />
                            {(modalType === 'topic' || modalType === 'edit-topic' || modalType === 'edit-date') && (
                                <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg mt-4 text-sm" value={modalDateVal} onChange={(e) => setModalDateVal(e.target.value)} />
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex gap-3"><button onClick={() => setModalType(null)} className="flex-1 py-3 text-sm font-bold text-slate-500">Vazgeç</button><button onClick={handleModalSubmit} className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600">Kaydet</button></div>
                    </div>
                </div>
            )}

            {studentSettingsModal && loggedInStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold flex gap-2 items-center"><Settings className="text-indigo-600"/> Hesabım</h3><button onClick={() => setStudentSettingsModal(false)}><X/></button></div>
                        <div className="p-6">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Yeni Şifre Belirle</label>
                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-medium tracking-widest mb-4" placeholder="En az 4 karakter" value={studentNewPassword} onChange={(e) => setStudentNewPassword(e.target.value)} />
                            <button onClick={updateStudentPassword} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Şifremi Güncelle</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TABLO İÇİ AÇILIR MENÜLER */}
            {(activeCell || activeColMenu || activeTopicMenu) && <div className="fixed inset-0 z-[60] bg-black/20" onClick={() => { setActiveCell(null); setActiveColMenu(null); setActiveTopicMenu(null); }}/>}
            {activeTopicMenu && (<div className="fixed z-[9999] bg-white rounded-xl shadow-2xl border w-64 p-2" style={{ top: activeTopicMenu.anchorEl.getBoundingClientRect().bottom + 5, left: activeTopicMenu.anchorEl.getBoundingClientRect().left }} onClick={e => e.stopPropagation()}><button onClick={() => handleTopicBulkAction('assigned', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left p-2 hover:bg-slate-50 text-xs font-bold">Herkese Ver</button><button onClick={() => handleTopicBulkAction('done', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left p-2 hover:bg-slate-50 text-xs font-bold text-green-600">Herkese Yapıldı</button><div className="h-px bg-slate-100 my-1"></div><button onClick={() => handleTopicBulkAction('delete', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left p-2 hover:bg-rose-50 text-xs font-bold text-rose-600 flex items-center gap-2"><Trash2 size={14}/> Ödevi Sil</button></div>)}
            {activeColMenu && (<div className="fixed z-[9999] bg-white rounded-xl shadow-2xl border w-48 p-2" style={{ top: activeColMenu.anchorEl.getBoundingClientRect().bottom + 5, left: activeColMenu.anchorEl.getBoundingClientRect().left }} onClick={e => e.stopPropagation()}><button onClick={() => { const cls = classes.find(c => c.id === activeColMenu.classId); const updatedTopics = cls.topics.map(t => t.id === activeColMenu.topicId ? { ...t, subColumns: t.subColumns.filter(c => c.id !== activeColMenu.colId) } : t); updateClassInDb({ ...cls, topics: updatedTopics }); setActiveColMenu(null); }} className="w-full text-left p-2 hover:bg-rose-50 text-xs font-bold text-rose-600 flex items-center gap-2"><Trash2 size={14}/> Kaynağı Sil</button></div>)}
            {activeCell && (<div className="fixed z-[9999] bg-white rounded-xl shadow-2xl border p-2 w-48" style={{ top: activeCell.anchorEl.getBoundingClientRect().bottom + 5, left: activeCell.anchorEl.getBoundingClientRect().left }} onClick={e => e.stopPropagation()}>{STATUS_OPTIONS.map(opt => <button key={opt.id} onClick={() => updateGrade(activeCell.classId, activeCell.studentId, activeCell.colId, opt.id)} className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-slate-50"><opt.icon size={16} className={opt.color} /><span className="text-xs font-bold text-slate-700">{opt.label}</span></button>)}</div>)}
            
            {showCellNoteModal && (<div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-sm"><div className="bg-amber-50 p-4 flex justify-between"><h3 className="font-bold text-amber-900">Ödeve Not Ekle</h3><button onClick={() => setShowCellNoteModal(false)}><X/></button></div><textarea className="w-full p-4 outline-none resize-none" rows="4" value={noteInput} onChange={e=>setNoteInput(e.target.value)}></textarea><div className="p-4 bg-slate-50 flex justify-end gap-2"><button onClick={() => { const { classId, studentId, colId } = activeNoteCell; const cls = classes.find(c => c.id === classId); const updatedStudents = cls.students.map(s => { if (s.id === studentId) { const newNotes = { ...s.assignmentNotes, [colId]: noteInput }; return { ...s, assignmentNotes: newNotes }; } return s; }); updateClassInDb({ ...cls, students: updatedStudents }); setShowCellNoteModal(false); }} className="px-4 py-2 bg-amber-500 text-white rounded">Kaydet</button></div></div></div>)}

            {/* YAZDIRMA (HTML'deki Orijinal Hali) */}
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
                    <div className="p-4 no-print flex justify-between items-center bg-slate-100 border-b"><span className="font-bold">Önizleme</span><button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded">Yazdır</button></div>
                    {printData.type === 'passwords' && ( <div className="p-8 grid grid-cols-2 gap-4">{(printData.classData.students || []).filter(Boolean).map(s => <div key={s.id} className="border-2 border-dashed p-4 rounded text-center"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-500 mt-2">{s.username}</div><div className="font-mono text-xl tracking-widest mt-1">{s.password}</div></div>)}</div> )}
                    {printData.type === 'report' && ( <div className="p-10 max-w-3xl mx-auto"><h1 className="text-3xl font-black border-b-4 border-black pb-2 mb-4">GELİŞİM KARNESİ</h1><div className="text-xl font-bold">{printData.studentData.name}</div><div className="space-y-4 mt-6">{printData.classData.topics?.map(topic => <div key={topic.id}><h3 className="font-bold bg-slate-100 p-2">{topic.title}</h3>{topic.subColumns?.map(col => <div key={col.id} className="flex justify-between border-b p-2"><span>{col.title}</span><span className="font-bold">{STATUS_OPTIONS.find(o => o.id === (printData.studentData.grades?.[col.id] || 'assigned'))?.label}</span></div>)}</div>)}</div></div> )}
                </div>
            )}
        </div>
    );
};

export default App;
