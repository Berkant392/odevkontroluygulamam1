import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, X, MicOff, RefreshCw, Crown, Calendar, StickyNote, AlertTriangle, Save, User, Mic } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const JarvisModal = ({ classes, updateClassInDb, onClose }) => {
    // JARVIS İÇ STATE'LERİ (Artık App.jsx'i kirletmiyor!)
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [draftGrades, setDraftGrades] = useState({});
    const [draftNotes, setDraftNotes] = useState({});

    // 🎙️ WEB SPEECH API (SES TANIMA)
    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("⚠️ Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen güncel bir Chrome kullanın.");
            return;
        }

        if (isListening) { setIsListening(false); return; }

        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        
        recognition.onstart = () => { setIsListening(true); setSpeechTranscript(""); };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setSpeechTranscript(transcript);
            processAssistantCommand(transcript);
        };
        recognition.onerror = (event) => {
            console.error("Ses tanıma hatası: ", event.error);
            setIsListening(false); setSpeechTranscript("Ses anlaşılamadı, lütfen tekrar deneyin.");
        };
        recognition.onend = () => setIsListening(false);

        recognition.start();
    };

    // 🧠 JARVIS BEYNİ: KELİMELERİ ANALİZ ET
    const processAssistantCommand = (transcript) => {
        const lowerText = transcript.toLowerCase();
        let matchedStudents = [];
        
        classes.forEach(cls => {
            cls.students?.forEach(std => {
                if (lowerText.includes(std.name.toLowerCase()) || std.name.toLowerCase().includes(lowerText)) {
                    matchedStudents.push({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip', matchScore: 100 });
                }
            });
        });

        setFoundStudents(matchedStudents);
        
        if (matchedStudents.length > 0) {
            const firstMatch = matchedStudents[0];
            setSelectedStudent(firstMatch);
            const targetClass = classes.find(c => c.id === firstMatch.classId);
            setFoundTopics(targetClass?.topics || []);
        } else {
            setSelectedStudent(null); setFoundTopics([]);
        }
    };

    // ✏️ GEÇİCİ NOT VE DURUM DEĞİŞTİRME (DRAFT)
    const handleDraftGradeChange = (studentId, colId, statusId) => {
        setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } }));
    };

    const handleDraftNoteChange = (studentId, colId, note) => {
        setDraftNotes(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: note } }));
    };

    // 💾 DEĞİŞİKLİKLERİ VERİTABANINA GÖNDER (DÜZELTİLDİ!)
    const applyChanges = () => {
        if (!selectedStudent) return;
        const targetClass = classes.find(c => c.id === selectedStudent.classId);
        if (!targetClass) return;

        const updatedStudents = targetClass.students.map(s => {
            if (s.id === selectedStudent.id) {
                const newGrades = { ...(s.grades || {}), ...(draftGrades[s.id] || {}) };
                const newNotes = { ...(s.assignmentNotes || {}), ...(draftNotes[s.id] || {}) };
                return { ...s, grades: newGrades, assignmentNotes: newNotes };
            }
            return s;
        });

        updateClassInDb({ ...targetClass, students: updatedStudents });
        setDraftGrades({}); setDraftNotes({});
        onClose();
    };

    // Modal açıldığında otomatik dinlemeye başla
    useEffect(() => { toggleListening(); }, []);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 md:p-4">
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.95 }} className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-slate-200">
                
                {/* ÜST BİLGİ */}
                <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm relative">
                            {isListening && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brandPurple opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-brandPurple"></span></span>}
                            <Zap className="text-brandPurple" size={24}/>
                        </div>
                        <div>
                            <h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">J.A.R.V.I.S <span className="text-xs text-brandPurple bg-purple-100 px-2 py-0.5 rounded-full ml-2">BETA</span></h3>
                            <p className="text-xs text-slate-500 font-medium">Akıllı Sistem Asistanı</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm hover-lift"><X size={20}/></button>
                </div>
                
                {/* SES DİNLEME ALANI */}
                <div className="p-4 bg-white border-b border-slate-100 flex flex-col items-center justify-center min-h-[100px] relative">
                    {isListening ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="wave-bar wave-1"></div><div className="wave-bar wave-2"></div><div className="wave-bar wave-3"></div><div className="wave-bar wave-4"></div><div className="wave-bar wave-5"></div><div className="wave-bar wave-1"></div>
                            </div>
                            <span className="text-xs font-bold text-brandPurple uppercase tracking-widest animate-pulse">Sizi Dinliyorum...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-slate-100 rounded-full text-slate-400"><MicOff size={18} /></div>
                                {speechTranscript ? <p className="text-sm font-medium text-slate-700 italic px-2 text-center">"{speechTranscript}"</p> : <p className="text-sm font-medium text-slate-400">Ses algılanmadı veya durduruldu.</p>}
                            </div>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleListening} className="flex items-center gap-2 px-5 py-2 bg-purple-50 text-brandPurple hover:bg-purple-100 shadow-sm rounded-full text-xs font-black uppercase tracking-wider">
                                <Mic size={14} /> Tekrar Dinle
                            </motion.button>
                        </div>
                    )}
                </div>
                
                {/* İÇERİK ALANI (SOL: ÖĞRENCİLER | SAĞ: ÖDEVLER) */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
                    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white overflow-y-auto p-4 flex flex-col gap-2 max-h-[30vh] md:max-h-none">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bulunan Öğrenciler ({foundStudents.length})</div>
                        {foundStudents.map(student => {
                            const isSelected = selectedStudent?.id === student.id; 
                            return (
                                <button key={student.id} onClick={() => {
                                    setSelectedStudent(student);
                                    setFoundTopics(classes.find(c => c.id === student.classId)?.topics || []);
                                }} className={`text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 hover-lift ${isSelected ? (student.isVip ? 'bg-yellow-50 border-vipGoldAccent shadow-md' : 'bg-purple-50 border-brandPurple shadow-md') : 'border-transparent hover:bg-slate-50'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? (student.isVip ? 'bg-vipGoldAccent text-white' : 'bg-brandPurple text-white') : (student.isVip ? 'bg-yellow-100 text-vipGoldAccent' : 'bg-slate-100 text-slate-500')}`}>{student.name.charAt(0)}</div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`font-bold text-sm truncate ${isSelected ? (student.isVip ? 'text-vipGoldAccent' : 'text-brandPurple') : 'text-slate-700'}`}>{student.name} {student.isVip && <Crown size={12} className="inline text-vipGoldAccent ml-1"/>}</span>
                                        <span className="text-[10px] text-slate-400 font-bold truncate">{student.className}</span>
                                    </div>
                                </button>
                            );
                        })}
                        {foundStudents.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Öğrenci bulunamadı.</div>}
                    </div>
                    
                    <div className="w-full md:w-2/3 overflow-y-auto p-4 md:p-6">
                        {selectedStudent ? (
                            <div className="space-y-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between"><span>Ödevler</span>{selectedStudent.isVip && <span className="text-vipGoldAccent font-bold">Özel Ders</span>}</div>
                                
                                {/* 🐞 BURADAKİ FİLTRE HATASI DÜZELTİLDİ! ARTIK ÖDEVLER GÖRÜNECEK */}
                                {foundTopics.map(topic => (
                                    <div key={topic.id} className={`bg-white rounded-3xl border ${selectedStudent.isVip ? 'border-yellow-200' : 'border-slate-200'} p-5 shadow-sm`}>
                                        <h4 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-100 pb-3 flex items-center gap-2 justify-between">
                                            <div className="flex items-center gap-2"><div className={`w-2 h-6 ${selectedStudent.isVip ? 'bg-vipGoldAccent' : 'bg-brandPurple'} rounded-full`}></div>{topic.title}</div>
                                            {topic.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Calendar size={12}/>{formatDate(topic.date)}</span>}
                                        </h4>
                                        <div className="space-y-4">
                                            {topic.subColumns.map(col => {
                                                const targetClass = classes.find(c => c.id === selectedStudent.classId); 
                                                const studentData = targetClass?.students.find(s => s.id === selectedStudent.id);
                                                
                                                const currentDbGrade = studentData?.grades?.[col.id] || 'exempt'; 
                                                const currentDbNote = studentData?.assignmentNotes?.[col.id] || '';
                                                
                                                const draftGrade = draftGrades[selectedStudent.id]?.[col.id]; 
                                                const draftNote = draftNotes[selectedStudent.id]?.[col.id];
                                                
                                                const displayGrade = draftGrade !== undefined ? draftGrade : currentDbGrade; 
                                                const displayNote = draftNote !== undefined ? draftNote : currentDbNote;
                                                const isChanged = (draftGrade !== undefined && draftGrade !== currentDbGrade) || (draftNote !== undefined && draftNote !== currentDbNote);
                                                
                                                return (
                                                    <div key={col.id} className={`flex flex-col gap-3 p-4 rounded-2xl transition-all ${isChanged ? 'bg-yellow-50/50 border border-yellow-200 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}>
                                                        <div className="text-sm font-bold text-slate-700">{col.title}</div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {STATUS_OPTIONS.map(opt => ( 
                                                                <button key={opt.id} onClick={() => handleDraftGradeChange(selectedStudent.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all hover-lift ${displayGrade === opt.id ? `${opt.bg} ${opt.color} ${opt.border} shadow-sm scale-105` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                                                                    <opt.icon size={18} className="mb-1" strokeWidth={2.5} />
                                                                    <span className="text-[10px] font-black uppercase">{opt.label}</span>
                                                                </button> 
                                                            ))}
                                                        </div>
                                                        <div className="relative mt-1">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><StickyNote size={14} className="text-slate-400"/></div>
                                                            <input type="text" placeholder="Öğretmen notu ekle..." className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brandPurple focus:ring-2 focus:ring-purple-100 transition-all font-medium text-slate-700 placeholder:text-slate-400" value={displayNote} onChange={(e) => handleDraftNoteChange(selectedStudent.id, col.id, e.target.value)}/>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {foundTopics.length === 0 && <div className="text-xs text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">Konu bulunamadı.</div>}
                            </div>
                        ) : ( 
                            <div className="flex flex-col h-full items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
                                <User size={48} className="mb-4 text-slate-200" />
                                <p className="text-sm font-bold text-slate-500">Öğrenci Seçilmedi</p>
                            </div> 
                        )}
                    </div>
                </div>
                
                {/* KAYDET BUTONLARI */}
                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs font-bold w-full md:w-auto text-center md:text-left">
                        {Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0 ? ( 
                            <span className="text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200 flex items-center justify-center md:justify-start gap-1.5"><AlertTriangle size={14}/> Kaydedilmeyi bekleyen değişiklikler var</span> 
                        ) : ( 
                            <span className="text-slate-400">Değişiklik yapılmadı</span> 
                        )}
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={onClose} className="hover-lift flex-1 md:flex-none px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm">İptal</button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={applyChanges} disabled={Object.keys(draftGrades).length === 0 && Object.keys(draftNotes).length === 0} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black text-white shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${(Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0) ? 'bg-brandPurple hover:bg-purple-700 shadow-glow' : 'bg-slate-300 cursor-not-allowed'}`}>
                            <Save size={18} /> DEĞİŞİKLİKLERİ KAYDET
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default JarvisModal;
