import React, { useState } from 'react';
import { Users, Plus, Trash2, Printer, ChevronDown, ChevronUp, FileText, Lock, UserPlus } from 'lucide-react';
import { STATUS_OPTIONS } from '../config.js';

export const AdminPanel = ({ classes, onToggleClass, onOpenModal, onUpdateGradeClick, onPrintPasswords, onPrintReport, calculateStats, onDeleteClass, onAddStudent }) => {
    // Sınıf bazlı input yönetimi için local state
    const [newStudentInputs, setNewStudentInputs] = useState({});

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* ÜST BAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Sınıf Yönetimi</h2>
                </div>
                <button onClick={() => onOpenModal('class', {})} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black transition-all shadow-lg hover:bg-indigo-700">
                    <Plus size={20} strokeWidth={3}/> YENİ SINIF EKLE
                </button>
            </div>

            {/* SINIF LİSTESİ */}
            {classes.map(cls => {
                const stats = calculateStats(cls.students, cls.topics);
                const safeStudents = (cls.students || []).filter(Boolean); // BOZUK VERİLERİ (NULL) TEMİZLER

                return (
                    <div key={cls.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                        
                        <div className="p-6 md:p-8 flex justify-between items-center bg-slate-50/50 cursor-pointer hover:bg-slate-50" onClick={() => onToggleClass(cls.id)}>
                            <div className="flex items-center gap-6">
                                <div className="text-2xl font-black italic uppercase text-slate-800">{cls.className}</div>
                                <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black italic tracking-widest hidden md:inline-block">%{stats.percentage} BAŞARI</span>
                            </div>
                            <div className="flex gap-2 no-print">
                                <button onClick={(e) => {e.stopPropagation(); onPrintPasswords(cls)}} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:text-indigo-600 transition-all" title="Şifreleri Yazdır"><Printer size={20}/></button>
                                <button onClick={(e) => {e.stopPropagation(); onDeleteClass(cls.id)}} className="p-3 text-slate-300 hover:text-rose-600"><Trash2 size={20}/></button>
                                <div className="p-3 text-slate-400">{cls.isOpen ? <ChevronUp/> : <ChevronDown/>}</div>
                            </div>
                        </div>

                        {cls.isOpen && (
                            <div className="p-6 md:p-8 space-y-6 border-t border-slate-100">
                                {/* ÖDEV/KAYNAK EKLEME BUTONLARI */}
                                <div className="flex gap-3 flex-wrap">
                                    {cls.topics?.map(t => (
                                        <div key={t.id} className="p-2 bg-slate-100 rounded-2xl flex items-center gap-2 border border-slate-200">
                                            <span className="px-3 font-black text-xs uppercase text-slate-700">{t.title}</span>
                                            <button onClick={() => onOpenModal('source', {classId: cls.id, topicId: t.id})} className="p-1.5 bg-white text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all"><Plus size={14}/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => onOpenModal('topic', {classId: cls.id})} className="px-6 py-2 border-2 border-dashed border-slate-300 text-slate-400 rounded-2xl text-[10px] font-black hover:border-indigo-500 hover:text-indigo-600 transition-all">+ YENİ ÖDEV GRUBU</button>
                                </div>

                                {/* TABLO */}
                                <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                                <th className="p-5 text-left border-b min-w-[200px]">ÖĞRENCİ / ŞİFRE</th>
                                                {cls.topics?.flatMap(t => t.subColumns?.map(c => (
                                                    <th key={c.id} className="p-4 border-b bg-indigo-50/20 text-center min-w-[120px]">
                                                        <div className="text-[8px] text-indigo-400 mb-1">{t.title}</div>
                                                        <div className="text-slate-800 leading-tight">{c.title}</div>
                                                    </th>
                                                )))}
                                                <th className="p-4 border-b text-center">KARNE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* SADECE SAĞLAM VERİLER (NULL OLMAYANLAR) LİSTELENİR */}
                                            {safeStudents.map(std => (
                                                <tr key={std.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-5">
                                                        <div className="font-bold text-slate-800 text-sm">{std.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1.5"><Lock size={10}/> {std.password}</div>
                                                    </td>
                                                    {cls.topics?.flatMap(t => t.subColumns?.map(c => {
                                                        const status = std.grades?.[c.id] || 'assigned';
                                                        const opt = STATUS_OPTIONS.find(o => o.id === status);
                                                        return (
                                                            <td key={c.id} className="p-3 text-center">
                                                                <button 
                                                                    onClick={() => onUpdateGradeClick({classId: cls.id, studentId: std.id, colId: c.id})}
                                                                    className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 border-2 ${opt.bg} ${opt.color} ${opt.border} hover:brightness-95`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            </td>
                                                        );
                                                    }))}
                                                    <td className="p-4 text-center no-print">
                                                        <button onClick={() => onPrintReport(cls, std)} className="p-2 text-slate-300 hover:text-indigo-600 transition-all bg-white rounded-xl shadow-sm border border-slate-100"><FileText size={20}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            
                                            {/* HIZLI ÖĞRENCİ EKLEME SATIRI */}
                                            <tr className="bg-slate-50/30 no-print">
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" placeholder="İsim Yaz..." 
                                                            className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 w-full font-bold shadow-sm"
                                                            value={newStudentInputs[cls.id] || ""}
                                                            onChange={(e) => setNewStudentInputs({...newStudentInputs, [cls.id]: e.target.value})}
                                                            onKeyDown={(e) => {
                                                                if(e.key === 'Enter') {
                                                                    onAddStudent(cls.id, newStudentInputs[cls.id] || "");
                                                                    setNewStudentInputs({...newStudentInputs, [cls.id]: ""});
                                                                }
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                onAddStudent(cls.id, newStudentInputs[cls.id] || "");
                                                                setNewStudentInputs({...newStudentInputs, [cls.id]: ""});
                                                            }} 
                                                            className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 shadow-md"
                                                        >
                                                            <UserPlus size={18}/>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td colSpan="100" className="p-4 text-slate-300 italic text-[10px] font-bold uppercase tracking-widest text-center">
                                                    Sınıfa yeni öğrenci eklemek için bir isim giriniz.
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
    );
};

export default AdminPanel;
