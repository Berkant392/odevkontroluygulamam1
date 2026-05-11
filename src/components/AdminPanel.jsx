import React from 'react';
import { 
    Users, Plus, Trash2, ShieldAlert, 
    Printer, Download, ChevronDown, ChevronUp, 
    UserPlus, FileText, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { STATUS_OPTIONS, TOPIC_THEMES } from '../config.js';

export const AdminPanel = ({ 
    classes, 
    onToggleClass, 
    onOpenModal, 
    onAddStudent, 
    onUpdateGrade, 
    onOpenRisk,
    onPrintPasswords,
    onPrintStudentReport,
    onDeleteClass,
    calculateStats,
    newStudentName,
    setNewStudentName
}) => {

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* ÜST EYLEM ÇUBUĞU */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter">SINIF YÖNETİMİ</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Toplam {classes.length} Aktif Sınıf</p>
                </div>
                <button 
                    onClick={() => onOpenModal('class', {})}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={20} strokeWidth={3}/> YENİ SINIF EKLE
                </button>
            </div>

            {/* SINIF KARTLARI */}
            <div className="grid grid-cols-1 gap-8">
                {classes.map((cls) => {
                    const stats = calculateStats(cls.students, cls.topics);
                    
                    return (
                        <div key={cls.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                            
                            {/* SINIF BAŞLIĞI */}
                            <div 
                                onClick={() => onToggleClass(cls.id)}
                                className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white border-2 border-indigo-600 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                        <Users size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{cls.className}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Başarı Oranı:</span>
                                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600" style={{ width: `${stats.percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs font-black text-indigo-600">%{stats.percentage}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 no-print">
                                    <button onClick={(e) => { e.stopPropagation(); onOpenRisk(cls); }} className="p-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors title='Risk Analizi'"><ShieldAlert size={20}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onPrintPasswords(cls); }} className="p-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors title='Şifreleri Yazdır'"><Printer size={20}/></button>
                                    <button onClick={(e) => onDeleteClass(e, cls.id)} className="p-3 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={20}/></button>
                                    <div className="ml-2 text-slate-400">{cls.isOpen ? <ChevronUp /> : <ChevronDown />}</div>
                                </div>
                            </div>

                            {/* SINIF DETAYI (AÇILIR ALAN) */}
                            {cls.isOpen && (
                                <div className="p-6 md:p-8 border-t border-slate-100 space-y-8 animate-slideDown">
                                    
                                    {/* ÖDEV GRUPLARI VE KAYNAKLAR */}
                                    <div className="flex flex-wrap gap-4">
                                        {cls.topics?.map((topic, tIdx) => (
                                            <div key={topic.id} className="inline-flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                                <span className="px-3 py-1 font-black text-indigo-700 text-xs uppercase">{topic.title}</span>
                                                <button 
                                                    onClick={() => onOpenModal('source', { classId: cls.id, topicId: topic.id })}
                                                    className="p-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                                >
                                                    <Plus size={14} strokeWidth={3}/>
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => onOpenModal('topic', { classId: cls.id })}
                                            className="px-4 py-2 border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 rounded-2xl text-xs font-bold transition-all"
                                        >
                                            + YENİ ÖDEV GRUBU
                                        </button>
                                    </div>

                                    {/* ÖĞRENCİ LİSTESİ VE DURUM TABLOSU */}
                                    <div className="overflow-x-auto rounded-[2rem] border border-slate-200">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    <th className="p-4 text-left border-b border-slate-200 min-w-[200px]">ÖĞRENCİ ADI</th>
                                                    {cls.topics?.map(topic => 
                                                        topic.subColumns?.map(col => (
                                                            <th key={col.id} className="p-4 text-center border-b border-slate-200 min-w-[120px] bg-indigo-50/30">
                                                                <div className="text-[9px] text-indigo-400 mb-1">{topic.title}</div>
                                                                <div className="text-[10px] text-slate-700">{col.title}</div>
                                                            </th>
                                                        ))
                                                    )}
                                                    <th className="p-4 text-right border-b border-slate-200 no-print">İŞLEM</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {cls.students?.map((student) => (
                                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-bold text-slate-700">{student.name}</td>
                                                        {cls.topics?.map(topic => 
                                                            topic.subColumns?.map(col => {
                                                                const statusId = student.grades?.[col.id] || 'assigned';
                                                                const opt = STATUS_OPTIONS.find(o => o.id === statusId);
                                                                return (
                                                                    <td key={col.id} className="p-2 text-center">
                                                                        <button 
                                                                            onClick={() => onUpdateGrade(cls.id, student.id, col.id)}
                                                                            className={`w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 border-2 ${opt.bg} ${opt.color} ${opt.border} hover:brightness-95`}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })
                                                        )}
                                                        <td className="p-4 text-right no-print">
                                                            <button 
                                                                onClick={() => onPrintStudentReport(cls, student)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <FileText size={18}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                
                                                {/* YENİ ÖĞRENCİ EKLEME SATIRI */}
                                                <tr className="bg-slate-50/30 no-print">
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Hızlı Öğrenci Ekle..." 
                                                                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-500 w-full"
                                                                value={newStudentName}
                                                                onChange={(e) => setNewStudentName(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && onAddStudent(cls.id)}
                                                            />
                                                            <button 
                                                                onClick={() => onAddStudent(cls.id)}
                                                                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700"
                                                            >
                                                                <UserPlus size={18}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td colSpan="100" className="p-4 text-slate-300 italic text-xs font-medium">
                                                        Sınıfa yeni öğrenci eklemek için ismi yazıp onaylayın.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminPanel;
