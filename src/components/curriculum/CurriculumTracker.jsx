import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, CheckSquare, Square, CornerDownRight } from 'lucide-react';
import { generateId } from '../../utils/helpers';

const CurriculumTracker = ({ cls, updateClassInDb, isTeacherMode }) => {
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newSubTopicTitles, setNewSubTopicTitles] = useState({});

    // Sınıfın müfredat verisi yoksa boş dizi başlat
    const curriculum = cls.curriculum || [];

    // --- YÜZDE HESAPLAMA MOTORU ---
    // Genel İlerleme (Tüm alt başlıkların toplamına göre)
    const calculateOverallProgress = () => {
        if (!curriculum.length) return 0;
        let totalItems = 0;
        let completedItems = 0;

        curriculum.forEach(t => {
            if (t.subTopics && t.subTopics.length > 0) {
                totalItems += t.subTopics.length;
                completedItems += t.subTopics.filter(st => st.isCompleted).length;
            } else {
                totalItems += 1;
                if (t.isCompleted) completedItems += 1;
            }
        });
        return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
    };

    // Konu Bazlı İlerleme
    const getTopicProgress = (topic) => {
        if (topic.subTopics && topic.subTopics.length > 0) {
            const comp = topic.subTopics.filter(st => st.isCompleted).length;
            return Math.round((comp / topic.subTopics.length) * 100);
        }
        return topic.isCompleted ? 100 : 0;
    };

    const overallProgress = calculateOverallProgress();

    // Ana Konu Ekleme
    const addTopic = (title) => {
        if(!title.trim()) return;
        const updated = [...curriculum, { id: generateId('curr'), title, isCompleted: false, subTopics: [] }];
        updateClassInDb({ ...cls, curriculum: updated });
        setNewTopicTitle("");
    };

    // Alt Başlık Ekleme
    const addSubTopic = (topicId) => {
        const title = newSubTopicTitles[topicId];
        if(!title || !title.trim()) return;
        const updated = curriculum.map(t => {
            if(t.id === topicId) return { ...t, subTopics: [...(t.subTopics||[]), { id: generateId('sub'), title, isCompleted: false }] };
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
        setNewSubTopicTitles(p => ({...p, [topicId]: ""}));
    };

    // Ana Konu Tikleme
    const toggleTopic = (topicId) => {
        if(!isTeacherMode) return;
        const updated = curriculum.map(t => {
            if(t.id === topicId) {
                const newStatus = !t.isCompleted;
                // Ana konu tiklenirse, altındaki tüm konular da otomatik tiklensin
                return { 
                    ...t, 
                    isCompleted: newStatus,
                    subTopics: (t.subTopics || []).map(st => ({ ...st, isCompleted: newStatus }))
                };
            }
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
    };

    // Alt Başlık Tikleme
    const toggleSubTopic = (topicId, subTopicId) => {
        if(!isTeacherMode) return;
        const updated = curriculum.map(t => {
            if(t.id === topicId) {
                const newSubs = (t.subTopics || []).map(st => st.id === subTopicId ? { ...st, isCompleted: !st.isCompleted } : st);
                // Alt konuların hepsi tikliyse ana konuyu da otomatik tikle
                const allDone = newSubs.length > 0 && newSubs.every(st => st.isCompleted);
                return { ...t, isCompleted: allDone, subTopics: newSubs };
            }
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
    };

    // Silme İşlemleri (Sadece Öğretmen)
    const deleteTopic = (topicId) => updateClassInDb({ ...cls, curriculum: curriculum.filter(t => t.id !== topicId) });
    const deleteSubTopic = (topicId, subTopicId) => {
        const updated = curriculum.map(t => {
            if(t.id === topicId) return { ...t, subTopics: (t.subTopics || []).filter(st => st.id !== subTopicId) };
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
    };

    return (
        <div className="animate-scale-in max-w-4xl mx-auto mt-4">
            
            {/* Sayfa Başlığı ve GENEL İLERLEME ÇUBUĞU */}
            <div className={`p-8 rounded-3xl mb-8 ${isTeacherMode ? 'bg-white border border-slate-200 shadow-sm' : 'bg-slate-900 border border-slate-800 shadow-lg'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${isTeacherMode ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-800 text-amber-400'}`}>
                            <BookOpen size={32}/>
                        </div>
                        <div>
                            <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${isTeacherMode ? 'text-slate-800' : 'text-white'}`}>Müfredat Takibi</h2>
                            <p className={`font-medium mt-1 ${isTeacherMode ? 'text-slate-500' : 'text-slate-400'}`}>{cls.className} sınıfı için konu listesi</p>
                        </div>
                    </div>
                    
                    {/* Yüzde Barı Göstergesi */}
                    <div className="w-full md:w-64">
                        <div className="flex justify-between text-sm font-black mb-2">
                            <span className={isTeacherMode ? 'text-slate-600' : 'text-slate-300'}>Genel İlerleme</span>
                            <span className={isTeacherMode ? 'text-indigo-600' : 'text-amber-400'}>%{overallProgress}</span>
                        </div>
                        <div className={`h-3 w-full rounded-full overflow-hidden ${isTeacherMode ? 'bg-slate-100' : 'bg-slate-800'}`}>
                            <div className={`h-full transition-all duration-700 ${isTeacherMode ? 'bg-indigo-600' : 'bg-amber-400'}`} style={{width: `${overallProgress}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yeni Konu Ekleme (Sadece Öğretmen) */}
            {isTeacherMode && (
                <div className="flex gap-3 mb-8">
                    <input type="text" placeholder="Yeni Ana Konu Başlığı (Örn: Türev)..." className="flex-1 bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg focus:border-indigo-500 outline-none font-bold text-slate-800 shadow-sm transition-all" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && addTopic(newTopicTitle)}/>
                    <button onClick={()=>addTopic(newTopicTitle)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-2xl font-black shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-1 flex items-center gap-2">
                        <Plus size={24}/> EKLE
                    </button>
                </div>
            )}

            {/* Notion Tarzı Liste */}
            <div className={`rounded-3xl p-6 md:p-10 ${isTeacherMode ? 'bg-white border border-slate-200 shadow-sm' : 'bg-slate-900 border border-slate-800 shadow-lg'}`}>
                
                {curriculum.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold">
                        Henüz hiç konu eklenmemiş.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {curriculum.map((topic) => {
                            const tProgress = getTopicProgress(topic);
                            
                            return (
                                <div key={topic.id} className="flex flex-col group/topic">
                                    {/* Ana Konu Satırı */}
                                    <div className="flex items-start gap-4">
                                        <button onClick={() => toggleTopic(topic.id)} className={`mt-1 flex-shrink-0 transition-colors ${topic.isCompleted ? (isTeacherMode ? 'text-indigo-500' : 'text-amber-500') : 'text-slate-400 hover:text-indigo-400'} ${!isTeacherMode && 'cursor-default pointer-events-none'}`}>
                                            {topic.isCompleted ? <CheckSquare size={28} strokeWidth={2.5} /> : <Square size={28} strokeWidth={2.5} />}
                                        </button>
                                        
                                        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className={`text-2xl font-black transition-all ${topic.isCompleted ? 'text-slate-400 line-through decoration-2' : (isTeacherMode ? 'text-slate-800' : 'text-white')}`}>
                                                    {topic.title}
                                                </h3>
                                                {/* KONU BAZLI YÜZDE */}
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${topic.isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (isTeacherMode ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700')}`}>
                                                    %{tProgress}
                                                </span>
                                            </div>
                                            {isTeacherMode && (
                                                <button onClick={() => deleteTopic(topic.id)} className="opacity-0 group-hover/topic:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all">
                                                    <Trash2 size={20}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Alt Başlıklar */}
                                    <div className="pl-11 mt-3 space-y-3">
                                        {topic.subTopics?.map(sub => (
                                            <div key={sub.id} className="flex items-center gap-3 group/sub">
                                                <button onClick={() => toggleSubTopic(topic.id, sub.id)} className={`flex-shrink-0 transition-colors ${sub.isCompleted ? (isTeacherMode ? 'text-indigo-500' : 'text-amber-500') : 'text-slate-400 hover:text-indigo-400'} ${!isTeacherMode && 'cursor-default pointer-events-none'}`}>
                                                    {sub.isCompleted ? <CheckSquare size={20} strokeWidth={2.5} /> : <Square size={20} strokeWidth={2.5} />}
                                                </button>
                                                
                                                <div className="flex-1 flex items-center justify-between">
                                                    <span className={`text-lg font-bold transition-all ${sub.isCompleted ? 'text-slate-400 line-through' : (isTeacherMode ? 'text-slate-600' : 'text-slate-300')}`}>
                                                        {sub.title}
                                                    </span>
                                                    {isTeacherMode && (
                                                        <button onClick={() => deleteSubTopic(topic.id, sub.id)} className="opacity-0 group-hover/sub:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 transition-all">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Yeni Alt Başlık Ekleme Inputu (Sadece Öğretmen) */}
                                        {isTeacherMode && (
                                            <div className="flex items-center gap-3 mt-2 opacity-50 focus-within:opacity-100 transition-opacity">
                                                <CornerDownRight size={20} className="text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Alt başlık ekle..." 
                                                    className="flex-1 bg-transparent border-none text-base font-bold text-slate-600 focus:outline-none focus:ring-0 placeholder:text-slate-400"
                                                    value={newSubTopicTitles[topic.id] || ""} 
                                                    onChange={e => setNewSubTopicTitles(p => ({...p, [topic.id]: e.target.value}))} 
                                                    onKeyDown={e => e.key==='Enter' && addSubTopic(topic.id)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

export default CurriculumTracker;
