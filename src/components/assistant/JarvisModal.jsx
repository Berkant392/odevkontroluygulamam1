import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, X, MicOff, RefreshCw, Crown, Calendar, StickyNote, AlertTriangle, Save, User, Mic, TerminalSquare, CheckCircle2 } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const JarvisModal = ({ classes, updateClassInDb, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [jarvisFeedback, setJarvisFeedback] = useState("Emirlerinizi bekliyorum efendim...");
    
    const [foundStudents, setFoundStudents] = useState([]);
    const [foundTopics, setFoundTopics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [draftGrades, setDraftGrades] = useState({});
    const [draftNotes, setDraftNotes] = useState({});

    // ------------------------------------------------------------------------
    // 🎙️ J.A.R.V.I.S NLP (DOĞAL DİL İŞLEME VE NİYET OKUMA) MOTORU
    // ------------------------------------------------------------------------
    const analyzeCommand = (transcript) => {
        const text = transcript.toLocaleLowerCase('tr-TR');
        
        // 1. ADIM: NİYET (INTENT) TESPİTİ - Öğrenci ödevi ne yapmış?
        let status = null;
        if (text.match(/çözmemiş|yapmamış|yapmadı|eksik|boş|yok/)) status = 'missing';
        else if (text.match(/çözdü|yaptı|tamamladı|bitirdi|full|bitti/)) status = 'done';
        else if (text.match(/verdim|verildi|atadım|ödev ver|çözecek/)) status = 'assigned';
        else if (text.match(/muaf|gerek yok|çözmesin/)) status = 'exempt';

        // 2. ADIM: ÖĞRENCİ TESPİTİ
        let bestStudent = null;
        let targetClass = null;
        for (const cls of classes) {
            for (const std of (cls.students || [])) {
                const sName = std.name.toLocaleLowerCase('tr-TR');
                const [firstName] = sName.split(' ');
                // Tam ismi veya sadece ilk ismi geçiyorsa yakala
                if (text.includes(sName) || (firstName && firstName.length > 2 && text.includes(firstName))) {
                    bestStudent = std;
                    targetClass = cls;
                    break;
                }
            }
            if (bestStudent) break;
        }

        if (!bestStudent) {
            setFoundStudents([]); setSelectedStudent(null); setFoundTopics([]);
            setJarvisFeedback("Söylediğiniz cümlede bir öğrenci ismi tespit edemedim.");
            return;
        }

        // Öğrenci bulundu, ekrana yansıt
        setFoundStudents([{ ...bestStudent, classId: targetClass.id, className: targetClass.className, isVip: targetClass.type === 'vip' }]);
        setSelectedStudent({ ...bestStudent, classId: targetClass.id });
        setFoundTopics(targetClass.topics || []);

        // 3. ADIM: KONU TESPİTİ
        let bestTopic = null;
        for (const topic of (targetClass.topics || [])) {
            const tName = topic.title.toLocaleLowerCase('tr-TR');
            const mainWord = tName.split(' ')[0]; // Örn: "Türev Alma" -> "türev"
            if (text.includes(tName) || (mainWord.length > 3 && text.includes(mainWord))) {
                bestTopic = topic;
                break;
            }
        }

        // 4. ADIM: KAYNAK (SUB-COLUMN) TESPİTİ
        let bestCol = null;
        if (bestTopic) {
            for (const col of (bestTopic.subColumns || [])) {
                const cName = col.title.toLocaleLowerCase('tr-TR');
                const matchNumber = cName.match(/\d+/); // Başlıktaki sayıyı bul (Örn: "Kaynak 1" -> "1")
                // Eğer kaynak adı cümlede tam geçiyorsa veya ("kaynak" kelimesi + sayı) geçiyorsa yakala
                if (text.includes(cName) || (matchNumber && text.includes(matchNumber[0]) && (text.includes('kaynak') || text.includes('test')))) {
                    bestCol = col;
                    break;
                }
            }
        }

        // 5. ADIM: J.A.R.V.I.S SONUÇ RAPORU VE OTOMATİK İŞARETLEME
        if (bestStudent && bestTopic && bestCol && status) {
            handleDraftGradeChange(bestStudent.id, bestCol.id, status);
            const statusLabels = { 'done': 'Yapıldı', 'missing': 'Eksik', 'assigned': 'Verildi', 'exempt': 'Muaf' };
            setJarvisFeedback(`Tamamdır! ${bestStudent.name} öğrencisinin ${bestTopic.title} -> ${bestCol.title} ödevi "${statusLabels[status]}" olarak işaretlendi.`);
        } else if (bestStudent && bestTopic && !bestCol) {
            setJarvisFeedback(`${bestStudent.name} öğrencisi ve ${bestTopic.title} konusu bulundu ancak hangi kaynak olduğunu anlayamadım.`);
        } else if (bestStudent && !bestTopic) {
            setJarvisFeedback(`${bestStudent.name} bulundu, ancak hangi konu olduğunu anlayamadım.`);
        } else if (bestStudent && bestTopic && bestCol && !status) {
            setJarvisFeedback(`Ödev bulundu ancak durumu anlayamadım (Yaptı mı, eksik mi?).`);
        } else {
            setJarvisFeedback(`${bestStudent.name} profili ekrana getirildi.`);
        }
    };

    // ------------------------------------------------------------------------
    // 🎙️ MİKROFON VE DİNLEME YÖNETİMİ
    // ------------------------------------------------------------------------
    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("⚠️ Tarayıcınız ses tanıma desteklemiyor."); return; }

        if (isListening) { setIsListening(false); return; }

        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        
        recognition.onstart = () => { 
            setIsListening(true); 
            setSpeechTranscript(""); 
            setJarvisFeedback("Sizi dinliyorum...");
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setSpeechTranscript(transcript);
            analyzeCommand(transcript); // NLP Motoruna gönder
        };
        recognition.onerror = (event) => {
            setIsListening(false); setJarvisFeedback("Ses anlaşılamadı veya mikrofon engellendi.");
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    // ------------------------------------------------------------------------
    // ✏️ GEÇİCİ DURUM VE VERİTABANI KAYDI
    // ------------------------------------------------------------------------
    const handleDraftGradeChange = (studentId, colId, statusId) => {
        setDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: statusId } }));
    };

    const handleDraftNoteChange = (studentId, colId, note) => {
        setDraftNotes(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: note } }));
    };

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
        setJarvisFeedback("Değişiklikler başarıyla veritabanına kaydedildi.");
        setTimeout(() => onClose(), 1500);
    };

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
                            <h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">J.A.R.V.I.S <span className="text-xs text-brandPurple bg-purple-100 px-2 py-0.5 rounded-full ml-2">NLP AI</span></h3>
                            <p className="text-xs text-slate-500 font-medium">Doğal Dil İşlemeli Akıllı Asistan</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm hover-lift"><X size={20}/></button>
                </div>
                
                {/* JARVIS TERMİNALİ VE DİNLEME */}
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col items-center justify-center min-h-[140px] relative">
                    <div className="absolute top-3 left-4 flex items-center gap-2 text-slate-500 text-[10px] font-mono tracking-widest"><TerminalSquare size={14}/> SYSTEM OUTPUT</div>
                    
                    {isListening ? (
                        <div className="flex flex-col items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                                <div className="wave-bar wave-1 bg-brandPurple"></div><div className="wave-bar wave-2 bg-brandPurple"></div><div className="wave-bar wave-3 bg-brandPurple"></div><div className="wave-bar wave-4 bg-brandPurple"></div><div className="wave-bar wave-5 bg-brandPurple"></div>
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-widest animate-pulse">Sizi Dinliyorum...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 mt-4 w-full px-4">
                            {speechTranscript ? (
                                <div className="w-full text-center">
                                    <p className="text-sm font-medium text-slate-400 italic mb-2">"{speechTranscript}"</p>
                                    <div className="bg-brandPurple/20 border border-brandPurple/30 text-purple-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                                        <CheckCircle2 size={16} className="text-brandPurple"/> {jarvisFeedback}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-slate-500">{jarvisFeedback}</p>
                            )}
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleListening} className="mt-2 flex items-center gap-2 px-5 py-2 bg-slate-800 text-white hover:bg-slate-700 shadow-sm border border-slate-700 rounded-full text-xs font-black uppercase tracking-wider">
                                <Mic size={14} className="text-brandPurple" /> Tekrar Dinle
                            </motion.button>
                        </div>
                    )}
                </div>
                
                {/* İÇERİK ALANI */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
                    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white overflow-y-auto p-4 flex flex-col gap-2 max-h-[30vh] md:max-h-none">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Seçili Profil</div>
                        {foundStudents.map(student => {
                            const isSelected = selectedStudent?.id === student.id; 
                            return (
                                <button key={student.id} onClick={() => { setSelectedStudent(student); setFoundTopics(classes.find(c => c.id === student.classId)?.topics || []); }} className={`text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 hover-lift ${isSelected ? (student.isVip ? 'bg-yellow-50 border-vipGoldAccent shadow-md' : 'bg-purple-50 border-brandPurple shadow-md') : 'border-transparent hover:bg-slate-50'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? (student.isVip ? 'bg-vipGoldAccent text-white' : 'bg-brandPurple text-white') : (student.isVip ? 'bg-yellow-100 text-vipGoldAccent' : 'bg-slate-100 text-slate-500')}`}>{student.name.charAt(0)}</div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`font-bold text-sm truncate ${isSelected ? (student.isVip ? 'text-vipGoldAccent' : 'text-brandPurple') : 'text-slate-700'}`}>{student.name} {student.isVip && <Crown size={12} className="inline text-vipGoldAccent ml-1"/>}</span>
                                        <span className="text-[10px] text-slate-400 font-bold truncate">{student.className}</span>
                                    </div>
                                </button>
                            );
                        })}
                        {foundStudents.length === 0 && <div className="text-xs text-slate-400 text-center py-4 flex flex-col items-center gap-2"><User size={24} className="opacity-20"/> Bekleniyor...</div>}
                    </div>
                    
                    <div className="w-full md:w-2/3 overflow-y-auto p-4 md:p-6 relative">
                        {selectedStudent ? (
                            <div className="space-y-6">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between"><span>Ödevler</span>{selectedStudent.isVip && <span className="text-vipGoldAccent font-bold">Özel Ders</span>}</div>
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
                                                    <div key={col.id} className={`flex flex-col gap-3 p-4 rounded-2xl transition-all ${isChanged ? 'bg-purple-50/50 border-2 border-brandPurple shadow-md' : 'bg-slate-50 border-2 border-transparent'}`}>
                                                        <div className="text-sm font-bold text-slate-700 flex justify-between">
                                                            {col.title}
                                                            {isChanged && <span className="text-[9px] bg-brandPurple text-white px-2 py-0.5 rounded-full animate-pulse">J.A.R.V.I.S TARAFINDAN İŞARETLENDİ</span>}
                                                        </div>
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
                            </div>
                        ) : ( 
                            <div className="flex flex-col h-full items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300 p-8 opacity-50">
                                <Zap size={48} className="mb-4" />
                                <p className="text-sm font-bold">J.A.R.V.I.S Sizi Dinliyor</p>
                            </div> 
                        )}
                    </div>
                </div>
                
                {/* KAYDET BUTONLARI */}
                <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs font-bold w-full md:w-auto text-center md:text-left">
                        {Object.keys(draftGrades).length > 0 || Object.keys(draftNotes).length > 0 ? ( 
                            <span className="text-brandPurple bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 flex items-center justify-center md:justify-start gap-1.5"><AlertTriangle size={14}/> Onay bekleyen J.A.R.V.I.S işlemleri var</span> 
                        ) : ( 
                            <span className="text-slate-400">Veritabanı güncel</span> 
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
