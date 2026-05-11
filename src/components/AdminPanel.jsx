import React from 'react';
import { Users, Plus, Trash2, Printer, ChevronDown, ChevronUp, FileText, Lock } from 'lucide-react';
import { STATUS_OPTIONS } from '../config.js';

export const AdminPanel = ({ classes, onToggleClass, onOpenModal, onUpdateGradeClick, onPrintPasswords, onPrintReport, calculateStats, onDeleteClass }) => {
    return (
        <div className="space-y-8 animate-fadeIn">
            {classes.map(cls => {
                const stats = calculateStats(cls.students, cls.topics);
                return (
                    <div key={cls.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-8 flex justify-between items-center bg-slate-50/50 cursor-pointer" onClick={() => onToggleClass(cls.id)}>
                            <div className="flex items-center gap-6">
                                <div className="text-2xl font-black italic">{cls.className}</div>
                                <span className="px-4 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black italic">%{stats.percentage} BAŞARI</span>
                            </div>
                            <div className="flex gap-2 no-print">
                                <button onClick={(e) => {e.stopPropagation(); onPrintPasswords(cls)}} className="p-3 bg-white border rounded-2xl shadow-sm text-slate-600 hover:text-indigo-600 transition-all"><Printer size={20}/></button>
                                <div className="p-3">{cls.isOpen ? <ChevronUp/> : <ChevronDown/>}</div>
                            </div>
                        </div>

                        {cls.isOpen && (
                            <div className="p-8 space-y-6">
                                <div className="flex gap-2 flex-wrap">
                                    {cls.topics?.map(t => (
                                        <div key={t.id} className="p-2 bg-slate-100 rounded-2xl flex items-center gap-2">
                                            <span className="px-2 font-black text-xs uppercase">{t.title}</span>
                                            <button onClick={() => onOpenModal('source', {classId: cls.id, topicId: t.id})} className="p-1.5 bg-white text-indigo-600 rounded-xl shadow-sm"><Plus size={14}/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => onOpenModal('topic', {classId: cls.id})} className="px-4 py-2 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black hover:border-indigo-400 transition-all">+ ÖDEV GRUBU</button>
                                </div>

                                <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                                <th className="p-5 text-left border-b">ÖĞRENCİ / ŞİFRE</th>
                                                {cls.topics?.flatMap(t => t.subColumns?.map(c => (
                                                    <th key={c.id} className="p-4 border-b bg-indigo-50/20 text-center">
                                                        <div className="text-[8px] text-indigo-400 mb-1">{t.title}</div>
                                                        <div className="text-slate-800 leading-none">{c.title}</div>
                                                    </th>
                                                )))}
                                                <th className="p-4 border-b">KARNE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cls.students?.map(std => (
                                                <tr key={std.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                                                    <td className="p-5">
                                                        <div className="font-bold text-slate-800">{std.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1"><Lock size={10}/> {std.password}</div>
                                                    </td>
                                                    {cls.topics?.flatMap(t => t.subColumns?.map(c => {
                                                        const status = std.grades?.[c.id] || 'assigned';
                                                        const opt = STATUS_OPTIONS.find(o => o.id === status);
                                                        return (
                                                            <td key={c.id} className="p-3 text-center">
                                                                <button 
                                                                    onClick={() => onUpdateGradeClick({classId: cls.id, studentId: std.id, colId: c.id})}
                                                                    className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${opt.bg} ${opt.color} ${opt.border}`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            </td>
                                                        );
                                                    }))}
                                                    <td className="p-4 text-center">
                                                        <button onClick={() => onPrintReport(cls, std)} className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><FileText size={20}/></button>
                                                    </td>
                                                </tr>
                                            ))}
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
