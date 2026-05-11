import React, { useState, useEffect } from 'react';
import { 
    Layout, Plus, ChevronRight, ChevronLeft, AlertOctagon, FileSpreadsheet, 
    Printer, Trash2, MoreVertical, Pencil, CheckCircle, MinusCircle, 
    XCircle, Clock, StickyNote, Info, Library, X, Calendar, AlertTriangle, 
    Edit3, Megaphone, LogOut, GraduationCap, ArrowDownToLine 
} from 'lucide-react';
import { doc, setDoc, deleteDoc, collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { db, CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, LIBRARY_TYPES } from '../lib/firebase';
import { calculateStats, formatDate, generateId, generateUsername, generatePassword, isOverdue } from '../lib/utils';

// Sabit Görsel Temalar
const STATUS_OPTIONS = [
    { id: 'assigned', label: 'Verildi', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'done', label: 'Yapıldı', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { id: 'missing', label: 'Eksik', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { id: 'exempt', label: 'Muaf', icon: MinusCircle, color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' },
];

const TOPIC_THEMES = [
    { main: 'bg-indigo-100 text-indigo-900 border-indigo-200', sub: 'bg-indigo-50 text-indigo-800 border-indigo-100', cell: 'bg-indigo-50/30 border-indigo-100', btn: 'hover:bg-indigo-200 text-indigo-600', border: 'border-indigo-300' },
    { main: 'bg-rose-100 text-rose-900 border-rose-200', sub: 'bg-rose-50 text-rose-800 border-rose-100', cell: 'bg-rose-50/30 border-rose-100', btn: 'hover:bg-rose-200 text-rose-600', border: 'border-rose-300' },
    { main: 'bg-emerald-100 text-emerald-900 border-emerald-200', sub: 'bg-emerald-50 text-emerald-800 border-emerald-100', cell: 'bg-emerald-50/30 border-emerald-100', btn: 'hover:bg-emerald-200 text-emerald-600', border: 'border-emerald-300' },
    { main: 'bg-amber-100 text-amber-900 border-amber-200', sub: 'bg-amber-50 text-amber-800 border-amber-100', cell: 'bg-amber-50/30 border-amber-100', btn: 'hover:bg-amber-200 text-amber-600', border: 'border-amber-300' },
    { main: 'bg-cyan-100 text-cyan-900 border-cyan-200', sub: 'bg-cyan-50 text-cyan-800 border-cyan-100', cell: 'bg-cyan-50/30 border-cyan-100', btn: 'hover:bg-cyan-200 text-cyan-600', border: 'border-cyan-300' },
];

// Geri Sayım Aracı Alt Bileşeni
const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, progressDays: 0, progressHours: 0, progressMinutes: 0, progressSeconds: 0 });
    useEffect(() => {
        const targetDate = new Date('2026-06-20T00:00:00');
        const startDate = new Date('2025-06-20T00:00:00');
        const totalDuration = targetDate - startDate;
        const timer = setInterval(() => {
            const now = new Date();
            const difference = targetDate - now;
            const elapsed = now - startDate;
            if (difference < 0) { clearInterval(timer); return; }
            setTimeLeft({ 
                days: Math.floor(difference / (1000 * 60 * 60 * 24)), 
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24), 
                minutes: Math.floor((difference / 1000 / 60) % 60), 
                seconds: Math.floor((difference / 1000) % 60),
                progressDays: Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)),
                progressHours: ((Math.floor((difference / (1000 * 60 * 60)) % 24)) / 24) * 100,
                progressMinutes: ((Math.floor((difference / 1000 / 60) % 60)) / 60) * 100,
                progressSeconds: ((Math.floor((difference / 1000) % 60)) / 60) * 100
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const CircularProgress = ({ value, max, strokeColor, label }) => {
        const radius = 18; const circumference = 2 * Math.PI * radius; const offset = circumference - (value / 100) * circumference;
        return (
            <div className="flex flex-col items-center">
                <div className="relative w-12 h-12 md:w-16 md:h-16">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                        <circle className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="transparent" r={radius} cx="20" cy="20"/>
                        <circle className={`${strokeColor} transition-all duration-1000 ease-linear`} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="20" cy="20" />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center"><span className={`text-sm md:text-lg font-black ${strokeColor}`}>{max}</span></div>
                </div>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{label}</span>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 mb-3"><Calendar className="text-indigo-600" size={16} /><h3 className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-widest">Sınava Kalan Süre</h3><span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">20 Haz 2026</span></div>
                <div className="flex justify-center gap-4 md:gap-12"><CircularProgress value={timeLeft.progressDays} max={timeLeft.days} strokeColor="text-yellow-500" label="GÜN" /><CircularProgress value={timeLeft.progressHours} max={timeLeft.hours} strokeColor="text-sky-500" label="SAAT" /><CircularProgress value={timeLeft.progressMinutes} max={timeLeft.minutes} strokeColor="text-emerald-500" label="DAK" /><CircularProgress value={timeLeft.progressSeconds} max={timeLeft.seconds} strokeColor="text-teal-400" label="SN" /></div>
            </div>
        </div>
    );
};

// Ana Bileşen
export default function Dashboard({ classes, onLogout }) {
    const [localClasses, setLocalClasses] = useState(classes);
    const [libraryItems, setLibraryItems] = useState([]);
    const [announcement, setAnnouncement] = useState("");
    const [tempAnnouncement, setTempAnnouncement] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    
    // UI Durumları
    const [newStudentName, setNewStudentName] = useState("");
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState({}); 
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalDateVal, setModalDateVal] = useState("");
    
    const [showLibraryManager, setShowLibraryManager] = useState(false);
    const [libraryCategory, setLibraryCategory] = useState(LIBRARY_TYPES.TOPIC);
    const [libraryInput, setLibraryInput] = useState("");
    const [libraryDate, setLibraryDate] = useState("");
    const [useLibrary, setUseLibrary] = useState(false);

    const [activeRiskClass, setActiveRiskClass] = useState(null); 
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [activeCell, setActiveCell] = useState(null); 
    const [activeColMenu, setActiveColMenu] = useState(null); 
    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    const [noteInput, setNoteInput] = useState(""); 
    const [useNoteLibrary, setUseNoteLibrary] = useState(false);
    const [showCellNoteModal, setShowCellNoteModal] = useState(false);
    const [activeNoteCell, setActiveNoteCell] = useState(null);
    const [printData, setPrintData] = useState(null);

    // Senkronizasyon
    useEffect(() => {
        setLocalClasses(classes.map(newC => { const oldC = localClasses.find(p => p.id === newC.id); return { ...newC, isOpen: oldC ? oldC.isOpen : false }; }));
    }, [classes]);

    useEffect(() => {
        const qLib = query(collection(db, LIBRARY_COLLECTION));
        const unsubLib = onSnapshot(qLib, (snap) => setLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>a.text.localeCompare(b.text))));
        const unsubSettings = onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), (snap) => { if (snap.exists() && snap.data().announcement !== undefined) setAnnouncement(snap.data().announcement); });
        return () => { unsubLib(); unsubSettings(); };
    }, []);

    // Veritabanı İşlemleri
    const addClassToDb = async (newClass) => { await setDoc(doc(db, CLASSES_COLLECTION, String(newClass.id)), newClass); };
    const updateClassInDb = async (updatedClass) => { await setDoc(doc(db, CLASSES_COLLECTION, String(updatedClass.id)), updatedClass, { merge: true }); };
    const deleteClassFromDb = async (classId) => { await deleteDoc(doc(db, CLASSES_COLLECTION, String(classId))); };
    const addLibraryItem = async (text) => { if(!text || !text.trim()) return; await addDoc(collection(db, LIBRARY_COLLECTION), { text: text.trim(), type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null }); setLibraryInput(""); setLibraryDate(""); };
    const deleteLibraryItem = async (id) => { await deleteDoc(doc(db, LIBRARY_COLLECTION, id)); };
    const saveAnnouncementFn = async () => { try { await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { announcement: tempAnnouncement }, { merge: true }); setIsEditingAnnouncement(false); } catch (e) { alert("Hata"); } };

    // Sınıf ve Öğrenci Yönetimi
    const toggleClass = (id) => setLocalClasses(localClasses.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c));
    const addStudent = (classId) => { 
        if (!newStudentName.trim()) return; const cls = localClasses.find(c => c.id === classId); 
        if (cls) { updateClassInDb({ ...cls, students: [...cls.students, { id: generateId('student'), name: newStudentName.trim(), username: generateUsername(newStudentName.trim()), password: generatePassword(), lastLogin: null, grades: {}, privateNotes: "" }] }); } setNewStudentName(""); 
    };
    const deleteStudent = (e, classId, sId) => { e.stopPropagation(); setConfirmModal({ message: "Öğrenciyi silmek istediğine emin misin?", type: 'danger', onConfirm: () => { const cls = localClasses.find(c => c.id === classId); if (cls) updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== sId) }); setConfirmModal(null); } }); };
    const deleteClass = (e, id) => { e.stopPropagation(); setConfirmModal({ message: "Sınıfı silmek istediğine emin misin?", type: 'danger', onConfirm: () => { deleteClassFromDb(id); setConfirmModal(null); } }); };
    const updateGrade = (cId, sId, colId, status) => { const cls = localClasses.find(c => c.id === cId); if (cls) { const updatedStudents = cls.students.map(s => s.id === sId ? { ...s, grades: { ...s.grades, [colId]: status } } : s); updateClassInDb({ ...cls, students: updatedStudents }); } setActiveCell(null); };

    // Modal İşlemleri
    const handleModalSubmit = () => {
        if (!modalInputVal || !modalInputVal.trim()) return;
        if (modalType === 'class') { addClassToDb({ id: generateId('class'), className: modalInputVal, topics: [], students: [] }); } 
        else if (modalType === 'topic') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, topics: [...(cls.topics || []), { id: generateId('topic'), title: modalInputVal, date: modalDateVal, subColumns: [] }] }); }
        else if (modalType === 'source') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) { const newColId = generateId('col'); const updatedStudents = cls.students.map(std => ({ ...std, grades: { ...std.grades, [newColId]: 'assigned' } })); const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [...t.subColumns, { id: newColId, title: modalInputVal, subColumns: [] }] } : t); updateClassInDb({ ...cls, topics: updatedTopics, students: updatedStudents }); } }
        else if (modalType === 'edit-class') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, className: modalInputVal }); }
        else if (modalType === 'edit-student') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, students: cls.students.map(s => s.id === modalData.studentId ? { ...s, name: modalInputVal } : s) }); } }
        else if (modalType === 'edit-topic') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t) }); } }
        else if (modalType === 'edit-date') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, date: modalDateVal } : t) }); } }
        else if (modalType === 'edit-source') { const cls = localClasses.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => { if (t.id === modalData.topicId) { return { ...t, subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal } : c) }; } return t; }) }); } }
        closeModal();
    };
    const closeModal = () => { setModalType(null); setModalData({}); setModalInputVal(""); setModalDateVal(""); setUseLibrary(false); };

    // Toplu İşlemler ve Notlar
    const handleTopicBulkAction = (action, classId, topicId) => { setActiveTopicMenu(null); const cls = localClasses.find(c => c.id === classId); if (!cls) return; if (action === 'delete') { setConfirmModal({ message: "Ödevi silmek istediğine emin misin?", type: 'danger', onConfirm: () => { updateClassInDb({ ...cls, topics: cls.topics.filter(t => t.id !== topicId) }); setConfirmModal(null); } }); return; } const topic = cls.topics.find(t => t.id === topicId); if (!topic?.subColumns?.length) { alert("Kaynak bulunamadı!"); return; } setConfirmModal({ message: `Tüm kaynaklar güncellenecek.`, type: 'info', onConfirm: () => { const targetColIds = topic.subColumns.map(sc => sc.id); const updatedStudents = cls.students.map(std => { const newGrades = { ...std.grades }; targetColIds.forEach(colId => newGrades[colId] = action); return { ...std, grades: newGrades }; }); updateClassInDb({ ...cls, students: updatedStudents }); setConfirmModal(null); } }); };
    const deleteColumn = (classId, topicId, colId) => { setActiveColMenu(null); setConfirmModal({ message: "Kaynağı silmek istediğine emin misin?", type: 'danger', onConfirm: () => { const cls = localClasses.find(c => c.id === classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => { if (t.id !== topicId) return t; return { ...t, subColumns: t.subColumns.filter(c => c.id !== colId) }; }) }); } setConfirmModal(null); } }); };
    const saveCellNote = () => { if (!activeNoteCell) return; const { classId, studentId, colId } = activeNoteCell; const cls = localClasses.find(c => c.id === classId); if (cls) { const updatedStudents = cls.students.map(s => { if (s.id === studentId) { const newNotes = { ...s.assignmentNotes, [colId]: noteInput }; if (!noteInput.trim()) delete newNotes[colId]; return { ...s, assignmentNotes: newNotes }; } return s; }); updateClassInDb({ ...cls, students: updatedStudents }); } setShowCellNoteModal(false); setActiveNoteCell(null); setNoteInput(""); };
    const deleteCellNote = () => { if (!activeNoteCell) return; const { classId, studentId, colId } = activeNoteCell; const cls = localClasses.find(c => c.id === classId); if (cls) { const updatedStudents = cls.students.map(s => { if (s.id === studentId) { const newNotes = { ...s.assignmentNotes }; delete newNotes[colId]; return { ...s, assignmentNotes: newNotes }; } return s; }); updateClassInDb({ ...cls, students: updatedStudents }); } setShowCellNoteModal(false); setActiveNoteCell(null); setNoteInput(""); };
    
    // Excel Çıktısı
    const downloadReport = (cls) => { let csvContent = "data:text/csv;charset=utf-8,"; csvContent += "Öğrenci Adı,Kullanıcı Adı,Şifre," + cls.topics.flatMap(t => t.subColumns.map(c => `${t.title} - ${c.title}`)).join(",") + "\n"; cls.students.forEach(std => { const row = [std.name, std.username, std.password]; cls.topics.forEach(t => { t.subColumns.forEach(c => { const status = std.grades?.[c.id]; const label = STATUS_OPTIONS.find(o => o.id === status)?.label || "Muaf"; const note = std.assignmentNotes?.[c.id] ? ` (${std.assignmentNotes[c.id]})` : ""; row.push(label + note); }); }); csvContent += row.join(",") + "\n"; }); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${cls.className}_Rapor.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };

    const StatusBadge = ({ status, hasNote }) => {
        const opt = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3]; const Icon = opt.icon;
        return ( <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border ${opt.bg} ${opt.color} ${opt.border} w-full shadow-sm relative group`}><Icon size={14} strokeWidth={2.5} /><span className="text-[10px] font-bold truncate">{opt.label}</span>{hasNote && <div className="absolute -top-1.5 -right-1.5 text-yellow-500 bg-white rounded-full p-0.5 shadow-sm border border-yellow-200"><StickyNote size={10} fill="currentColor"/></div>}</div> );
    };

    return (
        <div className="min-h-screen pb-20 bg-slate-50 relative">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm no-print">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><GraduationCap className="text-white" size={24} /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Öğretmen Paneli</h1><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BERKANT HOCA</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowLibraryManager(true)} className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-colors shadow-sm border border-slate-200" title="Kütüphane"><Library size={20}/></button>
                        <button onClick={onLogout} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors shadow-sm border border-slate-200" title="Çıkış Yap"><LogOut size={20}/></button>
                    </div>
                </div>
            </header>

            <CountdownTimer />

            {/* Duyurular */}
            <div className="max-w-6xl mx-auto px-4 mt-6 no-print">
                <div className="bg-white rounded-2xl p-1 shadow-md border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <div className="bg-white p-4 rounded-xl flex items-start gap-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg text-white shadow-lg shadow-indigo-200"><Megaphone size={20}/></div>
                        <div className="flex-1"><h3 className="text-sm font-bold text-slate-800 mb-1">Genel Duyuru Panosu</h3>{isEditingAnnouncement ? (<div className="mt-2"><textarea className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 focus:border-indigo-500 outline-none" rows={3} value={tempAnnouncement} onChange={(e) => setTempAnnouncement(e.target.value)}/><div className="flex justify-end gap-2 mt-2"><button onClick={() => setIsEditingAnnouncement(false)} className="text-xs px-3 py-1 bg-slate-200 rounded text-slate-600 font-bold">İptal</button><button onClick={saveAnnouncementFn} className="text-xs px-3 py-1 bg-indigo-600 rounded text-white font-bold">Kaydet</button></div></div>) : (<p className="text-sm text-slate-600 whitespace-pre-wrap">{announcement || "Henüz duyuru yok."}</p>)}</div>
                        {!isEditingAnnouncement && <button onClick={() => { setTempAnnouncement(announcement); setIsEditingAnnouncement(true); }} className="text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>}
                    </div>
                </div>
            </div>

            {/* Sınıf Yönetimi */}
            <main className="max-w-6xl mx-auto px-4 mt-8 no-print">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Layout className="text-indigo-600"/> Sınıflarım</h2>
                    <button onClick={() => { setModalType('class'); setModalInputVal(''); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 flex items-center gap-2"><Plus size={18}/> Sınıf Ekle</button>
                </div>
                
                <div className="flex flex-col gap-6">
                    {localClasses.map(cls => {
                        const stats = calculateStats(cls.students, cls.topics);
                        return (
                            <div key={cls.id} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleClass(cls.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg bg-indigo-100 text-indigo-600 transition-transform duration-300 ${cls.isOpen ? 'rotate-90' : ''}`}><ChevronRight size={20}/></div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">{cls.className} <button onClick={(e) => { e.stopPropagation(); setModalData({ classId: cls.id, currentName: cls.className }); setModalInputVal(cls.className); setModalType('edit-class'); }} className="text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-white/50"><Pencil size={14} /></button></h3>
                                        <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm"><div className="w-8 h-8 rounded-full border-4 border-indigo-100 flex items-center justify-center relative"><span className="text-[8px] font-bold text-indigo-700">%{stats.percentage}</span></div><span className="text-xs font-medium text-slate-500">Başarı</span></div>
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => { setActiveRiskClass(cls); setShowRiskModal(true); }} className="text-xs bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1 hidden sm:flex"><AlertOctagon size={14}/> Risk</button>
                                        <button onClick={() => downloadReport(cls)} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1 hidden sm:flex"><FileSpreadsheet size={14}/> Excel</button>
                                        <button onClick={() => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 300); }} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1 hidden sm:flex"><Printer size={14}/> Şifreler</button>
                                        <button onClick={() => { setModalData({ classId: cls.id }); setModalType('topic'); }} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1"><Plus size={14}/> Ödev</button>
                                        <button onClick={(e) => deleteClass(e, cls.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                                {cls.isOpen && (
                                    <div className="table-container">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr>
                                                    <th rowSpan={2} className="sticky-corner border-b border-r border-slate-200 min-w-[200px] shadow-sm p-4 text-xs font-bold text-slate-500 uppercase bg-white">Öğrenci Listesi</th>
                                                    {cls.topics?.map((topic, i) => {
                                                        const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                        return ( <th key={topic.id} colSpan={Math.max(1, (topic.subColumns?.length || 0) + 1)} className={`text-center p-2 border-b border-r border-slate-200 sticky-header-top ${theme.main} min-w-[240px]`}><div className="flex flex-col justify-center items-center gap-1">{topic.date && ( <div className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-500 font-bold flex items-center gap-0.5 cursor-pointer hover:text-indigo-600 shadow-sm border border-slate-100 mb-1" onContextMenu={(e) => { e.preventDefault(); setModalData({ classId: cls.id, topicId: topic.id }); setModalDateVal(topic.date); setModalType('edit-date'); }}>Son Teslim : <span className="text-indigo-600">{formatDate(topic.date)}</span></div> )}<div className={`flex items-center gap-1 text-sm font-black uppercase tracking-wider mt-1 ${theme.text}`}>{topic.title}<button onClick={(e) => { e.stopPropagation(); setActiveTopicMenu({ classId: cls.id, topicId: topic.id, anchorEl: e.currentTarget }); }}><MoreVertical size={14}/></button></div></div></th> );
                                                    })}
                                                </tr>
                                                <tr>
                                                    {cls.topics?.map((topic, i) => {
                                                        const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                        return ( <React.Fragment key={topic.id}>{topic.subColumns?.map(col => ( <th key={col.id} className={`p-2 border-b border-r border-slate-200 sticky-header-sub ${theme.sub} min-w-[140px] text-center`}><div className="flex flex-col items-center justify-center gap-1 h-full"><div className="font-bold text-[11px] line-clamp-2">{col.title}</div><button onClick={(e) => { e.stopPropagation(); setActiveColMenu({ classId: cls.id, topicId: topic.id, colId: col.id, anchorEl: e.currentTarget }); }} className="text-xs text-slate-400 hover:text-indigo-600 opacity-50 hover:opacity-100"><MoreVertical size={12}/></button></div></th> ))} <th className={`p-0 border-b border-r border-slate-200 w-12 text-center sticky-header-sub ${theme.sub}`}><button onClick={() => { setModalData({ classId: cls.id, topicId: topic.id }); setModalType('source'); }} className={`w-full h-full flex items-center justify-center transition-colors ${theme.btn}`} title="Kaynak Ekle"><Plus size={18}/></button></th></React.Fragment> );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cls.students?.map((std) => (
                                                    <tr key={std.id} className="border-b border-slate-100 hover:bg-slate-50 bg-white">
                                                        <td className="sticky-col-left p-3 border-r border-slate-200 shadow-sm bg-white">
                                                            <div className="flex justify-between items-center group">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-700">{std.name}</span><button onClick={(e) => { e.stopPropagation(); setModalData({ classId: cls.id, studentId: std.id, currentName: std.name }); setModalInputVal(std.name); setModalType('edit-student'); }} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12}/></button></div>
                                                                    <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 mt-1"><span className="bg-slate-100 px-1 py-0.5 rounded">{std.username}</span><span className="bg-slate-100 px-1 py-0.5 rounded text-xs font-bold tracking-widest">{std.password}</span></div>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={(e) => { e.stopPropagation(); setPrintData({ type: 'report', classData: cls, studentData: std }); setTimeout(() => window.print(), 300); }} className="text-indigo-300 hover:text-indigo-600 p-1" title="Veli Raporu Yazdır"><Printer size={14}/></button>
                                                                    <button onClick={(e) => deleteStudent(e, cls.id, std.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14}/></button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {cls.topics?.map((topic, i) => {
                                                            const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                            return ( <React.Fragment key={topic.id}>{topic.subColumns?.map(col => ( <td key={col.id} className={`p-1 border-r border-slate-100 text-center ${theme.cell}`} onContextMenu={(e) => { e.preventDefault(); setNoteInput(std.assignmentNotes?.[col.id] || ""); setActiveNoteCell({ classId: cls.id, studentId: std.id, colId: col.id }); setShowCellNoteModal(true); }}><div onClick={(e) => { e.stopPropagation(); setActiveCell({ classId: cls.id, studentId: std.id, colId: col.id, anchorEl: e.currentTarget }); }} className="cursor-pointer hover:scale-105 transition-transform"><StatusBadge status={std.grades?.[col.id] || 'exempt'} hasNote={!!std.assignmentNotes?.[col.id]} /></div></td> ))}<td className={`border-r border-slate-100 ${theme.cell}`}></td></React.Fragment> );
                                                        })}
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td className="sticky-col-left p-3 border-r border-slate-200 border-t border-slate-200 bg-slate-50">
                                                        <div className="flex gap-2"><input type="text" placeholder="Yeni Öğrenci Ekle..." className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 w-full focus:border-indigo-500 outline-none" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addStudent(cls.id); }} /><button onClick={() => addStudent(cls.id)} className="bg-indigo-600 text-white px-3 rounded text-xs font-bold shadow">EKLE</button></div>
                                                    </td>
                                                    {cls.topics?.map((t, i) => <td key={i} colSpan={Math.max(1, t.subColumns.length + 1)} className="border-t border-slate-200 bg-slate-50/20"></td>)}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Modallar ve Açılır Menüler */}
            {(activeCell || activeColMenu || activeTopicMenu) && <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" onClick={() => { setActiveCell(null); setActiveColMenu(null); setActiveTopicMenu(null); }}/>}
            
            {activeTopicMenu && (<div className="fixed z-menu bg-white rounded-xl shadow-2xl border border-slate-100 w-64 modal-anim" style={{ top: Math.min(activeTopicMenu.anchorEl.getBoundingClientRect().bottom + 5, window.innerHeight - 200), left: Math.min(Math.max(10, activeTopicMenu.anchorEl.getBoundingClientRect().left), window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}><div className="p-2"><div className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Toplu İşlem</div><button onClick={() => handleTopicBulkAction('assigned', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 text-amber-700 text-xs font-bold transition-colors"><ArrowDownToLine size={16}/> Herkese Ver</button><button onClick={() => handleTopicBulkAction('done', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-green-50 text-green-700 text-xs font-bold transition-colors"><CheckCircle size={16}/> Herkese Yapıldı</button></div><div className="h-px bg-slate-100 my-1"></div><div className="p-2"><button onClick={() => { const cls = localClasses.find(c => c.id === activeTopicMenu.classId); const topic = cls.topics.find(t => t.id === activeTopicMenu.topicId); setModalData({ classId: cls.id, topicId: topic.id, currentTitle: topic.title }); setModalInputVal(topic.title); setModalDateVal(topic.date || ''); setModalType('edit-topic'); setActiveTopicMenu(null); }} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-blue-600 text-xs font-bold transition-colors"><Pencil size={16}/> Başlığı Düzenle</button><button onClick={() => handleTopicBulkAction('delete', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors"><Trash2 size={16}/> Ödevi Sil</button></div></div>)}
            {activeColMenu && (<div className="fixed z-menu bg-white rounded-xl shadow-2xl border border-slate-100 w-48 modal-anim" style={{ top: Math.min(activeColMenu.anchorEl.getBoundingClientRect().bottom + 5, window.innerHeight - 200), left: Math.min(Math.max(10, activeColMenu.anchorEl.getBoundingClientRect().left), window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}><div className="p-2"><button onClick={() => { const cls = localClasses.find(c => c.id === activeColMenu.classId); const topic = cls.topics.find(t => t.id === activeColMenu.topicId); const col = topic.subColumns.find(c => c.id === activeColMenu.colId); setModalData({ classId: cls.id, topicId: topic.id, colId: col.id, currentTitle: col.title }); setModalInputVal(col.title); setModalType('edit-source'); setActiveColMenu(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-blue-600 text-xs font-bold transition-colors"><Pencil size={16}/> Düzenle</button><button onClick={() => deleteColumn(activeColMenu.classId, activeColMenu.topicId, activeColMenu.colId)} className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors"><Trash2 size={16}/> Kaynağı Sil</button></div></div>)}
            {activeCell && (<div className="fixed z-menu bg-white border border-slate-200 rounded-xl shadow-2xl p-2 w-48 modal-anim" style={{ top: Math.min(activeCell.anchorEl.getBoundingClientRect().bottom + 5, window.innerHeight - 200), left: Math.min(Math.max(10, activeCell.anchorEl.getBoundingClientRect().left), window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}>{STATUS_OPTIONS.map(opt => <button key={opt.id} onClick={() => updateGrade(activeCell.classId, activeCell.studentId, activeCell.colId, opt.id)} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors mb-1 last:mb-0"><opt.icon size={16} className={opt.color} /><span className="text-xs font-bold text-slate-700">{opt.label}</span></button>)}</div>)}
            
            {showCellNoteModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl modal-anim overflow-hidden"><div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center justify-between"><div className="flex items-center gap-2"><StickyNote className="text-amber-500" size={20}/><h3 className="font-bold text-amber-900">Öğretmen Notu</h3></div><div className="flex gap-1 text-[10px] font-bold"><button onClick={() => setUseNoteLibrary(false)} className={`px-2 py-1 rounded ${!useNoteLibrary ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border border-amber-200'}`}>Yaz</button><button onClick={() => setUseNoteLibrary(true)} className={`px-2 py-1 rounded ${useNoteLibrary ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border border-amber-200'}`}>Seç</button></div></div><div className="p-4">{useNoteLibrary ? (<div className="h-32 overflow-y-auto border border-amber-200 rounded-xl bg-amber-50/50">{libraryItems.filter(i => i.type === LIBRARY_TYPES.EXCUSE).map(item => (<button key={item.id} onClick={() => setNoteInput(item.text)} className={`w-full text-left p-2 text-xs border-b border-amber-100 hover:bg-amber-100 flex justify-between ${noteInput === item.text ? 'font-bold text-amber-700' : 'text-slate-600'}`}>{item.text} {noteInput === item.text && <CheckCircle size={12}/>}</button>))}{libraryItems.filter(i => i.type === LIBRARY_TYPES.EXCUSE).length === 0 && <p className="text-center text-xs text-slate-400 py-4">Kayıtlı not yok.</p>}</div>) : (<textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-400 outline-none text-sm resize-none" rows={4} placeholder="Örn: Kitabını evde unutmuş, raporlu vb." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} autoFocus></textarea>)}</div><div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">{noteInput && <button onClick={deleteCellNote} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-sm">Sil</button>}<button onClick={() => setShowCellNoteModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800">İptal</button><button onClick={saveCellNote} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm">Kaydet</button></div></div></div>)}
            {modalType && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden modal-anim shadow-2xl"><div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800">{modalType.startsWith('edit') ? 'Düzenle' : (modalType === 'class' ? 'Sınıf Ekle' : (modalType === 'topic' ? 'Ödev Ekle' : 'Kaynak Ekle'))}</h3><button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div><div className="p-6 flex flex-col gap-4">{!modalType.startsWith('edit') && modalType !== 'class' && (<div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setUseLibrary(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!useLibrary ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Yeni Yaz</button><button onClick={() => setUseLibrary(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${useLibrary ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Kütüphaneden</button></div>)}{useLibrary ? (<div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50">{libraryItems.filter(i => i.type === (modalType === 'topic' ? LIBRARY_TYPES.TOPIC : LIBRARY_TYPES.SOURCE)).map(item => (<button key={item.id} onClick={() => { setModalInputVal(item.text); if(item.date) setModalDateVal(item.date); }} className={`w-full text-left p-3 text-sm border-b border-slate-100 hover:bg-white flex flex-col gap-1 ${modalInputVal === item.text ? 'text-indigo-600 font-bold bg-white' : 'text-slate-600'}`}><span>{item.text}</span>{item.date && modalType === 'topic' && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {item.date}</span>}</button>))}{libraryItems.filter(i => i.type === (modalType === 'topic' ? LIBRARY_TYPES.TOPIC : LIBRARY_TYPES.SOURCE)).length ===0 && <p className="p-4 text-xs text-center text-slate-400">Kayıtlı veri yok.</p>}</div>) : (<input autoFocus type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-slate-800 placeholder:text-slate-400 font-medium" placeholder="İsim Giriniz..." value={modalInputVal} onChange={(e) => setModalInputVal(e.target.value)} />)}{(modalType === 'topic' || modalType === 'edit-topic') && (<div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Son Teslim Tarihi (Opsiyonel)</label><input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:border-indigo-500 outline-none" value={modalDateVal} onChange={(e) => setModalDateVal(e.target.value)} /></div>)}</div><div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3"><button onClick={closeModal} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">Vazgeç</button><button onClick={handleModalSubmit} className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">Kaydet</button></div></div></div>)}
            {showLibraryManager && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md flex flex-col max-h-[80vh] modal-anim shadow-2xl"><div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex gap-2 items-center"><Library size={18} className="text-indigo-600"/> Kütüphane</h3><button onClick={() => setShowLibraryManager(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div><div className="p-2 flex gap-2 bg-white px-4 pt-4"><button onClick={() => setLibraryCategory(LIBRARY_TYPES.TOPIC)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${libraryCategory === LIBRARY_TYPES.TOPIC ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>Ödev Şablonları</button><button onClick={() => setLibraryCategory(LIBRARY_TYPES.SOURCE)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${libraryCategory === LIBRARY_TYPES.SOURCE ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>Kaynak İsimleri</button><button onClick={() => setLibraryCategory(LIBRARY_TYPES.EXCUSE)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${libraryCategory === LIBRARY_TYPES.EXCUSE ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>Bahaneler / Notlar</button></div><div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-2"><div className="flex gap-2"><input type="text" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-indigo-500 outline-none" placeholder="Yeni kayıt..." value={libraryInput} onChange={(e) => setLibraryInput(e.target.value)} /><button onClick={() => { addLibraryItem(libraryInput); setLibraryInput(''); }} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"><Plus size={20}/></button></div>{libraryCategory === LIBRARY_TYPES.TOPIC && (<input type="date" className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500" value={libraryDate} onChange={(e) => setLibraryDate(e.target.value)}/>)}</div><div className="flex-1 overflow-y-auto p-2">{libraryItems.filter(i => i.type === libraryCategory).map(item => (<div key={item.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg group border-b border-slate-50 last:border-0"><div className="flex flex-col"><span className="text-sm font-medium text-slate-700">{item.text}</span>{item.date && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10}/> {item.date}</span>}</div><button onClick={() => deleteLibraryItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></div>))}{libraryItems.filter(i => i.type === libraryCategory).length === 0 && <div className="text-center text-slate-400 text-xs py-10">Liste boş.</div>}</div></div></div>)}
            {confirmModal && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xs w-full text-center modal-anim shadow-2xl"><div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}><AlertTriangle size={24} /></div><p className="text-slate-700 font-bold mb-6">{confirmModal.message}</p><div className="flex gap-3"><button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">İptal</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-2.5 rounded-lg text-white font-bold shadow-md ${confirmModal.type === 'danger' ? 'bg-rose-600' : 'bg-indigo-600'}`}>Evet</button></div></div></div>)}
            {showRiskModal && activeRiskClass && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden modal-anim shadow-2xl"><div className="bg-rose-50 p-4 border-b border-rose-100 flex justify-between items-center"><h3 className="font-bold text-rose-800 flex items-center gap-2"><AlertOctagon size={18}/> Risk Analizi</h3><button onClick={() => setShowRiskModal(false)} className="text-rose-400 hover:text-rose-600"><X size={20}/></button></div><div className="p-6"><p className="text-xs text-slate-500 mb-4 font-medium">Bu sınıfta ödev yapma oranı %50'nin altında olan öğrenciler:</p><div className="grid grid-cols-2 gap-3">{calculateStats(activeRiskClass.students, activeRiskClass.topics).atRisk.length > 0 ? (calculateStats(activeRiskClass.students, activeRiskClass.topics).atRisk.map((s, i) => (<div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex flex-col items-center"><span className="font-bold text-slate-700 text-sm text-center">{s.name}</span><span className="text-rose-600 font-black text-lg mt-1">%{s.rate}</span></div>))) : (<p className="col-span-2 text-center text-sm text-emerald-600 font-bold py-4">Harika! Riskli öğrenci yok.</p>)}</div></div></div></div>)}

            {/* Yazdırma Önizlemeleri */}
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
                    <div className="p-4 no-print flex gap-4 bg-slate-100 border-b border-slate-200 sticky top-0 justify-between items-center shadow-sm">
                        <span className="font-bold text-slate-700 text-sm">Yazdırma Önizlemesi (Yazdırırken bu menü gizlenir)</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPrintData(null)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm">İptal</button>
                            <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2"><Printer size={16}/> Yazdır / PDF İndir</button>
                        </div>
                    </div>
                    {printData.type === 'passwords' && (
                        <div className="p-8 print-only bg-white text-black min-h-screen">
                            <div className="text-center mb-8 border-b-2 border-black pb-4"><h1 className="text-3xl font-black">{printData.classData.className} Sınıfı Şifre Kartları</h1></div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {printData.classData.students?.map((std, i) => (
                                    <div key={i} className="border-2 border-dashed border-gray-400 p-4 rounded-xl flex flex-col items-center text-center">
                                        <GraduationCap size={24} className="mb-2 text-gray-700" />
                                        <div className="font-black text-lg mb-1">{std.name}</div>
                                        <div className="w-full bg-gray-100 py-1 mb-1 rounded text-xs text-gray-600 font-bold">Kullanıcı Adı</div><div className="font-mono text-sm mb-2">{std.username}</div>
                                        <div className="w-full bg-gray-100 py-1 mb-1 rounded text-xs text-gray-600 font-bold">Şifre</div><div className="font-mono font-black text-lg tracking-widest">{std.password}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {printData.type === 'report' && (
                        <div className="p-10 print-only bg-white text-black min-h-screen max-w-4xl mx-auto">
                            <div className="flex justify-between items-end border-b-4 border-gray-800 pb-6 mb-8">
                                <div><h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3"><GraduationCap size={36}/> Berkant Hoca</h1><p className="text-gray-500 font-bold tracking-widest mt-1 text-sm uppercase">Öğrenci Gelişim Raporu</p></div>
                                <div className="text-right"><div className="font-bold text-xl">{printData.studentData.name}</div><div className="text-gray-500">{printData.classData.className}</div></div>
                            </div>
                            <div className="space-y-6">
                                {printData.classData.topics?.map(topic => (
                                    <div key={topic.id} className="mb-6">
                                        <div className="bg-gray-100 p-3 flex justify-between items-center border-l-4 border-gray-800 font-bold mb-3"><span className="uppercase">{topic.title}</span></div>
                                        <table className="w-full text-left border-collapse border border-gray-200 text-sm">
                                            <thead><tr className="bg-gray-50 text-gray-600"><th className="border p-2 w-1/2">Kaynak / Görev</th><th className="border p-2 w-1/4 text-center">Durum</th><th className="border p-2 w-1/4 text-center">Öğretmen Notu</th></tr></thead>
                                            <tbody>
                                                {topic.subColumns?.map(col => {
                                                    const status = printData.studentData.grades?.[col.id] || 'exempt';
                                                    const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3];
                                                    return (
                                                        <tr key={col.id} className="border hover:bg-gray-50">
                                                            <td className="border p-2 font-medium">{col.title}</td><td className="border p-2 text-center font-bold">{statusData.label}</td><td className="border p-2 text-center text-xs italic text-gray-600">{printData.studentData.assignmentNotes?.[col.id] || '-'}</td>
                                                        </tr>
                                                    );
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
}
