import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, CheckSquare, Square, CornerDownRight, Pencil, Check } from 'lucide-react';
import { generateId } from '../../utils/helpers';

const CurriculumTracker = ({ cls, updateClassInDb, isTeacherMode }) => {
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newSubTopicTitles, setNewSubTopicTitles] = useState({});
    
    // Düzenleme (Edit) State'leri
    const [editingTopicId, setEditingTopicId] = useState(null);
    const [editingSubTopicId, setEditingSubTopicId] = useState(null);
    const [editVal, setEditVal] = useState("");

    const curriculum = cls.curriculum || [];
    const isVip = cls.type === 'vip' && !isTeacherMode;

    const calculateOverallProgress = () => {
        if (!curriculum.length) return 0;
        let totalItems = 0; let completedItems = 0;
        curriculum.forEach(t => { if (t.subTopics && t.subTopics.length > 0) { totalItems += t.subTopics.length; completedItems += t.subTopics.filter(st => st.isCompleted).length; } else { totalItems += 1; if (t.isCompleted) completedItems += 1; } });
        return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
    };

    const getTopicProgress = (topic) => {
        if (topic.subTopics && topic.subTopics.length > 0) { const comp = topic.subTopics.filter(st => st.isCompleted).length; return Math.round((comp / topic.subTopics.length) * 100); }
        return topic.isCompleted ? 100 : 0;
    };

    const overallProgress = calculateOverallProgress();

    const addTopic = (title) => { if(!title.trim()) return; const updated = [...curriculum, { id: generateId('curr'), title, isCompleted: false, subTopics: [] }]; updateClassInDb({ ...cls, curriculum: updated }); setNewTopicTitle(""); };
    const addSubTopic = (topicId) => { const title = newSubTopicTitles[topicId]; if(!title || !title.trim()) return; const updated = curriculum.map(t => { if(t.id === topicId) return { ...t, subTopics: [...(t.subTopics||[]), { id: generateId('sub'), title, isCompleted: false }] }; return t; }); updateClassInDb({ ...cls, curriculum: updated }); setNewSubTopicTitles(p => ({...p, [topicId]: ""})); };
    const toggleTopic = (topicId) => { if(!isTeacherMode) return; const updated = curriculum.map(t => { if(t.id === topicId) { const newStatus = !t.isCompleted; return { ...t, isCompleted: newStatus, subTopics: (t.subTopics || []).map(st => ({ ...st, isCompleted: newStatus })) }; } return t; }); updateClassInDb({ ...cls, curriculum: updated }); };
    const toggleSubTopic = (topicId, subTopicId) => { if(!isTeacherMode) return; const updated = curriculum.map(t => { if(t.id === topicId) { const newSubs = (t.subTopics || []).map(st => st.id === subTopicId ? { ...st, isCompleted: !st.isCompleted } : st); const allDone = newSubs.length > 0 && newSubs.every(st => st.isCompleted); return { ...t, isCompleted: allDone, subTopics: newSubs }; } return t; }); updateClassInDb({ ...cls, curriculum: updated }); };
    const deleteTopic = (topicId) => updateClassInDb({ ...cls, curriculum: curriculum.filter(t => t.id !== topicId) });
    const deleteSubTopic = (topicId, subTopicId) => { const updated = curriculum.map(t => { if(t.id === topicId) return { ...t, subTopics: (t.subTopics || []).filter(st => st.id !== subTopicId) }; return t; }); updateClassInDb({ ...cls, curriculum: updated }); };

    // Düzenleme Fonksiyonları
    const startEditTopic = (id, title) => { setEditingTopicId(id); setEditVal(title); setEditingSubTopicId(null); };
    const saveEditTopic = (id) => {
        if(!editVal.trim()) { setEditingTopicId(null); return; }
        const updated = curriculum.map(t => t.id === id ? { ...t, title: editVal } : t);
        updateClassInDb({ ...cls, curriculum: updated });
        setEditingTopicId(null);
    };

    const startEditSub = (id, title) => { setEditingSubTopicId(id); setEditVal(title); setEditingTopicId(null); };
    const saveEditSub = (topicId, subId) => {
        if(!editVal.trim()) { setEditingSubTopicId(null); return; }
        const updated = curriculum.map(t => { if(t.id === topicId) { return { ...t, subTopics: t.subTopics.map(st => st.id === subId ? { ...st, title: editVal } : st) }; } return t; });
        updateClassInDb({ ...cls, curriculum: updated });
        setEditingSubTopicId(null);
    };

    return (
        <div className="animate-scale-in max-w-4xl mx-auto mt-4 relative z-10">
            <div className={`p-8 rounded-3xl mb-8 ${isVip ? 'bg-slate-700 border border-slate-600 shadow-lg' : 'bg-white border border-slate-100 shadow-float'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${isVip ? 'bg-slate-800 text-vipGold' : 'bg-purple-50 text-brandPurple'}`}>
                            <BookOpen size={32}/>
                        </div>
                        <div>
                            <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${isVip ? 'text-white' : 'text-slate-800'}`}>Müfredat Takibi</h2>
                            <p className={`font-medium mt-1 ${isVip ? 'text-slate-300' : 'text-slate-500'}`}>{cls.className} sınıfı için konu listesi</p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-64">
                        <div className="flex justify-between text-sm font-black mb-2">
                            <span className={isVip ? 'text-slate-300' : 'text-slate-600'}>Genel İlerleme</span>
                            <span className={isVip ? 'text-vipGold' : 'text-brandPurple'}>%{overallProgress}</span>
                        </div>
                        <div className={`h-3 w-full rounded-full overflow-hidden ${isVip ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <div className={`h-full transition-all duration-700 ${isVip ? 'bg-gradient-to-r from-vipGold to-yellow-400 shadow-vip-glow' : 'bg-brandPurple shadow-glow'}`} style={{width: `${overallProgress}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            {isTeacherMode && (
                <div className="flex gap-3 mb-8">
                    <input type="text" placeholder="Yeni Ana Konu Başlığı (Örn: Türev)..." className="flex-1 hover-lift bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg focus:border-brandPurple outline-none font-bold text-slate-800 shadow-sm transition-all" value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && addTopic(newTopicTitle)}/>
                    <button onClick={()=>addTopic(newTopicTitle)} className="bg-brandPurple hover:bg-purple-700 text-white hover-lift px-8 rounded-2xl font-black shadow-glow transition-all flex items-center gap-2">
                        <Plus size={24}/> EKLE
                    </button>
                </div>
            )}

            <div className={`rounded-3xl p-6 md:p-10 ${isVip ? 'bg-slate-700 border border-slate-600 shadow-lg' : 'bg-white border border-slate-100 shadow-float'}`}>
                {curriculum.length === 0 ? (
                    <div className={`text-center py-12 font-bold ${isVip ? 'text-slate-400' : 'text-slate-400'}`}>
                        Henüz hiç konu eklenmemiş.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {curriculum.map((topic) => {
                            const tProgress = getTopicProgress(topic);
                            const isEditingThisTopic = editingTopicId === topic.id;
                            
                            return (
                                <div key={topic.id} className="flex flex-col group/topic">
                                    <div className="flex items-start gap-4">
                                        <button onClick={() => toggleTopic(topic.id)} className={`mt-1 flex-shrink-0 transition-colors ${topic.isCompleted ? (isVip ? 'text-vipGold' : 'text-brandPurple') : (isVip ? 'text-slate-400 hover:text-vipGold' : 'text-slate-400 hover:text-brandPurple')} ${!isTeacherMode && 'cursor-default pointer-events-none'}`}>
                                            {topic.isCompleted ? <CheckSquare size={28} strokeWidth={2.5} /> : <Square size={28} strokeWidth={2.5} />}
                                        </button>
                                        
                                        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                                                {isEditingThisTopic ? (
                                                    <div className="flex items-center gap-2 w-full max-w-md">
                                                        <input type="text" autoFocus className="flex-1 bg-white border-2 border-brandPurple rounded-xl px-4 py-2 text-lg font-black text-slate-800 outline-none shadow-sm" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditTopic(topic.id)} />
                                                        <button onClick={() => saveEditTopic(topic.id)} className="p-2.5 bg-successGreen text-white rounded-xl hover:bg-green-600 shadow-sm transition-colors"><Check size={18}/></button>
                                                    </div>
                                                ) : (
                                                    <h3 className={`text-2xl font-black transition-all ${topic.isCompleted ? (isVip ? 'text-slate-500 line-through decoration-2' : 'text-slate-400/50 line-through decoration-2') : (isVip ? 'text-white' : 'text-slate-800')}`}>
                                                        {topic.title}
                                                    </h3>
                                                )}
                                                {!isEditingThisTopic && (
                                                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${topic.isCompleted ? 'bg-successGreen/10 text-successGreen border-successGreen/20' : (isVip ? 'bg-slate-800 text-vipGold border-slate-600' : 'bg-slate-100 text-slate-500 border-slate-200')}`}>
                                                        %{tProgress}
                                                    </span>
                                                )}
                                            </div>
                                            {isTeacherMode && !isEditingThisTopic && (
                                                <div className="opacity-0 group-hover/topic:opacity-100 flex items-center gap-1 transition-all">
                                                    <button onClick={() => startEditTopic(topic.id, topic.title)} className="p-2 text-slate-400 hover:text-brandPurple transition-colors"><Pencil size={20}/></button>
                                                    <button onClick={() => deleteTopic(topic.id)} className="p-2 text-slate-400 hover:text-errorRed transition-colors"><Trash2 size={20}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pl-11 mt-3 space-y-3">
                                        {topic.subTopics?.map(sub => {
                                            const isEditingThisSub = editingSubTopicId === sub.id;
                                            return (
                                                <div key={sub.id} className="flex items-center gap-3 group/sub hover-lift">
                                                    <button onClick={() => toggleSubTopic(topic.id, sub.id)} className={`flex-shrink-0 transition-colors ${sub.isCompleted ? (isVip ? 'text-vipGold' : 'text-brandPurple') : (isVip ? 'text-slate-400 hover:text-vipGold' : 'text-slate-400 hover:text-brandPurple')} ${!isTeacherMode && 'cursor-default pointer-events-none'}`}>
                                                        {sub.isCompleted ? <CheckSquare size={20} strokeWidth={2.5} /> : <Square size={20} strokeWidth={2.5} />}
                                                    </button>
                                                    
                                                    <div className="flex-1 flex items-center justify-between">
                                                        {isEditingThisSub ? (
                                                            <div className="flex items-center gap-2 w-full max-w-sm">
                                                                <input type="text" autoFocus className="flex-1 bg-white border border-brandPurple rounded-lg px-3 py-1.5 text-base font-bold text-slate-800 outline-none shadow-sm" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditSub(topic.id, sub.id)} />
                                                                <button onClick={() => saveEditSub(topic.id, sub.id)} className="p-1.5 bg-successGreen text-white rounded-lg hover:bg-green-600 transition-colors"><Check size={16}/></button>
                                                            </div>
                                                        ) : (
                                                            <span className={`text-lg font-bold transition-all ${sub.isCompleted ? (isVip ? 'text-slate-500 line-through' : 'text-slate-400/50 line-through') : (isVip ? 'text-slate-300' : 'text-slate-600')}`}>
                                                                {sub.title}
                                                            </span>
                                                        )}
                                                        
                                                        {isTeacherMode && !isEditingThisSub && (
                                                            <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1 transition-all">
                                                                <button onClick={() => startEditSub(sub.id, sub.title)} className="p-1.5 text-slate-300 hover:text-brandPurple transition-colors"><Pencil size={16}/></button>
                                                                <button onClick={() => deleteSubTopic(topic.id, sub.id)} className="p-1.5 text-slate-300 hover:text-errorRed transition-colors"><Trash2 size={16}/></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {isTeacherMode && (
                                            <div className="flex items-center gap-3 mt-2 opacity-50 focus-within:opacity-100 transition-opacity">
                                                <CornerDownRight size={20} className="text-slate-400" />
                                                <input type="text" placeholder="Alt başlık ekle..." className="flex-1 bg-transparent border-none text-base font-bold text-slate-600 focus:outline-none focus:ring-0 placeholder:text-slate-400" value={newSubTopicTitles[topic.id] || ""} onChange={e => setNewSubTopicTitles(p => ({...p, [topic.id]: e.target.value}))} onKeyDown={e => e.key==='Enter' && addSubTopic(topic.id)}/>
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
