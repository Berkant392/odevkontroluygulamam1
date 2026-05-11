import React, { useState, useEffect } from 'react';
import { 
    Layout, Plus, ChevronRight, ChevronLeft, AlertOctagon, FileSpreadsheet, 
    Printer, Trash2, MoreVertical, Pencil, CheckCircle, MinusCircle, 
    XCircle, Clock, StickyNote, Library, X, Calendar, AlertTriangle, 
    Edit3, Megaphone, LogOut, GraduationCap, ArrowDownToLine 
} from 'lucide-react';
import { 
    doc, setDoc, deleteDoc, collection, addDoc, onSnapshot, query, updateDoc 
} from 'firebase/firestore';
import { 
    db, CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, 
    SETTINGS_DOC, LIBRARY_TYPES 
} from '../lib/firebase';
import { 
    calculateStats, formatDate, generateId, generateUsername, generatePassword 
} from '../lib/utils';

// --- TASARIM TOKENLARI ---
const STATUS_OPTIONS = [
    { id: 'assigned', label: 'Verildi', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'done', label: 'Yapıldı', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { id: 'missing', label: 'Eksik', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { id: 'exempt', label: 'Muaf', icon: MinusCircle, color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' },
];

const TOPIC_THEMES = [
    { main: 'bg-indigo-100 text-indigo-900 border-indigo-200', sub: 'bg-indigo-50 text-indigo-800 border-indigo-100', cell: 'bg-indigo-50/30 border-indigo-100', btn: 'hover:bg-indigo-200 text-indigo-600' },
    { main: 'bg-rose-100 text-rose-900 border-rose-200', sub: 'bg-rose-50 text-rose-800 border-rose-100', cell: 'bg-rose-50/30 border-rose-100', btn: 'hover:bg-rose-200 text-rose-600' },
    { main: 'bg-emerald-100 text-emerald-900 border-emerald-200', sub: 'bg-emerald-50 text-emerald-800 border-emerald-100', cell: 'bg-emerald-50/30 border-emerald-100', btn: 'hover:bg-emerald-200 text-emerald-600' },
    { main: 'bg-amber-100 text-amber-900 border-amber-200', sub: 'bg-amber-50 text-amber-800 border-amber-100', cell: 'bg-amber-50/30 border-amber-100', btn: 'hover:bg-amber-200 text-amber-600' },
];

export default function Dashboard({ classes, onLogout, announcement }) {
    const [localClasses, setLocalClasses] = useState(classes);
    const [activeCell, setActiveCell] = useState(null);
    const [newStudentName, setNewStudentName] = useState("");
    const [modal, setModal] = useState({ type: null, data: {} });
    const [modalInput, setModalInput] = useState("");
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [activeRiskClass, setActiveRiskClass] = useState(null);

    // Firebase'den gelen verileri yerel durumla senkronize et ve açık olan sınıfları hatırla
    useEffect(() => {
        setLocalClasses(classes.map(c => ({
            ...c,
            isOpen: localClasses.find(lc => lc.id === c.id)?.isOpen || false
        })));
    }, [classes]);

    // --- TEMEL AKSİYONLAR ---

    const handleUpdateGrade = async (classId, studentId, colId, status) => {
        const cls = localClasses.find(c => c.id === classId);
        if (!cls) return;
        const updatedStudents = cls.students.map(s => 
            s.id === studentId ? { ...s, grades: { ...s.grades, [colId]: status } } : s
        );
        await updateDoc(doc(db, CLASSES_COLLECTION, classId), { students: updatedStudents });
        setActiveCell(null);
    };

    const handleToggleClass = (id) => {
        setLocalClasses(localClasses.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c));
    };

    const handleAddStudent = async (classId) => {
        if (!newStudentName.trim()) return;
        const cls = localClasses.find(c => c.id === classId);
        const newStd = {
            id: generateId('std'),
            name: newStudentName.trim(),
            username: generateUsername(newStudentName.trim()),
            password: generatePassword(),
            grades: {},
            assignmentNotes: {}
        };
        await updateDoc(doc(db, CLASSES_COLLECTION, classId), {
            students: [...(cls.students || []), newStd]
        });
        setNewStudentName("");
    };

    // --- UI BİLEŞENLERİ ---

    const StatusBadge = ({ status, hasNote }) => {
        const opt = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3];
        const Icon = opt.icon;
        return (
            <div className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${opt.bg} ${opt.color} ${opt.border} w-full shadow-sm relative group`}>
                <Icon size={12} strokeWidth={2.5} />
                <span className="text-[9px] font-bold truncate">{opt.label}</span>
                {hasNote && <div className="absolute -top-1 -right-1 text-amber-500 bg-white rounded-full p-0.5 shadow-sm border border-amber-200 animate-pulse"><StickyNote size={8} fill="currentColor"/></div>}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header / Üst Menü */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200"><GraduationCap size={24}/></div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Yönetim Paneli</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BERKANT HOCA</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Çıkış Yap">
                        <LogOut size={22}/>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                {/* Duyuru Kartı */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-start gap-4 border-l-4 border-l-amber-400">
                    <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><Megaphone size={24}/></div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-tight">Aktif Duyuru</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{announcement || "Şu an paylaşılmış bir duyuru bulunmuyor."}</p>
                    </div>
                </div>

                {/* Sınıf Yönetimi Başlığı */}
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Layout className="text-indigo-600" size={20}/> Sınıflarım
                    </h2>
                    <button 
                        onClick={() => setModal({ type: 'add-class', data: {} })}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={18}/> Sınıf Ekle
                    </button>
                </div>

                {/* Sınıf Listesi */}
                <div className="space-y-6">
                    {localClasses.map(cls => {
                        const stats = calculateStats(cls.students || [], cls.topics || []);
                        return (
                            <div key={cls.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                <div 
                                    className="p-6 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => handleToggleClass(cls.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-1.5 rounded-xl bg-indigo-50 text-indigo-600 transition-transform ${cls.isOpen ? 'rotate-90' : ''}`}>
                                            <ChevronRight size={18}/>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">{cls.className}</h3>
                                        <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-indigo-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                                            %{stats.percentage} BAŞARI
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setActiveRiskClass(cls); setShowRiskModal(true); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Risk Analizi"><AlertOctagon size={18}/></button>
                                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={20}/></button>
                                        <button className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>

                                {cls.isOpen && (
                                    <div className="table-container">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/80">
                                                    <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 min-w-[220px] sticky-col-left bg-white z-20">Öğrenci Listesi</th>
                                                    {cls.topics?.map((topic, i) => (
                                                        <th key={topic.id} colSpan={topic.subColumns?.length || 1} className={`p-4 text-center border-r border-slate-100 ${TOPIC_THEMES[i % 4].main}`}>
                                                            <div className="text-[9px] opacity-60 mb-1 font-mono uppercase tracking-tighter">{formatDate(topic.date)}</div>
                                                            <span className="text-xs font-black uppercase tracking-widest leading-tight">{topic.title}</span>
                                                        </th>
                                                    ))}
                                                </tr>
                                                <tr className="bg-white border-b border-slate-100">
                                                    <th className="border-r border-slate-100 sticky-col-left bg-white"></th>
                                                    {cls.topics?.flatMap(t => t.subColumns).map(col => (
                                                        <th key={col.id} className="p-3 text-[10px] font-bold text-slate-500 text-center border-r border-slate-100 min-w-[130px]">{col.title}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(cls.students || []).map(std => (
                                                    <tr key={std.id} className="border-t border-slate-50 hover:bg-slate-50/40 transition-colors">
                                                        <td className="p-5 border-r border-slate-100 sticky-col-left bg-white shadow-sm">
                                                            <div className="font-bold text-slate-700 text-sm">{std.name}</div>
                                                            <div className="text-[9px] text-slate-400 mt-2 flex flex-wrap gap-2">
                                                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono tracking-tighter">{std.username}</span>
                                                                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black border border-indigo-100 tracking-wider uppercase">Şifre: {std.password}</span>
                                                            </div>
                                                        </td>
                                                        {cls.topics?.flatMap(t => t.subColumns).map(col => (
                                                            <td key={col.id} className="p-2.5 border-r border-slate-100 text-center relative">
                                                                <div 
                                                                    className="cursor-pointer hover:scale-105 transition-transform active:scale-95"
                                                                    onClick={() => setActiveCell({ classId: cls.id, studentId: std.id, colId: col.id })}
                                                                >
                                                                    <StatusBadge status={std.grades?.[col.id] || 'exempt'} hasNote={!!(std.assignmentNotes && std.assignmentNotes[col.id])} />
                                                                </div>
                                                                
                                                                {/* Status Dropdown / Durum Seçici */}
                                                                {activeCell?.studentId === std.id && activeCell?.colId === col.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveCell(null)} />
                                                                        <div className="absolute top-full left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 w-44 mt-1 animate-in zoom-in-95 duration-150 origin-top">
                                                                            {STATUS_OPTIONS.map(opt => (
                                                                                <button 
                                                                                    key={opt.id} 
                                                                                    onClick={() => handleUpdateGrade(cls.id, std.id, col.id, opt.id)}
                                                                                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl flex items-center gap-3 text-[11px] font-bold text-slate-600 transition-colors"
                                                                                >
                                                                                    <opt.icon size={14} className={opt.color} /> {opt.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {/* Yeni Öğrenci Giriş Satırı */}
                                                <tr>
                                                    <td className="p-5 border-r border-slate-100 sticky-col-left bg-slate-50/50">
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Yeni Öğrenci..." 
                                                                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 w-full shadow-inner"
                                                                value={newStudentName}
                                                                onChange={e => setNewStudentName(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddStudent(cls.id)}
                                                            />
                                                            <button 
                                                                onClick={() => handleAddStudent(cls.id)}
                                                                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95"
                                                            >
                                                                EKLE
                                                            </button>
                                                        </div>
                                                    </td>
                                                    {cls.topics?.map((t, i) => <td key={i} colSpan={t.subColumns?.length || 1} className="bg-slate-50/20"></td>)}
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

            {/* --- MODALLAR --- */}
            
            {/* Risk Analizi Modalı */}
            {showRiskModal && activeRiskClass && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-rose-50 p-6 border-b border-rose-100 flex justify-between items-center">
                            <h3 className="font-black text-rose-800 flex items-center gap-3 uppercase tracking-tight"><AlertOctagon size={24}/> Risk Analizi</h3>
                            <button onClick={() => setShowRiskModal(false)} className="text-rose-400 hover:text-rose-600 p-2"><X size={24}/></button>
                        </div>
                        <div className="p-8">
                            <p className="text-[11px] text-slate-500 mb-6 font-bold uppercase tracking-widest">Sınıf: {activeRiskClass.className}</p>
                            <div className="grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto pr-2">
                                {calculateStats(activeRiskClass.students || [], activeRiskClass.topics || []).atRisk.length > 0 ? (
                                    calculateStats(activeRiskClass.students || [], activeRiskClass.topics || []).atRisk.map((s, i) => (
                                        <div key={i} className="bg-rose-50/50 p-5 rounded-3xl border border-rose-100 flex items-center justify-between group hover:bg-rose-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 text-sm tracking-tight">{s.name}</span>
                                                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-0.5">Kritik Seviye</span>
                                            </div>
                                            <span className="text-rose-600 font-black text-2xl tracking-tighter">%{s.rate}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 px-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600"><CheckCircle size={32}/></div>
                                        <p className="text-emerald-800 font-black text-lg">HARİKA!</p>
                                        <p className="text-emerald-600 text-[11px] mt-1 font-bold uppercase tracking-widest">Sınıfta riskli öğrenci bulunmuyor.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
