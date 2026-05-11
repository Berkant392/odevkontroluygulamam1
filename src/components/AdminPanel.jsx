import React from 'react';
import { 
    Layout, Plus, ChevronRight, Pencil, AlertOctagon, FileSpreadsheet, Printer, 
    Trash2, MoreVertical, KeyRound, UserPlus 
} from 'lucide-react';
import { TOPIC_THEMES, STATUS_OPTIONS } from '../config.js';

// StatusBadge bileşeni (HTML'deki orijinali)
const StatusBadge = ({ status, hasNote }) => {
    const opt = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3]; 
    const Icon = opt.icon;
    return ( 
        <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border ${opt.bg} ${opt.color} ${opt.border} w-full shadow-sm relative group`}>
            <Icon size={14} strokeWidth={2.5} />
            <span className="text-[10px] font-bold truncate">{opt.label}</span>
            {hasNote && <div className="absolute -top-1.5 -right-1.5 text-yellow-500 bg-white rounded-full p-0.5 shadow-sm border border-yellow-200"><div className="w-2 h-2 rounded-full bg-yellow-500"></div></div>}
        </div> 
    );
};

export const AdminPanel = ({
    classes, isTeacherMode, calculateStats, formatDate,
    onToggleClass, onOpenModal, onOpenRisk, onDownloadReport, onPrintPasswords,
    onOpenTopicMenu, onOpenColMenu, onOpenStudent, onPrintStudentReport, onDeleteStudent,
    onOpenNoteModal, onOpenCellMenu, onAddStudent, onDeleteClass,
    newStudentName, setNewStudentName
}) => {
    return (
        <div className="flex flex-col gap-8 animate-fadeIn">
            {/* HTML'DEKİ KAYBOLAN SINIF EKLEME KISMI BURADA */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Layout className="text-indigo-600"/> Sınıf Yönetimi
                </h2>
                <button 
                    onClick={() => onOpenModal('class')} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
                >
                    <Plus size={18}/> Sınıf Ekle
                </button>
            </div>

            {classes.map(cls => {
                const stats = calculateStats(cls.students, cls.topics);
                return (
                    <div key={cls.id} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        
                        {/* SINIF BAŞLIĞI */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onToggleClass(cls.id)}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg bg-indigo-100 text-indigo-600 transition-transform duration-300 ${cls.isOpen ? 'rotate-90' : ''}`}><ChevronRight size={20}/></div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    {cls.className} 
                                    <button onClick={(e) => { e.stopPropagation(); onOpenModal('edit-class', { classId: cls.id, currentName: cls.className }); }} className="text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-white/50"><Pencil size={14} /></button>
                                </h3>
                                <div className="hidden sm:flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                    <span className="text-xs font-black text-indigo-700">%{stats.percentage} BAŞARI</span>
                                </div>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => onOpenRisk(cls)} className="text-xs bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1"><AlertOctagon size={14}/> Risk</button>
                                <button onClick={() => onDownloadReport(cls)} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1"><FileSpreadsheet size={14}/> Excel</button>
                                <button onClick={() => onPrintPasswords(cls)} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1"><Printer size={14}/> Şifreler</button>
                                <button onClick={() => onOpenModal('topic', { classId: cls.id })} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1"><Plus size={14}/> Ödev</button>
                                <button onClick={(e) => onDeleteClass(e, cls.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </div>

                        {/* TABLO */}
                        {cls.isOpen && (
                            <div className="table-container">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th rowSpan={2} className="sticky-corner border-b border-r border-slate-200 min-w-[200px] shadow-sm p-4 text-xs font-bold text-slate-500 uppercase">Öğrenci Listesi</th>
                                            {cls.topics?.map((topic, i) => {
                                                const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                return ( 
                                                    <th key={topic.id} colSpan={Math.max(1, (topic.subColumns?.length || 0) + 1)} className={`text-center p-2 border-b border-r border-slate-200 sticky-header-top ${theme.main} min-w-[240px]`}>
                                                        <div className="flex flex-col justify-center items-center gap-1">
                                                            {topic.date && ( 
                                                                <div className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-500 font-bold flex items-center gap-0.5 cursor-pointer hover:text-indigo-600 shadow-sm border border-slate-100 mb-1" onContextMenu={(e) => { e.preventDefault(); onOpenModal('edit-date', { classId: cls.id, topicId: topic.id, date: topic.date }); }}>
                                                                    Son Teslim : <span className="text-indigo-600">{formatDate(topic.date)}</span>
                                                                </div> 
                                                            )}
                                                            <div className={`flex items-center gap-1 text-sm font-black uppercase tracking-wider mt-1 ${theme.text}`}>
                                                                {topic.title}
                                                                <button onClick={(e) => { e.stopPropagation(); onOpenTopicMenu({ classId: cls.id, topicId: topic.id, anchorEl: e.currentTarget }); }}><MoreVertical size={14}/></button>
                                                            </div>
                                                        </div>
                                                    </th> 
                                                );
                                            })}
                                        </tr>
                                        <tr>
                                            {cls.topics?.map((topic, i) => {
                                                const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                return ( 
                                                    <React.Fragment key={topic.id}>
                                                        {topic.subColumns?.map(col => ( 
                                                            <th key={col.id} className={`p-2 border-b border-r border-slate-200 sticky-header-sub ${theme.sub} min-w-[140px] text-center`}>
                                                                <div className="flex flex-col items-center justify-center gap-1 h-full">
                                                                    <div className="font-bold text-[11px] line-clamp-2">{col.title}</div>
                                                                    <button onClick={(e) => { e.stopPropagation(); onOpenColMenu({ classId: cls.id, topicId: topic.id, colId: col.id, anchorEl: e.currentTarget }); }} className="text-xs text-slate-400 hover:text-indigo-600 opacity-50 hover:opacity-100"><MoreVertical size={12}/></button>
                                                                </div>
                                                            </th> 
                                                        ))} 
                                                        <th className={`p-0 border-b border-r border-slate-200 w-12 text-center sticky-header-sub ${theme.sub}`}>
                                                            <button onClick={() => onOpenModal('source', { classId: cls.id, topicId: topic.id })} className={`w-full h-full flex items-center justify-center transition-colors ${theme.btn}`} title="Kaynak Ekle"><Plus size={18}/></button>
                                                        </th>
                                                    </React.Fragment> 
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(cls.students || []).filter(Boolean).map((std) => (
                                            <tr key={std.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="sticky-col-left p-3 border-r border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-center group">
                                                        <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => onOpenStudent(std)}>
                                                            <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-700">{std.name}</span><button onClick={(e) => { e.stopPropagation(); onOpenModal('edit-student', { classId: cls.id, studentId: std.id, currentName: std.name }); }} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12}/></button></div>
                                                            {isTeacherMode && std.username && ( 
                                                                <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 mt-1" onClick={e=>e.stopPropagation()}>
                                                                    <span className="bg-slate-100 px-1 py-0.5 rounded">{std.username}</span>
                                                                    <span className="bg-slate-100 px-1 py-0.5 rounded flex items-center gap-1"><KeyRound size={8}/> {std.password}</span>
                                                                </div> 
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.stopPropagation(); onPrintStudentReport(cls, std); }} className="text-indigo-300 hover:text-indigo-600 p-1" title="Veli Raporu Yazdır"><Printer size={14}/></button>
                                                            <button onClick={(e) => onDeleteStudent(e, cls.id, std.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                </td>
                                                {cls.topics?.map((topic, i) => {
                                                    const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                    return ( 
                                                        <React.Fragment key={topic.id}>
                                                            {topic.subColumns?.map(col => ( 
                                                                <td key={col.id} className={`p-1 border-r border-slate-100 text-center ${theme.cell}`} onContextMenu={(e) => { e.preventDefault(); onOpenNoteModal({ classId: cls.id, studentId: std.id, colId: col.id, currentNote: std.assignmentNotes?.[col.id] }); }}>
                                                                    <div onClick={(e) => { e.stopPropagation(); onOpenCellMenu({ classId: cls.id, studentId: std.id, colId: col.id, anchorEl: e.currentTarget }); }} className="cursor-pointer hover:scale-105 transition-transform">
                                                                        <StatusBadge status={std.grades?.[col.id] || 'exempt'} hasNote={!!std.assignmentNotes?.[col.id]} />
                                                                    </div>
                                                                </td> 
                                                            ))}
                                                            <td className={`border-r border-slate-100 ${theme.cell}`}></td>
                                                        </React.Fragment> 
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="sticky-col-left p-3 border-r border-slate-200 border-t border-slate-200">
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="Yeni Öğrenci..." className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 w-full focus:border-indigo-500 outline-none" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') onAddStudent(cls.id); }} />
                                                    <button onClick={() => onAddStudent(cls.id)} className="bg-indigo-600 text-white px-2 rounded text-xs font-bold">EKLE</button>
                                                </div>
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
    );
};
