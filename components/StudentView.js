import React from 'react';
import { 
    Layout, Info, CheckCircle, XCircle, Clock, MinusCircle, 
    ChevronRight, StickyNote 
} from 'lucide-react';
import { STATUS_OPTIONS } from '../config.js';

// --- YARDIMCI FONKSİYON: TARİH FORMATLAMA ---
const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('tr-TR', { 
        day: 'numeric', month: 'long', year: 'numeric' 
    });
};

// --- YARDIMCI FONKSİYON: GECİKMİŞ ÖDEV KONTROLÜ ---
const isOverdue = (d) => d ? new Date(d) < new Date(new Date().setHours(0,0,0,0)) : false;

export const StudentView = ({ student, selectedClass }) => {
    
    // Her konu için başarı yüzdesi hesaplama
    const calculateTopicPct = (topic) => {
        const colIds = topic.subColumns.map(c => c.id);
        if (colIds.length === 0) return 0;
        const completed = colIds.filter(id => student.grades?.[id] === 'done').length;
        return Math.round((completed / colIds.length) * 100);
    };

    return (
        <div className="bg-white rounded-3xl p-4 md:p-8 shadow-2xl border border-slate-200 modal-anim">
            {/* ÖĞRENCİ ÜST BİLGİ KARTI */}
            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-200">
                    {student.name.charAt(0)}
                </div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-1">{student.name}</h2>
                    <p className="text-slate-500 font-medium">{selectedClass.className} Paneli</p>
                </div>
            </div>

            {/* KONU VE ÖDEV LİSTESİ */}
            <div className="space-y-10">
                {selectedClass.topics?.map(topic => {
                    const pct = calculateTopicPct(topic);
                    const isLate = isOverdue(topic.date) && pct < 100;

                    return (
                        <div key={topic.id} className="relative">
                            {/* Konu Başlığı ve Durum Çubuğu */}
                            <div className="flex justify-between items-center mb-4 border-l-4 border-indigo-500 pl-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-indigo-700 uppercase tracking-wider">{topic.title}</h3>
                                    {topic.date && (
                                        <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${isLate ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                            <span className="font-normal text-slate-400">Son Teslim:</span> {formatDate(topic.date)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                                    %{pct} Tamamlandı
                                </span>
                            </div>

                            {/* Kaynak Kartları */}
                            <div className="grid grid-cols-1 gap-3">
                                {topic.subColumns?.map(col => {
                                    const status = student.grades?.[col.id] || 'exempt';
                                    const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3];
                                    const StatusIcon = statusData.id === 'done' ? CheckCircle : 
                                                       statusData.id === 'missing' ? XCircle : 
                                                       statusData.id === 'assigned' ? Clock : MinusCircle;
                                    const note = student.assignmentNotes?.[col.id];

                                    return (
                                        <div key={col.id} className={`bg-white border ${isLate && status !== 'done' ? 'border-red-300 animate-pulse-red' : 'border-slate-100'} rounded-2xl p-5 flex flex-col gap-3 hover:shadow-lg transition-all duration-300 group`}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>KAYNAK
                                                    </span>
                                                    <span className="text-base font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                                        {col.title}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${statusData.bg} ${statusData.border} ${statusData.color}`}>
                                                    <StatusIcon size={18} strokeWidth={2.5} />
                                                    <span className="text-xs font-black uppercase tracking-wide">{statusData.label}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Öğretmen Notu Varsa Göster */}
                                            {note && (
                                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 items-start text-xs text-amber-800">
                                                    <Info size={14} className="mt-0.5 shrink-0"/> 
                                                    <span><span className="font-bold">Hoca Notu:</span> {note}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
