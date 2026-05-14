import React, { useState } from 'react';
import { CheckCircle, Circle, Plus, Trash2, BookOpen, ChevronDown, ChevronRight, ListTodo, X } from 'lucide-react';
import { generateId } from '../../utils/helpers';
import { LIBRARY_TYPES } from '../../utils/constants';

const CurriculumTracker = ({ cls, updateClassInDb, libraryItems, isTeacherMode }) => {
    const [expandedTopics, setExpandedTopics] = useState({});
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newSubTopicTitles, setNewSubTopicTitles] = useState({});

    const curriculum = cls.curriculum || [];

    const toggleTopic = (id) => setExpandedTopics(p => ({...p, [id]: !p[id]}));

    const calculateProgress = (topics) => {
        if (!topics || topics.length === 0) return 0;
        let total = 0; let completed = 0;
        topics.forEach(t => {
            t.subTopics?.forEach(st => {
                total++;
                if (st.isCompleted) completed++;
            });
        });
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    const addTopic = (title) => {
        if(!title.trim()) return;
        const updated = [...curriculum, { id: generateId('curr'), title, subTopics: [] }];
        updateClassInDb({ ...cls, curriculum: updated });
        setNewTopicTitle("");
    };

    const addLibraryTopic = (e) => {
        const val = e.target.value;
        if(!val) return;
        
        // Kütüphaneden seçilen hazır müfredat şablonunu (Ana başlık ve alt başlıklarıyla birlikte) sınıfa ekleme mantığı
        const selectedItem = libraryItems.find(i => i.id === val);
        if (selectedItem && selectedItem.type === LIBRARY_TYPES.CURRICULUM) {
            const newTopic = {
                id: generateId('curr'),
                title: selectedItem.text,
                subTopics: selectedItem.subTopics ? selectedItem.subTopics.map(st => ({ id: generateId('sub'), title: st, isCompleted: false })) : []
            };
            updateClassInDb({ ...cls, curriculum: [...curriculum, newTopic] });
        }
        e.target.value = "";
    };

    const addSubTopic = (topicId) => {
        const title = newSubTopicTitles[topicId];
        if(!title || !title.trim()) return;
        const updated = curriculum.map(t => {
            if(t.id === topicId) return { ...t, subTopics: [...(t.subTopics||[]), { id: generateId('sub'), title, isCompleted: false }] };
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
        setNewSubTopicTitles(p => ({...p, [topicId]: ""}));
        setExpandedTopics(p => ({...p, [topicId]: true}));
    };

    const toggleSubTopic = (topicId, subTopicId) => {
        if(!isTeacherMode) return;
        const updated = curriculum.map(t => {
            if(t.id === topicId) {
                const newSubs = t.subTopics.map(st => st.id === subTopicId ? { ...st, isCompleted: !st.isCompleted } : st);
                return { ...t, subTopics: newSubs };
            }
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
    };

    const deleteTopic = (topicId) => updateClassInDb({ ...cls, curriculum: curriculum.filter(t => t.id !== topicId) });
    const deleteSubTopic = (topicId, subTopicId) => {
        const updated = curriculum.map(t => {
            if(t.id === topicId) return { ...t, subTopics: t.subTopics.filter(st => st.id !== subTopicId) };
            return t;
        });
        updateClassInDb({ ...cls, curriculum: updated });
    };

    const totalProgress = calculateProgress(curriculum);

    return (
        <div className="flex flex-col gap-6 animate-scale-in">
            <div className={`p-6 rounded-3xl border ${isTeacherMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'} shadow-sm`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${isTeacherMode ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-800 text-amber-400'}`}><BookOpen size={24}/></div>
                        <div>
                            <h3 className={`text-xl font-black ${isTeacherMode ? 'text-slate-800' : 'text-white'}`}>Müfredat ve Konu Takibi</h3>
                            <p className={`text-xs font-medium ${isTeacherMode ? 'text-slate-500' : 'text-slate-400'}`}>{cls.className} için güncel durum</p>
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className={isTeacherMode ? 'text-slate-600' : 'text-slate-300'}>Genel İlerleme</span>
                            <span className={isTeacherMode ? 'text-indigo-600' : 'text-amber-400'}>% {totalProgress}</span>
                        </div>
                        <div className={`h-3 w-full rounded-full overflow-hidden ${isTeacherMode ? 'bg-slate-100' : 'bg-slate-800'}`}>
                            <div className={`h-full transition-all duration-700 ${isTeacherMode ? 'bg-indigo-600' : 'bg-amber-400'}`} style={{width: `${totalProgress}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            {isTeacherMode && (
                <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex-1 flex gap-2">
                        <input type="text" placeholder="Hızlı Ana Konu Ekle..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-indigo-500 outline-none font-medium" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && addTopic(newTopicTitle)}/>
                        <button onClick={()=>addTopic(newTopicTitle)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5">EKLE</button>
                    </div>
                    <div className="flex-1 border-l border-slate-100 pl-4">
                        <select onChange={addLibraryTopic} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none text-slate-600 cursor-pointer font-medium" defaultValue="">
                            <option value="" disabled>Kütüphaneden Hazır Şablon Seç...</option>
                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.CURRICULUM).map(item => (
                                <option key={item.id} value={item.id}>{item.text}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {curriculum.length === 0 ? (
                    <div className={`py-10 text-center font-bold rounded-2xl border border-dashed ${isTeacherMode ? 'bg-white border-slate-300 text-slate-500' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                        <ListTodo size={48} className="mx-auto mb-4 opacity-30" />
                        Henüz konu eklenmemiş. Kütüphaneden şablon seçebilir veya yeni ekleyebilirsiniz.
                    </div>
                ) : (
                    curriculum.map((topic) => {
                        const topicProgress = calculateProgress([topic]);
                        const isExpanded = expandedTopics[topic.id];
                        
                        return (
                            <div key={topic.id} className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${isTeacherMode ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                                <div className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition-colors ${isTeacherMode ? 'hover:bg-slate-50' : 'hover:bg-slate-700/50'}`} onClick={() => toggleTopic(topic.id)}>
                                    <div className="flex items-center gap-3 w-full md:w-1/2">
                                        <div className={`p-1 rounded ${isTeacherMode ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-slate-400'}`}>
                                            {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                        </div>
                                        <h4 className={`font-black text-lg ${isTeacherMode ? 'text-slate-800' : 'text-slate-200'}`}>{topic.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-1/2">
                                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${isTeacherMode ? 'bg-slate-100' : 'bg-slate-900'}`}>
                                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{width: `${topicProgress}%`}}></div>
                                        </div>
                                        <span className="text-xs font-black text-emerald-500 w-12 text-right">%{topicProgress}</span>
                                        {isTeacherMode && (
                                            <button onClick={(e)=>{e.stopPropagation(); deleteTopic(topic.id);}} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className={`p-4 border-t ${isTeacherMode ? 'bg-slate-50 border-slate-100' : 'bg-slate-900/50 border-slate-700'}`}>
                                        <div className="space-y-2 mb-4">
                                            {topic.subTopics?.map(sub => (
                                                <div key={sub.id} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm group ${isTeacherMode ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                                                    <div className={`flex items-center gap-3 ${isTeacherMode ? 'cursor-pointer' : ''}`} onClick={() => toggleSubTopic(topic.id, sub.id)}>
                                                        <div className={`p-0.5 rounded-full transition-colors ${sub.isCompleted ? 'text-emerald-500' : (isTeacherMode ? 'text-slate-300 group-hover:text-indigo-400' : 'text-slate-600')}`}>
                                                            {sub.isCompleted ? <CheckCircle size={20}/> : <Circle size={20}/>}
                                                        </div>
                                                        <span className={`text-sm font-bold ${sub.isCompleted ? 'text-emerald-600/70 line-through' : (isTeacherMode ? 'text-slate-700' : 'text-slate-300')}`}>{sub.title}</span>
                                                    </div>
                                                    {isTeacherMode && (
                                                        <button onClick={() => deleteSubTopic(topic.id, sub.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                                                    )}
                                                </div>
                                            ))}
                                            {(!topic.subTopics || topic.subTopics.length === 0) && <p className="text-xs text-slate-400 pl-2">Henüz alt başlık eklenmemiş.</p>}
                                        </div>

                                        {isTeacherMode && (
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Yeni Alt Başlık Ekle..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none font-medium shadow-sm" value={newSubTopicTitles[topic.id] || ""} onChange={e => setNewSubTopicTitles(p => ({...p, [topic.id]: e.target.value}))} onKeyDown={e => e.key==='Enter' && addSubTopic(topic.id)}/>
                                                <button onClick={() => addSubTopic(topic.id)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1 shadow-sm"><Plus size={16}/> Ekle</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CurriculumTracker;
