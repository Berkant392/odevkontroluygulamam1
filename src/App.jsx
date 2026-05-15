import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, GraduationCap, Library, Settings, LogOut, Mic, X } from 'lucide-react';

// FİREBASE
import { db } from './config/firebase'; 
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

// YARDIMCILAR VE SABİTLER (Veritabanı Yolları Buradan Geliyor!)
import { LIBRARY_TYPES, STATUS_OPTIONS, CLASSES_COLLECTION, LIBRARY_COLLECTION, DEFAULT_PIN } from './utils/constants';
import { generateId } from './utils/helpers';

// 🧩 PARÇALANMIŞ BİLEŞENLERİMİZ
import LoginScreen from './components/auth/LoginScreen';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';
import ClassDetail from './components/views/ClassDetail';
import StudentDetail from './components/views/StudentDetail';
import LibraryModal from './components/modals/LibraryModal';
import AssistantModal from './components/modals/AssistantModal';

const App = () => {
    // -------------------------------------------------------------
    // 1. STATE YÖNETİMİ
    // -------------------------------------------------------------
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [dailyQuote, setDailyQuote] = useState({ text: "Eğitim, dünyayı değiştirmek için en güçlü silahtır." });
    
    // Auth & Roller
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [isTeacherMode, setIsTeacherMode] = useState(false);
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN); // Sabit 1234 veya constants'dan ne gelirse
    
    // Görünüm & Seçimler
    const [view, setView] = useState('home'); 
    const [activeTab, setActiveTab] = useState('homework'); 
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    
    // Mobil Kontrolü
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Formlar & Küçük Modallar
    const [newStudentName, setNewStudentName] = useState("");
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState(null);
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalDateVal, setModalDateVal] = useState("");
    const [modalPdfVal, setModalPdfVal] = useState("");
    
    // Menüler
    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    const [activeColMenu, setActiveColMenu] = useState(null);
    const [activeCell, setActiveCell] = useState(null);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [cellNoteModal, setCellNoteModal] = useState(null);

    // Kütüphane Yönetimi
    const [showLibraryManager, setShowLibraryManager] = useState(false);
    const [libraryCategory, setLibraryCategory] = useState(LIBRARY_TYPES.TOPIC);
    const [libraryInput, setLibraryInput] = useState("");
    const [libraryDate, setLibraryDate] = useState("");

    // Asistan State'leri
    const [showAssistant, setShowAssistant] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [assistantFoundStudents, setAssistantFoundStudents] = useState([]);
    const [assistantFoundTopics, setAssistantFoundTopics] = useState([]);
    const [assistantSelectedStudent, setAssistantSelectedStudent] = useState(null);
    const [assistantDraftGrades, setAssistantDraftGrades] = useState({});
    const [assistantDraftNotes, setAssistantDraftNotes] = useState({});

    const regularClasses = classes.filter(c => c.type !== 'vip');
    const vipClasses = classes.filter(c => c.type === 'vip');

    // -------------------------------------------------------------
    // 2. FİREBASE VERİ ÇEKME (DOĞRU KOLEKSİYONLARDAN)
    // -------------------------------------------------------------
    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, CLASSES_COLLECTION), (snap) => {
            setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubLibrary = onSnapshot(collection(db, LIBRARY_COLLECTION), (snap) => {
            setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubClasses(); unsubLibrary(); };
    }, []);

    // -------------------------------------------------------------
    // 3. AUTH (GİRİŞ / ÇIKIŞ) FONKSİYONLARI
    // -------------------------------------------------------------
    const verifyPin = (inputPin) => {
        if (String(inputPin).trim() === String(dbTeacherPin).trim()) {
            setIsTeacherMode(true); setCurrentUserRole('teacher'); setView('home'); setActiveTab('homework');
        } else { alert("Hatalı PIN!"); }
    };

    const handleStudentLogin = (username, password, isVipLogin = false) => {
        let foundStudent = null, foundClass = null;
        const classesToSearch = isVipLogin ? vipClasses : regularClasses;
        for (const cls of classesToSearch) {
            const std = cls.students?.find(s => s.username === username.trim() && s.password === password.trim());
            if (std) { foundStudent = std; foundClass = cls; break; }
        }
        if (foundStudent) {
            setCurrentUserRole(isVipLogin ? 'vip-student' : 'student');
            setLoggedInStudent(foundStudent); setSelectedClass(foundClass);
            setSelectedStudentForView(foundStudent); setView('student-detail'); setActiveTab('homework');
            
            const updatedStudents = foundClass.students.map(s => s.id === foundStudent.id ? { ...s, lastLogin: new Date().toISOString() } : s);
            updateClassInDb({ ...foundClass, students: updatedStudents });
        } else { alert('Kullanıcı adı veya şifre hatalı!'); }
    };

    const handleLogout = () => {
        setCurrentUserRole(null); setIsTeacherMode(false); setLoggedInStudent(null);
        setSelectedClass(null); setSelectedStudentForView(null); setView('home');
    };

    // -------------------------------------------------------------
    // 4. VERİTABANI VE YÖNLENDİRME FONKSİYONLARI
    // -------------------------------------------------------------
    const updateClassInDb = async (updatedClass) => {
        try { await updateDoc(doc(db, CLASSES_COLLECTION, updatedClass.id), updatedClass);
        if (selectedClass?.id === updatedClass.id) setSelectedClass(updatedClass); } 
        catch (e) { console.error("Sınıf güncellenemedi:", e); }
    };

    const goHome = () => { setView('home'); setSelectedClass(null); setSelectedStudentForView(null); setActiveTab('homework'); };
    const openClass = (cls) => { setSelectedClass(cls); setView('class-detail'); setActiveTab('homework'); };
    const openStudent = (std) => { setSelectedStudentForView(std); setView('student-detail'); setActiveTab('homework'); };

    const addLibraryItem = async (text) => { 
        if(!text || typeof text !== 'string' || !text.trim()) return; 
        let subTopics = []; let mainText = text.trim();
        
        if (libraryCategory === LIBRARY_TYPES.CURRICULUM && text.includes(',')) {
            const parts = text.split(','); mainText = parts[0].trim();
            subTopics = parts.slice(1).map(p => ({ title: p.trim() })).filter(p => p.title);
        }
        await addDoc(collection(db, LIBRARY_COLLECTION), { text: mainText, type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null, subTopics: subTopics }); 
    };

    const deleteLibraryItem = async (id) => { await deleteDoc(doc(db, LIBRARY_COLLECTION, id)); };

    const addStudent = (classId) => {
        if(!newStudentName.trim()) return;
        const cls = classes.find(c => c.id === classId);
        const username = newStudentName.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random()*1000);
        const password = Math.random().toString(36).slice(-6);
        const newStd = { id: generateId('std'), name: newStudentName, username, password, grades: {}, assignmentNotes: {} };
        updateClassInDb({ ...cls, students: [...(cls.students || []), newStd] });
        setNewStudentName("");
    };

    const deleteStudent = (e, classId, studentId) => {
        e.stopPropagation(); if(!window.confirm('Emin misiniz?')) return;
        const cls = classes.find(c => c.id === classId);
        updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== studentId) });
    };

    const updateGrade = (classId, studentId, colId, statusId) => {
        const cls = classes.find(c => c.id === classId);
        const updatedStudents = cls.students.map(s => s.id === studentId ? { ...s, grades: { ...(s.grades || {}), [colId]: statusId } } : s);
        updateClassInDb({ ...cls, students: updatedStudents });
        setActiveCell(null);
    };

    const deleteColumn = (classId, topicId, colId) => {
        if(!window.confirm('Kaynağı silmek istediğinize emin misiniz?')) return;
        const cls = classes.find(c => c.id === classId);
        const updatedTopics = cls.topics.map(t => t.id === topicId ? { ...t, subColumns: t.subColumns.filter(c => c.id !== colId) } : t);
        updateClassInDb({ ...cls, topics: updatedTopics });
    };

    const deleteClass = (e, classId) => {
        e.stopPropagation(); if(!window.confirm('Tüm sınıf silinecek. Emin misiniz?')) return;
        deleteDoc(doc(db, CLASSES_COLLECTION, classId)); goHome();
    };

    const openCellNoteModal = (classId, studentId, colId, currentNote) => { setCellNoteModal({ classId, studentId, colId, note: currentNote || "" }); };

    const toggleListening = () => { alert("Asistan mikrofonu etkinleştirilecek."); };
    const handleDraftGradeChange = () => {}; 
    const handleDraftNoteChange = () => {};
    const applyAssistantDrafts = () => { setShowAssistant(false); };

    const handleModalSubmit = async () => {
        if (!modalInputVal.trim()) return;
        if (modalType === 'class' || modalType === 'vip') {
            await addDoc(collection(db, CLASSES_COLLECTION), { className: modalInputVal, type: modalType === 'vip' ? 'vip' : 'regular', students: [], topics: [], curriculum: [] });
        } else if (modalType === 'topic') {
            const cls = classes.find(c => c.id === modalData.classId);
            const newTopic = { id: generateId('top'), title: modalInputVal, date: modalDateVal, subColumns: [] };
            updateClassInDb({ ...cls, topics: [...(cls.topics||[]), newTopic] });
        }
        setModalType(null); setModalInputVal(""); setModalDateVal("");
    };

    // -------------------------------------------------------------
    // 5. GİRİŞ EKRANI KONTROLÜ
    // -------------------------------------------------------------
    if (!currentUserRole) {
        return <LoginScreen onStudentLogin={handleStudentLogin} onTeacherLogin={verifyPin} />;
    }

    // -------------------------------------------------------------
    // 6. ANA UYGULAMA (APP SHELL)
    // -------------------------------------------------------------
    return (
        <div className={`min-h-screen pb-32 relative transition-colors duration-1000 ${currentUserRole === 'vip-student' ? 'bg-slate-900' : 'bg-lightBg'}`}>
            
            {currentUserRole === 'vip-student' && (
                <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-screen opacity-10" style={{background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)'}}></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full mix-blend-screen opacity-[0.05]" style={{background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)'}}></div>
                </div>
            )}

            <header className={`no-print relative z-20 transition-all duration-500 ${currentUserRole === 'vip-student' ? 'bg-slate-800/90 border-b border-slate-700 shadow-md' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
                 <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        {currentUserRole !== 'student' && currentUserRole !== 'vip-student' && view !== 'home' ? (
                            <button onClick={() => view === 'student-detail' ? setView('class-detail') : goHome()} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><ChevronLeft size={24} /></button>
                        ) : <div className="w-10"></div>}
                        
                        <div className="text-center">
                            <h1 className={`text-xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-3 ${currentUserRole === 'vip-student' ? 'real-gold-text' : 'text-slate-800'}`}>
                                <div className={`p-2 rounded-xl shadow-md transition-transform hover:scale-105 hover-lift ${currentUserRole === 'vip-student' ? 'real-gold-bg shadow-vip-glow' : 'bg-gradient-to-tr from-brandPurple to-blue-600 shadow-glow'}`}>
                                    <GraduationCap className={currentUserRole === 'vip-student' ? 'text-[#111]' : 'text-white'} size={24} strokeWidth={2.5} />
                                </div> 
                                BERKANT HOCA
                            </h1>
                        </div>

                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {isTeacherMode && <button onClick={() => setShowLibraryManager(true)} className="p-2 text-slate-500 hover:text-brandPurple bg-white hover:bg-purple-50 rounded-full transition-colors shadow-sm border border-slate-200 hover-lift"><Library size={20}/></button>}
                            {(currentUserRole === 'student' || currentUserRole === 'vip-student') && <button onClick={() => setStudentSettingsModal(true)} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-slate-300 hover:text-vipGold bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-500 hover:text-brandPurple bg-white shadow-sm border border-slate-200'}`} title="Hesabım"><Settings size={20}/></button>}
                            <button onClick={handleLogout} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-rose-400 hover:text-rose-300 bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-slate-200'}`} title="Çıkış Yap"><LogOut size={20}/></button>
                        </div>
                    </div>
                    <div className="text-center max-w-lg mx-auto mt-2 opacity-80 hover:opacity-100 transition-opacity"><p className={`text-xs md:text-sm italic font-medium ${currentUserRole === 'vip-student' ? 'text-slate-400' : 'text-slate-500'}`}>"{dailyQuote.text}"</p></div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 mt-8 no-print relative z-10">
                <AnimatePresence mode="wait">
                    {isTeacherMode && view === 'home' && (
                        <TeacherDashboard 
                            regularClasses={regularClasses} vipClasses={vipClasses} 
                            onOpenClass={openClass} 
                            onNewClass={() => { setModalType('class'); setModalInputVal(''); }} 
                            onNewVipClass={() => { setModalType('vip'); setModalInputVal(''); }} 
                        />
                    )}

                    {isTeacherMode && view === 'class-detail' && selectedClass && (
                        <ClassDetail 
                            selectedClass={selectedClass} activeTab={activeTab} setActiveTab={setActiveTab} isMobile={isMobile}
                            newStudentName={newStudentName} setNewStudentName={setNewStudentName} addStudent={addStudent}
                            updateGrade={updateGrade} openCellNoteModal={openCellNoteModal} setModalData={setModalData}
                            setModalInputVal={setModalInputVal} setModalDateVal={setModalDateVal} setModalPdfVal={setModalPdfVal}
                            setModalType={setModalType} deleteStudent={deleteStudent} handlePrintStudentReport={()=>{}}
                            openStudent={openStudent} setActiveTopicMenu={setActiveTopicMenu} setActiveColMenu={setActiveColMenu}
                            setActiveCell={setActiveCell} deleteColumn={deleteColumn} updateClassInDb={updateClassInDb}
                            handleOpenRisk={()=>{}} handlePrintPasswords={()=>{}} deleteClass={deleteClass}
                            libraryItems={libraryItems.filter(i => i.type === LIBRARY_TYPES.CURRICULUM)}
                            saveToLibrary={async (topic) => {
                                if(!topic.title) return;
                                try { await addDoc(collection(db, LIBRARY_COLLECTION), { text: topic.title, type: LIBRARY_TYPES.CURRICULUM, subTopics: topic.subTopics ? topic.subTopics.map(st => ({ title: st.title })) : [] }); } 
                                catch (e) { console.error("Kütüphane kayıt hatası:", e); }
                            }}
                        />
                    )}

                    {!isTeacherMode && view === 'home' && (
                        <StudentDashboard classes={classes} currentUserRole={currentUserRole} onOpenClass={openClass} />
                    )}

                    {view === 'student-detail' && selectedClass && selectedStudentForView && (
                        <StudentDetail 
                            selectedStudentForView={selectedStudentForView} selectedClass={selectedClass} 
                            currentUserRole={currentUserRole} activeTab={activeTab} setActiveTab={setActiveTab} 
                            isTeacherMode={isTeacherMode} openCellNoteModal={openCellNoteModal} 
                            updateGrade={updateGrade} updateClassInDb={updateClassInDb} 
                        />
                    )}
                </AnimatePresence>
            </main>

            {showLibraryManager && (
                <LibraryModal 
                    libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} 
                    libraryInput={libraryInput} setLibraryInput={setLibraryInput} 
                    libraryDate={libraryDate} setLibraryDate={setLibraryDate} 
                    libraryItems={libraryItems} addLibraryItem={addLibraryItem} 
                    deleteLibraryItem={deleteLibraryItem} onClose={() => setShowLibraryManager(false)} 
                />
            )}

            {showAssistant && (
                <AssistantModal 
                    isListening={isListening} speechTranscript={speechTranscript} toggleListening={toggleListening}
                    assistantFoundStudents={assistantFoundStudents} assistantFoundTopics={assistantFoundTopics}
                    assistantSelectedStudent={assistantSelectedStudent} setAssistantSelectedStudent={setAssistantSelectedStudent}
                    assistantDraftGrades={assistantDraftGrades} assistantDraftNotes={assistantDraftNotes}
                    handleDraftGradeChange={handleDraftGradeChange} handleDraftNoteChange={handleDraftNoteChange}
                    applyAssistantDrafts={applyAssistantDrafts} onClose={() => setShowAssistant(false)} classes={classes}
                />
            )}

            {modalType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">
                            {modalType === 'class' ? 'Yeni Sınıf Oluştur' : modalType === 'vip' ? 'Yeni Özel Ders Oluştur' : modalType === 'topic' ? 'Yeni Ödev Ekle' : 'Düzenle'}
                        </h3>
                        <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold outline-none focus:border-brandPurple" placeholder="Başlık girin..." value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                        <div className="flex gap-2 justify-end mt-2">
                            <button onClick={() => setModalType(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button>
                            <button onClick={handleModalSubmit} className="px-4 py-2 bg-brandPurple text-white font-bold rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {isTeacherMode && (
                <button onClick={() => setShowAssistant(true)} className="fab-button bg-brandPurple text-white" title="Akıllı Asistan">
                    <div className="fab-pulse"></div><Mic size={28} />
                </button>
            )}

        </div>
    );
};

export default App;
