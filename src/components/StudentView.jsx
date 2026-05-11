import React from 'react';
import { 
    Layout, 
    CheckCircle, 
    Clock, 
    XCircle, 
    MinusCircle, 
    Info, 
    Calendar,
    BookOpen
} from 'lucide-react';
import { STATUS_OPTIONS } from '../config.js';

export const StudentView = ({ student, selectedClass }) => {
    
    // Konu bazlı ilerleme hesaplama
    const calculateTopicProgress = (topic) => {
        if (!topic.subColumns || topic.subColumns.length === 0) return 0;
        const colIds = topic.subColumns.map(c => c.id);
        const completed = colIds.filter(id => student.grades?.[id] === 'done').length;
        return Math.round((completed / colIds.length) * 100);
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-10">
            
            {/* --- ÜST PROFİL VE ÖZET KARTI --- */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-indigo-200 shrink-0">
                    {student.name.charAt(0)}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{student.name}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
                            {selectedClass.className}
                        </span>
                        <span className="text-slate-400 text-xs font-medium">Akademik Gelişim Paneli</span>
                    </div>
                </div>
                <div className="hidden md:block h-12 w-px bg-slate-100 mx-4"></div>
                <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Genel Durum</p>
                    <div className="text-2xl font-black text-indigo-600">Aktif Takip</div>
                </div>
            </div>

            {/* --- ÖDEV VE KAYNAK LİSTESİ --- */}
            <div className="space-y-8">
                {selectedClass.topics?.map(topic => {
                    const progress = calculateTopicProgress(topic);
                    const deadline = formatDate(topic.date);
                    const isOverdue = topic.date && new Date(topic.date) < new Date() && progress < 100;

                    return (
                        <div key={topic.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                            
                            {/* Konu Başlık Bölümü */}
                            <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-2xl border border-slate-100 text-indigo-600 shadow-sm">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">{topic.title}</h3>
                                        {deadline && (
                                            <div className={`flex items-center gap-1.5 text-[10px] font-bold mt-1 uppercase tracking-widest ${isOverdue ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                                                <Calendar size={12} />
                                                Son Teslim: {deadline}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full md:w-auto flex flex-col items-end">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">İlerleme: %{progress}</div>
                                    <div className="w-full md:w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <div 
                                            className="h-full bg-indigo-600 transition-all duration-1000" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Kaynak Kartları Izgarası */}
                            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topic.subColumns?.map(col => {
                                    const status = student.grades?.[col.id] || 'exempt';
                                    const opt = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3];
                                    const note = student.assignmentNotes?.[col.id];
                                    
                                    const StatusIcon = opt.id === 'done' ? CheckCircle : 
                                                       opt.id === 'missing' ? XCircle : 
                                                       opt.id === 'assigned' ? Clock : MinusCircle;

                                    return (
                                        <div key={col.id} className="p-5 rounded-3xl bg-white border border-slate-100 flex flex-col gap-4 group hover:border-indigo-200 hover:shadow-sm transition-all duration-300">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 pr-4">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Kaynak Ünitesi</p>
                                                    <h4 className="font-bold text-slate-700 text-base leading-snug group-hover:text-indigo-700 transition-colors">
                                                        {col.title}
                                                    </h4>
                                                </div>
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 shrink-0 ${opt.bg} ${opt.color} ${opt.border}`}>
                                                    <StatusIcon size={14} strokeWidth={3} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">{opt.label}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Öğretmen Notu Alanı */}
                                            {note && (
                                                <div className="mt-auto pt-4 border-t border-slate-50">
                                                    <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 flex gap-2 items-start">
                                                        <Info size={14} className="mt-0.5 shrink-0 text-amber-500"/> 
                                                        <p className="text-[11px] text-amber-900 leading-relaxed">
                                                            <span className="font-extrabold uppercase text-[9px] mr-1">Hoca Notu:</span>
                                                            {note}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Boş Durum Kontrolü */}
                {(!selectedClass.topics || selectedClass.topics.length === 0) && (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-slate-300">
                        <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Layout size={32}/>
                        </div>
                        <p className="text-slate-500 font-medium">Henüz tanımlanmış bir ödev bulunmuyor.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentView;
