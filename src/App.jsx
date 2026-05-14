import React, { useState, useEffect, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, addDoc, query } from 'firebase/firestore';

import { 
    ChevronRight, ChevronLeft, CheckCircle, Plus, Trash2, Loader2, 
    MoreVertical, ArrowDownToLine, UserPlus, KeyRound, Megaphone, Edit3, Save, X, 
    Layout, AlertTriangle, GraduationCap, RefreshCw, Library,
    FileSpreadsheet, AlertOctagon, StickyNote, Calendar, Info, Pencil, User, LogOut, Printer, Settings,
    Mic, MicOff, Sparkles, Sparkle, Zap, Users, Crown, Briefcase 
} from 'lucide-react';

// Kendi oluşturduğumuz modüler dosyaları çağırıyoruz
import { auth, db } from './config/firebase';
import { CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN, LIBRARY_TYPES, MOTIVATIONAL_QUOTES, TOPIC_THEMES, STATUS_OPTIONS } from './utils/constants';
import { formatDate, generatePassword, generateUsername, generateId, isOverdue, calculateStats } from './utils/helpers';

import StatusBadge from './components/ui/StatusBadge';
import PdfDownloadButton from './components/ui/PdfButton';
import CountdownTimer from './components/ui/Countdown';
import MobileStudentCard from './components/student/MobileCard';

// Ekran boyutunu ölçen yardımcı hook'umuz
const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({ width: undefined, height: undefined });
    useEffect(() => {
        function handleResize() { setWindowSize({ width: window.innerWidth, height: window.innerHeight }); }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return windowSize;
};

const App = () => {
    const [user, setUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null); 
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [authView, setAuthView] = useState('selection'); 
    const [studentUsernameInput, setStudentUsernameInput] = useState("");
    const [studentPasswordInput, setStudentPasswordInput] = useState("");
    
    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [isTeacherMode, setIsTeacherMode] = useState(false);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN);
    
    const [announcement, setAnnouncement] = useState("");
    const [tempAnnouncement, setTempAnnouncement] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    
    const [view, setView] = useState('home');
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    
    const [pinInput, setPinInput] = useState("");
    const [newPin, setNewPin] = useState("");
    const [newStudentName, setNewStudentName] = useState("");
    const [libraryInput, setLibraryInput] = useState("");
    const [libraryCategory, setLibraryCategory] = useState(LIBRARY_TYPES.TOPIC);
    const [libraryDate, setLibraryDate] = useState("");
    
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState({}); 
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalDateVal, setModalDateVal] = useState("");
    const [modalPdfVal, setModalPdfVal] = useState(""); 
    
    const [printData, setPrintData] = useState(null);
    const [showChangePinModal, setShowChangePinModal] = useState(false);
    const [showLibraryManager, setShowLibraryManager] = useState(false); 
    const [showRiskModal, setShowRiskModal] = useState(false); 
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [studentNewPassword, setStudentNewPassword] = useState("");

    const [activeRiskClass, setActiveRiskClass] = useState(null); 
    const [activeCell, setActiveCell] = useState(null); 
    const [activeColMenu, setActiveColMenu] = useState(null); 
    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    
    const [noteInput, setNoteInput] = useState(""); 
    const [useNoteLibrary, setUseNoteLibrary] = useState(false);
    const [showCellNoteModal, setShowCellNoteModal] = useState(false);
    const [activeNoteCell, setActiveNoteCell] = useState(null);
    
    const [confirmModal, setConfirmModal] = useState(null);
    const [useLibrary, setUseLibrary] = useState(false); 
    const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);

    const { width } = useWindowSize();
    const isMobile = width < 768;

    const [isListening, setIsListening] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [showAssistantModal, setShowAssistantModal] = useState(false);
    const [assistantFoundStudents, setAssistantFoundStudents] = useState([]);
    const [assistantFoundTopics, setAssistantFoundTopics] = useState([]);
    const [assistantSelectedStudent, setAssistantSelectedStudent] = useState(null);
    const [assistantDraftGrades, setAssistantDraftGrades] = useState({});
    const [assistantDraftNotes, setAssistantDraftNotes] = useState({});
    
    const recognitionRef = useRef(null);

    const regularClasses = classes.filter(c => c.type !== 'vip');
    const vipClasses = classes.filter(c => c.type === 'vip');

    useEffect(() => { const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) { console.error(e); } }; initAuth(); setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]); return onAuthStateChanged(auth, (u) => u && setUser(u)); }, []);
    
    useEffect(() => {
        if (!user) return;
        const qClasses = query(collection(db, CLASSES_COLLECTION));
        const unsubClasses = onSnapshot(qClasses, (snap) => { 
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
            loaded.sort((a, b) => a.className.localeCompare(b.className)); 
            setClasses(prev => loaded.map(newC => { 
                const oldC = prev.find(p => p.id === newC.id); 
                if (newC.topics) { newC.topics.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); }
                return { ...newC, isOpen: oldC ? oldC.isOpen : false }; 
            })); 
            if (selectedClass) { const updatedSelected = loaded.find(c => c.id === selectedClass.id); if (updatedSelected) setSelectedClass(updatedSelected); }
            setLoading(false); 
        });
        const qLib = query(collection(db, LIBRARY_COLLECTION));
        const unsubLib = onSnapshot(qLib, (snap) => setLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>a.text.localeCompare(b.text))));
        const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
        const initSettings = async () => { const snap = await getDoc(settingsRef); if (!snap.exists()) { await setDoc(settingsRef, { pin: DEFAULT_PIN, announcement: "Hoşgeldiniz!" }); } };
        initSettings();
        const unsubSettings = onSnapshot(settingsRef, (snap) => { if (snap.exists()) { const d = snap.data(); if (d.pin !== undefined) setDbTeacherPin(String(d.pin).trim()); if (d.announcement !== undefined) setAnnouncement(d.announcement); } });
        return () => { unsubClasses(); unsubLib(); unsubSettings(); };
    }, [user, selectedClass?.id]);

    const toggleListening = () => {
        if (isListening) { if (recognitionRef.current) { recognitionRef.current.stop(); } setIsListening(false); return; }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome kullanın."); return; }

        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR'; recognition.interimResults = false; recognition.maxAlternatives = 1; recognitionRef.current = recognition;

        recognition.onstart = () => { 
            setIsListening(true); setSpeechTranscript("Sizi dinliyorum... (Örn: 'Ahmet Logaritma Acil VDD yapıldı')"); setShowAssistantModal(true); 
            let allStudents = []; let allTopicsMap = new Map(); 
            classes.forEach(cls => {
                const isVip = cls.type === 'vip'; 
                cls.students.forEach(std => { allStudents.push({ ...std, classId: cls.id, className: cls.className, isVip }); });
                cls.topics.forEach(topic => { if (!allTopicsMap.has(topic.title)) { allTopicsMap.set(topic.title, { ...topic, classId: cls.id }); } });
            });
            setAssistantFoundStudents(allStudents); setAssistantFoundTopics(Array.from(allTopicsMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
            setAssistantDraftGrades({}); setAssistantDraftNotes({}); setAssistantSelectedStudent(null); 
        };
        
        recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; setSpeechTranscript(transcript); processGlobalSearchCommand(transcript); };
        recognition.onerror = (event) => { console.error("Ses tanıma hatası:", event.error); setSpeechTranscript("Ses anlaşılamadı. Yeniden Dinle'ye tıklayın."); setIsListening(false); };
        recognition.onend = () => { setIsListening(false); };
        recognition.start();
    };

    // YENİ: ZEKİ KOMUT ALGISI (AUTO-GRADING NLP)
    const processGlobalSearchCommand = (text) => {
        const lowerText = text.toLowerCase().trim();
        let foundStudents = []; 
        let allTopicsMap = new Map();

        const statusKeywords = {
            'done': ['yapıldı', 'yaptı', 'tamamlandı', 'tamam', 'bitti', 'çözdü', 'çözülmüş', 'full'],
            'missing': ['eksik', 'yapmadı', 'yapılmadı', 'yarım', 'boş'],
            'exempt': ['muaf', 'gerek yok', 'yapmayacak', 'atlanacak'],
            'assigned': ['verildi', 'ödev verildi', 'çözecek']
        };

        let detectedStatus = null;
        for (const [status, keywords] of Object.entries(statusKeywords)) {
            if (keywords.some(kw => lowerText.includes(kw))) { detectedStatus = status; break; }
        }

        classes.forEach(cls => {
            const isVip = cls.type === 'vip'; 
            cls.students.forEach(student => {
                const studentNames = student.name.toLowerCase().split(' ').filter(n => n.trim().length > 0);
                let matchScore = 0;
                studentNames.forEach(namePart => { if (lowerText.includes(namePart)) matchScore += 1; });
                if (lowerText.includes("herkes") || lowerText.includes("tüm öğrenciler")) matchScore = 1;
                if (matchScore > 0) foundStudents.push({ ...student, classId: cls.id, className: cls.className, isVip, matchScore });
            });
            
            cls.topics.forEach(topic => {
                const topicWords = topic.title.toLowerCase().split(' ').filter(n => n.length > 2);
                let topicMatch = topicWords.some(word => lowerText.includes(word)) || lowerText.includes("hepsi") || lowerText.includes("ödev");
                
                let matchedColIds = [];
                topic.subColumns.forEach(col => {
                    const colWords = col.title.toLowerCase().split(' ').filter(n => n.length > 2);
                    if (colWords.some(word => lowerText.includes(word))) { matchedColIds.push(col.id); }
                });

                if (topicMatch || matchedColIds.length > 0) {
                     if (!allTopicsMap.has(topic.title)) {
                         allTopicsMap.set(topic.title, { ...topic, classId: cls.id, matchedColIds });
                     } else {
                         const existing = allTopicsMap.get(topic.title);
                         existing.matchedColIds = [...new Set([...existing.matchedColIds, ...matchedColIds])];
                     }
                }
            });
        });

        foundStudents.sort((a, b) => b.matchScore - a.matchScore);
        const bestStudentMatch = foundStudents.length > 0 ? foundStudents[0] : null;

        // EMİR İŞLEME (AUTO-GRADING)
        if (bestStudentMatch && detectedStatus) {
            let draftsToApply = { ...assistantDraftGrades }; 
            if (!draftsToApply[bestStudentMatch.id]) draftsToApply[bestStudentMatch.id] = {};
            const targetClassTopics = Array.from(allTopicsMap.values()).filter(t => t.classId === bestStudentMatch.classId);
            
            targetClassTopics.forEach(t => {
                if (t.matchedColIds && t.matchedColIds.length > 0) {
                    t.matchedColIds.forEach(colId => { draftsToApply[bestStudentMatch.id][colId] = detectedStatus; });
                } else {
                    t.subColumns.forEach(col => { draftsToApply[bestStudentMatch.id][col.id] = detectedStatus; });
                }
            });
            setAssistantDraftGrades(draftsToApply);
        }

        if (foundStudents.length > 0) { setAssistantFoundStudents(foundStudents); setAssistantSelectedStudent(bestStudentMatch); 
        } else { let allStudents = []; classes.forEach(cls => cls.students.forEach(std => allStudents.push({ ...std, classId: cls.id, className: cls.className, isVip: cls.type === 'vip' }))); setAssistantFoundStudents(allStudents); }

        if (allTopicsMap.size > 0) { let topicsArray = Array.from(allTopicsMap.values()); topicsArray.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); setAssistantFoundTopics(topicsArray); 
        } else { let allT = []; classes.forEach(cls => cls.topics.forEach(t => { if(!allT.some(xt => xt.title === t.title)) allT.push({...t, classId: cls.id}) })); allT.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); setAssistantFoundTopics(allT); }
    };

    const handleDraftGradeChange = (studentId, colId, status) => { setAssistantDraftGrades(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: status } })); };
    const handleDraftNoteChange = (studentId, colId, note) => { setAssistantDraftNotes(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [colId]: note } })); };

    const applyAssistantDrafts = () => {
        let hasChangesAnywhere = false;
        const allModifiedStudentIds = new Set([...Object.keys(assistantDraftGrades), ...Object.keys(assistantDraftNotes)]);
        if(allModifiedStudentIds.size === 0) return;

        const classesToUpdate = {}; 
        allModifiedStudentIds.forEach(studentId => {
             let studentClassId = null; let studentData = null; let studentIndexInClass = -1;
             for (const c of classes) { const idx = c.students.findIndex(s => s.id === studentId); if(idx > -1) { studentClassId = c.id; studentData = c.students[idx]; studentIndexInClass = idx; break; } }
             if(studentClassId && studentData) {
                 if(!classesToUpdate[studentClassId]) { classesToUpdate[studentClassId] = { ...classes.find(c => c.id === studentClassId) }; classesToUpdate[studentClassId].students = [...classesToUpdate[studentClassId].students]; }
                const newGrades = { ...studentData.grades }; const newNotes = { ...studentData.assignmentNotes };
                if (assistantDraftGrades[studentId]) { Object.keys(assistantDraftGrades[studentId]).forEach(colId => { newGrades[colId] = assistantDraftGrades[studentId][colId]; hasChangesAnywhere = true; }); }
                if (assistantDraftNotes[studentId]) { Object.keys(assistantDraftNotes[studentId]).forEach(colId => { const noteVal = assistantDraftNotes[studentId][colId]; if (noteVal.trim() === "") { delete newNotes[colId]; } else { newNotes[colId] = noteVal; } hasChangesAnywhere = true; }); }
                classesToUpdate[studentClassId].students[studentIndexInClass] = { ...studentData, grades: newGrades, assignmentNotes: newNotes };
             }
        });
        if (hasChangesAnywhere) { Object.values(classesToUpdate).forEach(updatedClass => { updateClassInDb(updatedClass); }); }
        setShowAssistantModal(false); setAssistantDraftGrades({}); setAssistantDraftNotes({});
    };

    const addClassToDb = async (newClass) => { await setDoc(doc(db, CLASSES_COLLECTION, String(newClass.id)), newClass); };
    const updateClassInDb = async (updatedClass) => { await setDoc(doc(db, CLASSES_COLLECTION, String(updatedClass.id)), updatedClass, { merge: true }); };
    const deleteClassFromDb = async (classId) => { await deleteDoc(doc(db, CLASSES_COLLECTION, String(classId))); };
    const addLibraryItem = async (text) => { if(!text || typeof text !== 'string' || !text.trim()) return; await addDoc(collection(db, LIBRARY_COLLECTION), { text: text.trim(), type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null }); setLibraryInput(""); setLibraryDate(""); };
    const deleteLibraryItem = async (id) => { await deleteDoc(doc(db, LIBRARY_COLLECTION, id)); };
    const saveAnnouncementFn = async () => { try { await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { announcement: tempAnnouncement }, { merge: true }); setIsEditingAnnouncement(false); } catch (e) { alert("Hata"); } };
    const updatePinFn = async () => { if (!newPin || String(newPin).length < 4) return alert("En az 4 karakter."); await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { pin: String(newPin).trim() }, { merge: true }); setShowChangePinModal(false); setNewPin(""); alert("Şifre değişti."); };
    
    const verifyPin = () => { if (String(pinInput).trim() === String(dbTeacherPin).trim()) { setIsTeacherMode(true); setCurrentUserRole('teacher'); setAuthView('selection'); setView('home'); setPinInput(""); } else { alert("Hatalı PIN!"); } };
    const handleStudentLogin = (isVipLogin = false) => {
        let foundStudent = null, foundClass = null; const classesToSearch = isVipLogin ? vipClasses : regularClasses;
        for (const cls of classesToSearch) { const std = cls.students?.find(s => s.username === studentUsernameInput.trim() && s.password === studentPasswordInput.trim()); if (std) { foundStudent = std; foundClass = cls; break; } }
        if (foundStudent) {
            setCurrentUserRole(isVipLogin ? 'vip-student' : 'student'); setLoggedInStudent(foundStudent); setSelectedClass(foundClass); setSelectedStudentForView(foundStudent); setView('student-detail'); setAuthView('selection'); setStudentUsernameInput(""); setStudentPasswordInput("");
            const updatedStudents = foundClass.students.map(s => s.id === foundStudent.id ? { ...s, lastLogin: new Date().toISOString() } : s);
            updateClassInDb({ ...foundClass, students: updatedStudents });
        } else { alert('Kullanıcı adı veya şifre hatalı!'); }
    };
    const handleLogout = () => { setCurrentUserRole(null); setLoggedInStudent(null); setIsTeacherMode(false); setView('home'); setSelectedClass(null); setSelectedStudentForView(null); };

    const updateStudentPassword = () => {
        if(studentNewPassword.length < 4) return alert("Şifre en az 4 karakter olmalıdır.");
        const cls = classes.find(c => c.id === selectedClass.id);
        if(cls && loggedInStudent) {
            const updatedStudents = cls.students.map(s => s.id === loggedInStudent.id ? { ...s, password: studentNewPassword } : s);
            updateClassInDb({ ...cls, students: updatedStudents }); setLoggedInStudent({ ...loggedInStudent, password: studentNewPassword }); setStudentSettingsModal(false); setStudentNewPassword(""); alert("Şifreniz başarıyla güncellendi!");
        }
    };

    const toggleClass = (id) => { setClasses(classes.map(c => c.id === id ? { ...c, isOpen: !c.isOpen } : c)); };
    const addStudent = (classId) => { if (!newStudentName.trim()) return; const cls = classes.find(c => c.id === classId); if (cls) { updateClassInDb({ ...cls, students: [...cls.students, { id: generateId('student'), name: newStudentName.trim(), username: generateUsername(newStudentName.trim()), password: generatePassword(), lastLogin: null, grades: {}, privateNotes: "" }] }); } setNewStudentName(""); };
    const deleteStudent = (e, classId, sId) => { e.stopPropagation(); setConfirmModal({ message: "Öğrenciyi silmek istediğine emin misin?", type: 'danger', onConfirm: () => { const cls = classes.find(c => c.id === classId); if (cls) updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== sId) }); setConfirmModal(null); } }); };
    const deleteClass = (e, id) => { e.stopPropagation(); setConfirmModal({ message: "Sınıfı/Dersi silmek istediğine emin misin?", type: 'danger', onConfirm: () => { deleteClassFromDb(id); if(selectedClass?.id === id) setView('home'); setConfirmModal(null); } }); };
    const updateGrade = (cId, sId, colId, status) => { const cls = classes.find(c => c.id === cId); if (cls) { const updatedStudents = cls.students.map(s => s.id === sId ? { ...s, grades: { ...s.grades, [colId]: status } } : s); updateClassInDb({ ...cls, students: updatedStudents }); } setActiveCell(null); };

    const handleModalSubmit = () => {
        if (!modalInputVal || !modalInputVal.trim()) return;
        if (modalType === 'class') { addClassToDb({ id: generateId('class'), className: modalInputVal, type: 'regular', topics: [], students: [] }); } 
        else if (modalType === 'vip') { addClassToDb({ id: generateId('vip'), className: modalInputVal, type: 'vip', topics: [], students: [] }); }
        else if (modalType === 'topic') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, topics: [{ id: generateId('topic'), title: modalInputVal, date: modalDateVal, subColumns: [] }, ...(cls.topics || [])] }); }
        else if (modalType === 'source') { 
            const cls = classes.find(c => c.id === modalData.classId); 
            if (cls) { 
                const newColId = generateId('col'); const updatedStudents = cls.students.map(std => ({ ...std, grades: { ...std.grades, [newColId]: 'assigned' } })); 
                const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [{ id: newColId, title: modalInputVal, pdfLink: modalPdfVal, subColumns: [] }, ...(t.subColumns || [])] } : t); 
                updateClassInDb({ ...cls, topics: updatedTopics, students: updatedStudents }); 
            } 
        }
        else if (modalType === 'edit-class') { const cls = classes.find(c => c.id === modalData.classId); if (cls) updateClassInDb({ ...cls, className: modalInputVal }); }
        else if (modalType === 'edit-student') { const cls = classes.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, students: cls.students.map(s => s.id === modalData.studentId ? { ...s, name: modalInputVal } : s) }); } }
        else if (modalType === 'edit-topic') { const cls = classes.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t) }); } }
        else if (modalType === 'edit-date') { const cls = classes.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => t.id === modalData.topicId ? { ...t, date: modalDateVal } : t) }); } }
        else if (modalType === 'edit-source') { const cls = classes.find(c => c.id === modalData.classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => { if (t.id === modalData.topicId) { return { ...t, subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal, pdfLink: modalPdfVal } : c) }; } return t; }) }); } }
        closeModal();
    };
    const closeModal = () => { setModalType(null); setModalData({}); setModalInputVal(""); setModalDateVal(""); setModalPdfVal(""); setUseLibrary(false); };
    
    const handleTopicBulkAction = (action, classId, topicId) => { setActiveTopicMenu(null); if (!isTeacherMode) return; const cls = classes.find(c => c.id === classId); if (!cls) return; if (action === 'delete') { setConfirmModal({ message: "Ödevi silmek?", type: 'danger', onConfirm: () => { updateClassInDb({ ...cls, topics: cls.topics.filter(t => t.id !== topicId) }); setConfirmModal(null); } }); return; } const topic = cls.topics.find(t => t.id === topicId); if (!topic?.subColumns?.length) { alert("Kaynak bulunamadı!"); return; } setConfirmModal({ message: `Tüm kaynaklar güncellenecek.`, type: 'info', onConfirm: () => { const targetColIds = topic.subColumns.map(sc => sc.id); const updatedStudents = cls.students.map(std => { const newGrades = { ...std.grades }; targetColIds.forEach(colId => newGrades[colId] = action); return { ...std, grades: newGrades }; }); updateClassInDb({ ...cls, students: updatedStudents }); setConfirmModal(null); } }); };
    const deleteColumn = (classId, topicId, colId) => { setActiveColMenu(null); setConfirmModal({ message: "Kaynağı silmek?", type: 'danger', onConfirm: () => { const cls = classes.find(c => c.id === classId); if (cls) { updateClassInDb({ ...cls, topics: cls.topics.map(t => { if (t.id !== topicId) return t; return { ...t, subColumns: t.subColumns.filter(c => c.id !== colId) }; }) }); } setConfirmModal(null); } }); };
    
    const openCellNoteModal = (classId, studentId, colId, currentNote) => { setNoteInput(currentNote || ""); setActiveNoteCell({ classId, studentId, colId }); setShowCellNoteModal(true); };
    const saveCellNote = () => { if (!activeNoteCell) return; const { classId, studentId, colId } = activeNoteCell; const cls = classes.find(c => c.id === classId); if (cls) { const updatedStudents = cls.students.map(s => { if (s.id === studentId) { const newNotes = { ...s.assignmentNotes, [colId]: noteInput }; if (!noteInput.trim()) delete newNotes[colId]; return { ...s, assignmentNotes: newNotes }; } return s; }); updateClassInDb({ ...cls, students: updatedStudents }); } setShowCellNoteModal(false); setActiveNoteCell(null); setNoteInput(""); };
    const deleteCellNote = () => { if (!activeNoteCell) return; const { classId, studentId, colId } = activeNoteCell; const cls = classes.find(c => c.id === classId); if (cls) { const updatedStudents = cls.students.map(s => { if (s.id === studentId) { const newNotes = { ...s.assignmentNotes }; delete newNotes[colId]; return { ...s, assignmentNotes: newNotes }; } return s; }); updateClassInDb({ ...cls, students: updatedStudents }); } setShowCellNoteModal(false); setActiveNoteCell(null); setNoteInput(""); };
    const downloadReport = (cls) => { let csvContent = "data:text/csv;charset=utf-8,Öğrenci Adı,Kullanıcı Adı,Şifre," + cls.topics.flatMap(t => t.subColumns.map(c => `${t.title} - ${c.title}`)).join(",") + "\n"; cls.students.forEach(std => { const row = [std.name, std.username, std.password]; cls.topics.forEach(t => { t.subColumns.forEach(c => { const status = std.grades?.[c.id]; const label = STATUS_OPTIONS.find(o => o.id === status)?.label || "Muaf"; const note = std.assignmentNotes?.[c.id] ? ` (${std.assignmentNotes[c.id]})` : ""; row.push(label + note); }); }); csvContent += row.join(",") + "\n"; }); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${cls.className}_Rapor.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    
    const goHome = () => { setView('home'); setSelectedClass(null); setSelectedStudentForView(null); };
    const openClass = (cls) => { setSelectedClass(cls); setView('class-detail'); };
    const openStudent = (std) => { setSelectedStudentForView(std); setView('student-detail'); };
    const handleOpenRisk = (cls) => { setActiveRiskClass(cls); setShowRiskModal(true); };

    const handlePrintPasswords = (cls) => { setPrintData({ type: 'passwords', classData: cls }); setTimeout(() => window.print(), 300); };
    const handlePrintStudentReport = (cls, student) => { setPrintData({ type: 'report', classData: cls, studentData: student }); setTimeout(() => window.print(), 300); };

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-indigo-600"><Loader2 className="animate-spin" size={48}/></div>;

    if (!currentUserRole) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-amber-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-4000"></div>

                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] w-full max-w-md relative z-10 modal-anim">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-glow rotate-3 hover:rotate-0 transition-transform"><GraduationCap size={40} className="text-white" /></div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">BERKANT HOCA</h1>
                        <p className="text-slate-400 text-xs font-bold tracking-[0.4em] uppercase">Eğitim Platformu</p>
                    </div>
                    
                    {authView === 'selection' && (
                        <div className="space-y-4">
                            <button onClick={() => setAuthView('student-login')} className="w-full group relative overflow-hidden rounded-2xl p-5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-5 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1">
                                <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/40 transition-colors"><User size={24}/></div>
                                <div className="text-left"><h3 className="text-white font-bold text-lg tracking-wide">Öğrenci Girişi</h3><p className="text-slate-400 text-xs mt-0.5">Sınıf öğrencileri için</p></div>
                                <ChevronRight className="ml-auto text-slate-500 group-hover:text-white transition-colors" size={20}/>
                            </button>
                            <button onClick={() => setAuthView('vip-login')} className="w-full group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/30 hover:border-amber-400/50 transition-all flex items-center gap-5 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1">
                                <div className="vip-stardust-bg absolute inset-0 z-0"></div>
                                <div className="bg-amber-500/20 p-3 rounded-xl text-amber-400 group-hover:text-amber-300 group-hover:bg-amber-500/40 transition-colors relative z-10"><Crown size={24}/></div>
                                <div className="text-left relative z-10"><h3 className="text-amber-50 font-bold text-lg tracking-wide flex items-center gap-2">Özel Ders <Sparkles size={14} className="text-amber-400"/></h3><p className="text-amber-200/50 text-xs mt-0.5">Özel ders öğrenci girişi</p></div>
                                <ChevronRight className="ml-auto text-amber-500/50 group-hover:text-amber-400 transition-colors relative z-10" size={20}/>
                            </button>
                            <button onClick={() => setAuthView('teacher-login')} className="w-full group relative overflow-hidden rounded-2xl p-5 bg-white/5 border border-slate-600/30 hover:bg-slate-800/50 transition-all flex items-center gap-5 hover:shadow-lg hover:shadow-slate-500/20 hover:-translate-y-1 mt-8">
                                <div className="bg-slate-700 p-3 rounded-xl text-slate-300 group-hover:text-white group-hover:bg-slate-600 transition-colors"><Briefcase size={24}/></div>
                                <div className="text-left"><h3 className="text-slate-200 font-bold text-lg tracking-wide">Yönetici Girişi 👔</h3></div>
                                <ChevronRight className="ml-auto text-slate-500 group-hover:text-white transition-colors" size={20}/>
                            </button>
                        </div>
                    )}
                    
                    {(authView === 'student-login' || authView === 'vip-login') && (
                        <div className="space-y-5 modal-anim">
                            <button onClick={() => setAuthView('selection')} className={`hover:text-white text-sm font-bold flex items-center gap-1 mb-4 transition-colors ${authView === 'vip-login' ? 'text-amber-400' : 'text-indigo-400'}`}><ChevronLeft size={18}/> Geri Dön</button>
                            {authView === 'vip-login' && <div className="text-center mb-6"><Crown size={32} className="text-amber-400 mx-auto mb-2 animate-bounce-slight"/><h2 className="text-xl font-black vip-text-gradient">ÖZEL DERS GİRİŞİ</h2></div>}
                            <div><label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1">Kullanıcı Adı</label><input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all font-medium" placeholder="örn: ahmet.yilmaz.123" value={studentUsernameInput} onChange={e => setStudentUsernameInput(e.target.value)} /></div>
                            <div><label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1">Şifre</label><input type="password" className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all font-medium tracking-widest" placeholder="••••••" value={studentPasswordInput} onChange={e => setStudentPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStudentLogin(authView === 'vip-login')} /></div>
                            <button onClick={() => handleStudentLogin(authView === 'vip-login')} className={`w-full py-4 text-white rounded-2xl font-black mt-6 shadow-xl transition-all text-lg tracking-wide hover:-translate-y-1 ${authView === 'vip-login' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'}`}>GİRİŞ YAP</button>
                        </div>
                    )}
                    
                    {authView === 'teacher-login' && (
                        <div className="space-y-5 modal-anim">
                            <button onClick={() => setAuthView('selection')} className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-1 mb-6 transition-colors"><ChevronLeft size={18}/> Geri Dön</button>
                            <div><label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 block text-center">Yönetici PIN Kodu 🔐</label><input type="password" autoFocus className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:border-slate-400 focus:bg-slate-800 outline-none transition-all text-center text-4xl tracking-[0.5em] font-black" placeholder="••••" value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && verifyPin()} /></div>
                            <button onClick={verifyPin} className="w-full py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-2xl font-black mt-6 shadow-xl shadow-white/10 transition-all text-lg tracking-wide hover:-translate-y-1">SİSTEME GİR</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen pb-32 relative ${currentUserRole === 'vip-student' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
            {currentUserRole === 'vip-student' && <div className="fixed inset-0 vip-stardust-bg pointer-events-none"></div>}

            <header className={`no-print relative z-20 ${currentUserRole === 'vip-student' ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-200'}`}>
                 <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        {currentUserRole !== 'student' && currentUserRole !== 'vip-student' && view !== 'home' ? (
                            <button onClick={() => view === 'student-detail' ? setView('class-detail') : goHome()} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700 transition-colors"><ChevronLeft size={24} /></button>
                        ) : <div className="w-10"></div>}
                        <div className="text-center">
                            <h1 className={`text-xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-2 ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>
                                <div className={`p-1.5 rounded-lg ${currentUserRole === 'vip-student' ? 'bg-amber-500' : 'bg-indigo-600'}`}><GraduationCap className="text-white" size={24} /></div> 
                                BERKANT HOCA
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {isTeacherMode && <button onClick={() => setShowLibraryManager(true)} className="p-2 text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-full transition-colors shadow-sm border border-slate-200"><Library size={20}/></button>}
                            {(currentUserRole === 'student' || currentUserRole === 'vip-student') && <button onClick={() => setStudentSettingsModal(true)} className={`p-2 rounded-full transition-colors ${currentUserRole === 'vip-student' ? 'text-slate-300 hover:text-amber-400 bg-slate-800' : 'text-slate-500 hover:text-indigo-600 bg-white shadow-sm border border-slate-200'}`} title="Hesabım"><Settings size={20}/></button>}
                            <button onClick={handleLogout} className={`p-2 rounded-full transition-colors ${currentUserRole === 'vip-student' ? 'text-rose-400 hover:text-rose-300 bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-slate-200'}`} title="Çıkış Yap"><LogOut size={20}/></button>
                        </div>
                    </div>
                    <div className="text-center max-w-lg mx-auto mt-2 opacity-80 hover:opacity-100 transition-opacity"><p className={`text-xs md:text-sm italic font-medium ${currentUserRole === 'vip-student' ? 'text-slate-400' : 'text-slate-600'}`}>"{dailyQuote.text}"</p></div>
                </div>
            </header>
            
            {currentUserRole !== 'vip-student' && <div className="no-print"><CountdownTimer /></div>}
            
            {announcement && currentUserRole !== 'vip-student' && (
                <div className="max-w-7xl mx-auto px-4 mt-6 no-print">
                    <div className="bg-white rounded-3xl p-1 shadow-soft border border-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                        <div className="bg-white p-4 md:p-6 rounded-2xl flex items-start gap-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-xl text-white shadow-lg shadow-indigo-200 shrink-0"><Megaphone size={24}/></div>
                            <div className="flex-1">
                                <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wide">Genel Duyuru</h3>
                                {isEditingAnnouncement ? (
                                    <div className="mt-2 animate-scale-in"><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-indigo-500 outline-none resize-none shadow-inner" rows={3} value={tempAnnouncement} onChange={(e) => setTempAnnouncement(e.target.value)}/><div className="flex justify-end gap-2 mt-3"><button onClick={() => setIsEditingAnnouncement(false)} className="text-xs px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-bold transition-colors">İptal</button><button onClick={saveAnnouncementFn} className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold shadow-md transition-colors">Kaydet</button></div></div>
                                ) : ( <p className="text-sm md:text-base text-slate-600 whitespace-pre-wrap leading-relaxed">{announcement}</p> )}
                            </div>
                            {isTeacherMode && !isEditingAnnouncement && <button onClick={() => { setTempAnnouncement(announcement); setIsEditingAnnouncement(true); }} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"><Edit3 size={18}/></button>}
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 mt-8 no-print relative z-10">
                {isTeacherMode && view === 'home' && (
                    <div className="flex flex-col gap-10">
                        <div>
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6"><h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2"><Users className="text-indigo-600"/> Sınıf Yönetimi</h2><button onClick={() => { setModalType('class'); setModalInputVal(''); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-transform hover:-translate-y-0.5"><Plus size={18}/> Yeni Sınıf</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {regularClasses.map((cls) => ( 
                                    <div key={cls.id} onClick={() => { setSelectedClass(cls); setView('class-detail'); }} className="neon-card-wrapper cursor-pointer group bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"><Users size={32}/></div><h2 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-700 transition-colors">{cls.className}</h2><p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Sınıfa Gir</p></div> 
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl shadow-sm border border-amber-200 mb-6"><h2 className="text-lg md:text-xl font-black text-amber-900 flex items-center gap-2"><Crown className="text-amber-500"/> Özel Ders Yönetimi</h2><button onClick={() => { setModalType('vip'); setModalInputVal(''); }} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-200 flex items-center gap-2 transition-transform hover:-translate-y-0.5"><Plus size={18}/> Yeni Özel Ders</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {vipClasses.map((cls) => ( 
                                    <div key={cls.id} onClick={() => { setSelectedClass(cls); setView('class-detail'); }} className="neon-card-wrapper cursor-pointer group bg-white rounded-3xl p-6 shadow-soft border border-amber-200 flex flex-col items-center justify-center text-center relative overflow-hidden"><div className="absolute inset-0 vip-stardust-bg opacity-30 pointer-events-none"></div><div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 relative z-10"><Crown size={32}/></div><h2 className="text-2xl font-black text-amber-700 tracking-tight group-hover:text-amber-800 transition-colors relative z-10">{cls.className}</h2><p className="text-xs text-amber-600 mt-2 font-bold uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full relative z-10">Giriş Yap</p></div> 
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {isTeacherMode && view === 'class-detail' && selectedClass && (
                    <div className="bg-white rounded-[2rem] shadow-soft border border-slate-200 overflow-hidden transition-all duration-300 animate-scale-in">
                        <div className={`p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${selectedClass.type === 'vip' ? 'bg-gradient-to-r from-amber-50 to-white' : 'bg-gradient-to-r from-slate-50 to-white'}`}>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`p-3 rounded-xl ${selectedClass.type === 'vip' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'} shadow-inner`}><Layout size={24}/></div>
                                <div>
                                    <h3 className={`text-xl md:text-2xl font-black flex items-center gap-2 ${selectedClass.type === 'vip' ? 'text-amber-700' : 'text-slate-800'}`}>{selectedClass.type === 'vip' && <Crown size={20} className="text-amber-500"/>}{selectedClass.className} <button onClick={(e) => { e.stopPropagation(); setModalData({ classId: selectedClass.id, currentName: selectedClass.className }); setModalInputVal(selectedClass.className); setModalType('edit-class'); }} className={`p-1.5 rounded-lg transition-colors ${selectedClass.type === 'vip' ? 'text-amber-400 hover:text-amber-600 hover:bg-amber-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}><Pencil size={16} /></button></h3>
                                    <div className="text-xs text-slate-500 font-medium mt-1">{selectedClass.students?.length || 0} Öğrenci • {selectedClass.topics?.length || 0} Görev</div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm mr-2"><div className={`w-8 h-8 rounded-full border-4 ${selectedClass.type === 'vip' ? 'border-amber-100' : 'border-indigo-100'} flex items-center justify-center relative`}><svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 36 36"><path className={selectedClass.type === 'vip' ? "text-amber-500" : "text-indigo-600"} strokeDasharray={`${calculateStats(selectedClass.students, selectedClass.topics).percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" /></svg></div><div className="flex flex-col"><span className="text-xs font-black text-slate-800">%{calculateStats(selectedClass.students, selectedClass.topics).percentage}</span><span className="text-[9px] font-bold text-slate-400 uppercase">Başarı</span></div></div>
                                {!selectedClass.type === 'vip' && <button onClick={() => handleOpenRisk(selectedClass)} className="text-xs bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors"><AlertOctagon size={14}/> Risk</button>}
                                <button onClick={() => downloadReport(selectedClass)} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors"><FileSpreadsheet size={14}/> Excel</button>
                                <button onClick={() => handlePrintPasswords(selectedClass)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1 transition-colors"><KeyRound size={14}/> Şifreler</button>
                                <button onClick={() => { setModalData({ classId: selectedClass.id }); setModalType('topic'); }} className={`text-xs text-white px-4 py-2 rounded-xl font-bold shadow-md flex items-center gap-1 transition-transform hover:-translate-y-0.5 ${selectedClass.type === 'vip' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}><Plus size={14}/> Ödev Ekle</button>
                                <button onClick={(e) => deleteClass(e, selectedClass.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        <div className={`p-4 ${selectedClass.type === 'vip' ? 'bg-amber-50/30' : 'bg-slate-50/50'}`}>
                            {isMobile ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-2"><input type="text" placeholder="Yeni Öğrenci Ekle..." className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 w-full focus:border-indigo-500 outline-none font-medium" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addStudent(selectedClass.id); }} /><button onClick={() => addStudent(selectedClass.id)} className={`text-white px-4 rounded-xl text-sm font-bold shadow-md ${selectedClass.type === 'vip' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>EKLE</button></div>
                                    {selectedClass.students?.map((std) => ( <MobileStudentCard key={std.id} student={std} cls={selectedClass} updateGrade={updateGrade} onOpenNote={openCellNoteModal} onEditStudent={(s) => { setModalData({ classId: selectedClass.id, studentId: s.id, currentName: s.name }); setModalInputVal(s.name); setModalType('edit-student'); }} onDeleteStudent={deleteStudent} onPrintReport={handlePrintStudentReport} /> ))}
                                </div>
                            ) : (
                            <div className="table-container">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th rowSpan={2} className="sticky-corner border-b border-r border-slate-200 min-w-[250px] shadow-sm p-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-white">Öğrenci Listesi</th>
                                            {selectedClass.topics?.map((topic, i) => {
                                                const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                return ( 
                                                    <th key={topic.id} colSpan={Math.max(1, (topic.subColumns?.length || 0) + 1)} className={`text-center p-3 border-b border-r border-slate-200 sticky-header-top ${theme.main} min-w-[280px]`}>
                                                        <div className="flex flex-col justify-center items-center gap-1.5">
                                                            {topic.date && ( <div className="text-[10px] bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-slate-600 font-bold flex items-center gap-1 cursor-pointer hover:bg-white shadow-sm border border-white/50 mb-1 transition-colors" onContextMenu={(e) => { e.preventDefault(); setModalData({ classId: selectedClass.id, topicId: topic.id }); setModalDateVal(topic.date); setModalType('edit-date'); }}><Calendar size={12}/> Son Teslim: <span className={theme.text}>{formatDate(topic.date)}</span></div> )}
                                                            <div className={`flex items-center gap-2 text-sm font-black uppercase tracking-wider mt-1`}>{topic.title}<button onClick={(e) => { e.stopPropagation(); setActiveTopicMenu({ classId: selectedClass.id, topicId: topic.id, anchorEl: e.currentTarget }); }} className="p-1 rounded-md hover:bg-black/5 transition-colors"><MoreVertical size={16}/></button></div>
                                                        </div>
                                                    </th> 
                                                );
                                            })}
                                        </tr>
                                        <tr>
                                            {selectedClass.topics?.map((topic, i) => {
                                                const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                return ( 
                                                    <React.Fragment key={topic.id}>
                                                        <th className={`p-0 border-b border-r border-slate-200 w-16 text-center sticky-header-sub ${theme.sub}`}><button onClick={() => { setModalData({ classId: selectedClass.id, topicId: topic.id }); setModalType('source'); }} className={`w-full h-full flex items-center justify-center transition-colors ${theme.btn} bg-white/30 hover:bg-white`} title="Kaynak Ekle"><Plus size={20}/></button></th>
                                                        {topic.subColumns?.map(col => ( 
                                                            <th key={col.id} className={`p-3 border-b border-r border-slate-200 sticky-header-sub ${theme.sub} min-w-[150px] align-top`}>
                                                                <div className="flex flex-col items-center justify-between h-full min-h-[50px]">
                                                                    <span className="font-bold text-xs text-slate-700 whitespace-normal text-center leading-tight mb-2 break-words max-w-[140px]">{col.title}</span>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {col.pdfLink && <PdfDownloadButton link={col.pdfLink} isTeacher={true} />}
                                                                        <button onClick={(e) => { e.stopPropagation(); setActiveColMenu({ classId: selectedClass.id, topicId: topic.id, colId: col.id, anchorEl: e.currentTarget }); }} className="text-slate-400 hover:text-indigo-600 bg-white/50 p-1.5 rounded-full shadow-sm transition-colors"><MoreVertical size={14}/></button>
                                                                    </div>
                                                                </div>
                                                            </th> 
                                                        ))} 
                                                    </React.Fragment> 
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedClass.students?.map((std) => (
                                            <tr key={std.id} className="border-b border-slate-100 bg-white">
                                                <td className="sticky-col-left p-4 border-r border-slate-200">
                                                    <div className="flex justify-between items-center group">
                                                        <div className="flex flex-col gap-1 cursor-pointer" onClick={() => openStudent(std)}>
                                                            <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full ${selectedClass.type === 'vip' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'} flex items-center justify-center font-black text-xs`}>{std.name.charAt(0)}</div><span className={`text-sm font-bold text-slate-700 group-hover:${selectedClass.type === 'vip' ? 'text-amber-600' : 'text-indigo-600'} transition-colors`}>{std.name}</span><button onClick={(e) => { e.stopPropagation(); setModalData({ classId: selectedClass.id, studentId: std.id, currentName: std.name }); setModalInputVal(std.name); setModalType('edit-student'); }} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button></div>
                                                            {std.username && ( <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-1 ml-11" onClick={e=>e.stopPropagation()}><span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{std.username}</span><span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><KeyRound size={10}/> {std.password}</span></div> )}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); handlePrintStudentReport(selectedClass, std); }} className={`p-2 rounded-lg transition-colors ${selectedClass.type === 'vip' ? 'bg-amber-50 text-amber-500 hover:text-amber-700 hover:bg-amber-100' : 'bg-indigo-50 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100'}`} title="Rapor Yazdır"><Printer size={16}/></button><button onClick={(e) => deleteStudent(e, selectedClass.id, std.id)} className="bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button></div>
                                                    </div>
                                                </td>
                                                {selectedClass.topics?.map((topic, i) => {
                                                    const theme = TOPIC_THEMES[i % TOPIC_THEMES.length];
                                                    return ( 
                                                        <React.Fragment key={topic.id}>
                                                            <td className={`border-r border-slate-100 ${theme.cell}`}></td>
                                                            {topic.subColumns?.map(col => ( 
                                                                <td key={col.id} className={`p-2 border-r border-slate-100 text-center ${theme.cell}`} onContextMenu={(e) => { e.preventDefault(); openCellNoteModal(selectedClass.id, std.id, col.id, std.assignmentNotes?.[col.id]); }}>
                                                                    <div onClick={(e) => { e.stopPropagation(); setActiveCell({ classId: selectedClass.id, studentId: std.id, colId: col.id, anchorEl: e.currentTarget }); }} className="cursor-pointer transition-transform hover:scale-105"><StatusBadge status={std.grades?.[col.id] || 'exempt'} hasNote={!!std.assignmentNotes?.[col.id]} /></div>
                                                                </td> 
                                                            ))}
                                                        </React.Fragment> 
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        <tr>
                                            <td className="sticky-col-left p-4 border-r border-slate-200 border-t border-slate-200 bg-slate-50">
                                                <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0"><UserPlus size={16}/></div><input type="text" placeholder="Yeni Öğrenci Ekle..." className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-700 w-full focus:border-indigo-500 outline-none font-medium shadow-sm" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') addStudent(selectedClass.id); }} /><button onClick={() => addStudent(selectedClass.id)} className={`text-white px-3 rounded-xl text-xs font-bold shadow-md transition-colors ${selectedClass.type === 'vip' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>EKLE</button></div>
                                            </td>
                                            {selectedClass.topics?.map((t, i) => <td key={i} colSpan={Math.max(1, t.subColumns.length + 1)} className="border-t border-slate-200 bg-slate-50/50"></td>)}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    </div>
                )}

                {!isTeacherMode && view === 'home' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.map((cls) => ( 
                            <div key={cls.id} onClick={() => openClass(cls)} className="neon-card-wrapper cursor-pointer group bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"><Users size={32}/></div><h2 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-700 transition-colors">{cls.className}</h2><p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Sınıfa Gir</p></div> 
                        ))}
                    </div> 
                )}

                {view === 'student-detail' && selectedClass && selectedStudentForView && (
                    <div className={`${currentUserRole === 'vip-student' ? 'bg-slate-800/80 backdrop-blur-xl border-slate-700 vip-card-glow' : 'bg-white border-slate-100 shadow-2xl'} rounded-[2.5rem] p-4 md:p-10 border animate-scale-in`}>
                        <div className={`flex flex-col md:flex-row items-center md:items-start gap-6 mb-10 pb-8 border-b ${currentUserRole === 'vip-student' ? 'border-slate-700' : 'border-slate-100'} text-center md:text-left`}>
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black shadow-xl shrink-0 border-4 ${currentUserRole === 'vip-student' ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-slate-900 border-amber-300 shadow-amber-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white shadow-indigo-200'}`}>{selectedStudentForView.name.charAt(0)}</div>
                            <div>
                                <h2 className={`text-3xl md:text-5xl font-black mb-2 tracking-tight flex items-center justify-center md:justify-start gap-3 ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-800'}`}>{selectedStudentForView.name}{currentUserRole === 'vip-student' && <Sparkle className="text-amber-400 animate-pulse"/>}</h2>
                                <div className="flex items-center justify-center md:justify-start gap-3"><span className={`font-bold px-3 py-1 rounded-lg ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-amber-400' : 'bg-slate-100 text-slate-500'}`}>{selectedClass.className}</span><span className={`font-black px-3 py-1 rounded-lg border ${currentUserRole === 'vip-student' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>%{calculateStats([selectedStudentForView], selectedClass.topics).percentage} Genel Başarı</span></div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            {selectedClass.topics?.map((topic, i) => {
                                const theme = currentUserRole === 'vip-student' ? { tag: 'bg-amber-500', text: 'text-amber-400' } : TOPIC_THEMES[i % TOPIC_THEMES.length]; 
                                const topicStats = calculateStats([selectedStudentForView], [{...topic, subColumns: topic.subColumns}]);
                                const pct = topicStats.percentage || 0; const isLate = isOverdue(topic.date);
                                return (
                                    <div key={topic.id} className={`${currentUserRole === 'vip-student' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-3xl p-4 md:p-6 border`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                            <div className="flex items-center gap-3"><div className={`w-2 h-8 rounded-full ${theme.tag}`}></div><h3 className={`text-xl font-black uppercase tracking-wide ${currentUserRole === 'vip-student' ? 'text-amber-400' : 'text-slate-800'}`}>{topic.title}</h3></div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {topic.date && ( <div className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm border ${isLate && pct < 100 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : (currentUserRole === 'vip-student' ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-white text-slate-500 border-slate-200')}`}><Calendar size={14}/> Son Teslim: {formatDate(topic.date)}</div> )}
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}><div className={`w-16 h-2 rounded-full overflow-hidden ${currentUserRole === 'vip-student' ? 'bg-slate-700' : 'bg-slate-100'}`}><div className={`h-full ${theme.tag}`} style={{ width: `${pct}%` }}></div></div><span className={`text-xs font-black ${currentUserRole === 'vip-student' ? 'text-white' : 'text-slate-700'}`}>%{pct}</span></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {topic.subColumns?.map(col => {
                                                const status = selectedStudentForView.grades?.[col.id] || 'exempt'; const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3]; const StatusIcon = statusData.icon; const note = selectedStudentForView.assignmentNotes?.[col.id]; const isMissed = isLate && status !== 'done' && status !== 'exempt';
                                                const cardStyle = currentUserRole === 'vip-student' ? `bg-slate-800 border-slate-600 ${isMissed ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}` : `bg-white border-slate-100 ${isMissed ? 'border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`;
                                                const titleStyle = currentUserRole === 'vip-student' ? 'text-slate-200' : 'text-slate-800';
                                                return (
                                                    <div key={col.id} className={`border-2 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:shadow-lg transition-all duration-300 group ${cardStyle}`}>
                                                        <div className="flex justify-between items-start">
                                                            <div><span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 ${currentUserRole === 'vip-student' ? 'text-slate-400' : 'text-slate-400'}`}><div className={`w-2 h-2 rounded-full ${theme.tag}`}></div> KAYNAK</span><span className={`text-lg font-bold leading-tight ${titleStyle}`}>{col.title}</span></div>
                                                            {isTeacherMode && <button onClick={() => openCellNoteModal(selectedClass.id, selectedStudentForView.id, col.id, selectedStudentForView.assignmentNotes?.[col.id] || "")} className={`p-1.5 rounded-md transition-colors ${note ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`} title="Öğretmen Notu"><StickyNote size={14} /></button>}
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            {isTeacherMode ? (
                                                                <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1.5 rounded-xl">{STATUS_OPTIONS.map(opt => ( <button key={opt.id} onClick={() => updateGrade(selectedClass.id, selectedStudentForView.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${status === opt.id ? `${opt.bg} ${opt.color} shadow-sm border ${opt.border} scale-105` : 'text-slate-400 hover:bg-white'}`}><opt.icon size={16} className="mb-1" strokeWidth={2.5}/><span className="text-[9px] font-bold">{opt.label}</span></button> ))}</div>
                                                            ) : ( <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${statusData.bg} ${statusData.border} ${statusData.color}`}><StatusIcon size={20} strokeWidth={2.5} /><span className="text-sm font-black uppercase tracking-widest">{statusData.label}</span></div> )}
                                                            {note && ( <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex gap-2 items-start text-xs text-amber-900 shadow-inner"><Info size={16} className="mt-0.5 shrink-0 text-amber-500"/> <span className="font-medium leading-relaxed">{note}</span></div> )}
                                                            {col.pdfLink && <PdfDownloadButton link={col.pdfLink} isVip={currentUserRole === 'vip-student'} isTeacher={false} />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {topic.subColumns?.length === 0 && <div className="text-xs text-slate-400 text-center p-2">Bu konuya ait kaynak yok.</div>}
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedClass.topics?.length === 0 && <div className="text-center text-slate-500 py-10 font-medium">Bu sınıfa henüz ödev eklenmemiş.</div>}
                        </div>
                    </div>
                )}
            </main>

            {isTeacherMode && (
                <div className="fab-button bg-gradient-to-r from-indigo-600 to-purple-600" onClick={toggleListening} title="Akıllı Asistanı Başlat">
                    {isListening && <div className="fab-pulse"></div>}
                    <Mic size={32} className={`text-white ${isListening ? 'animate-pulse' : ''}`} />
                </div>
            )}

            {/* MODALLAR */}
            {showAssistantModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 md:p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden modal-anim shadow-2xl flex flex-col max-h-[95vh] border border-slate-200">
                        <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50"><div className="flex items-center gap-3"><div className="bg-white p-2 rounded-xl shadow-sm"><Zap className="text-indigo-600" size={24}/></div><div><h3 className="font-black text-lg md:text-xl text-slate-800 tracking-tight">Akıllı İşlem Asistanı</h3><p className="text-xs text-slate-500 font-medium">Tüm sınıflarda ve Özel Derslerde arama yapar</p></div></div><button onClick={() => { setShowAssistantModal(false); if(recognitionRef.current) recognitionRef.current.stop(); setIsListening(false); }} className="bg-white p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"><X size={20}/></button></div>
                        <div className="p-4 bg-white border-b border-slate-100 flex flex-col items-center justify-center min-h-[100px] relative">
                            {isListening ? (
                                <div className="flex flex-col items-center gap-3"><div className="flex items-center gap-1"><div className="wave-bar wave-1"></div><div className="wave-bar wave-2"></div><div className="wave-bar wave-3"></div><div className="wave-bar wave-4"></div><div className="wave-bar wave-5"></div><div className="wave-bar wave-1"></div></div><span className="text-xs font-bold text-indigo-500 uppercase tracking-widest animate-pulse">Sizi Dinliyorum...</span></div>
                            ) : (
                                <div className="flex flex-col items-center gap-3"><div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-full text-slate-400"><MicOff size={18} /></div>{speechTranscript ? <p className="text-sm font-medium text-slate-700 italic px-2 text-center">"{speechTranscript}"</p> : <p className="text-sm font-medium text-slate-400">Ses algılanmadı veya durduruldu.</p>}</div><button onClick={toggleListening} className="flex items-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm rounded-full text-xs font-black transition-all uppercase tracking-wider"><RefreshCw size={14} /> Yeniden Dinle</button></div>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
                            <div className="w-full md:w-1/3 border-r border-slate-200 bg-white overflow-y-auto p-4 flex flex-col gap-2 max-h-[30vh] md:max-h-none">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center justify-between"><span>Bulunan Öğrenciler ({assistantFoundStudents.length})</span></div>
                                {assistantFoundStudents.map(student => {
                                    const isSelected = assistantSelectedStudent?.id === student.id; const baseClasses = "text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3";
                                    let stateClasses = 'border-transparent hover:bg-slate-50'; if (isSelected) stateClasses = student.isVip ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-indigo-50 border-indigo-500 shadow-md';
                                    let avatarClasses = 'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 '; if (isSelected) avatarClasses += student.isVip ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'; else avatarClasses += student.isVip ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';
                                    let nameClasses = `font-bold text-sm truncate ${isSelected ? (student.isVip ? 'text-amber-900' : 'text-indigo-900') : 'text-slate-700'}`;
                                    return (
                                        <button key={student.id} onClick={() => setAssistantSelectedStudent(student)} className={`${baseClasses} ${stateClasses}`}><div className={avatarClasses}>{student.name.charAt(0)}</div><div className="flex flex-col overflow-hidden"><span className={nameClasses}>{student.name} {student.isVip && <Crown size={12} className="inline text-amber-500 ml-1"/>}</span><span className="text-[10px] text-slate-400 font-bold truncate">{student.className} {student.matchScore > 0 && <span className="text-emerald-500 ml-1">({student.matchScore} Eşleşme)</span>}</span></div></button>
                                    );
                                })}
                                {assistantFoundStudents.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Öğrenci bulunamadı.</div>}
                            </div>
                            <div className="w-full md:w-2/3 overflow-y-auto p-4 md:p-6">
                                {assistantSelectedStudent ? (
                                    <div className="space-y-6">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between"><span>Ödevler (En Yeni En Üstte)</span>{assistantSelectedStudent.isVip && <span className="text-amber-500 font-bold">Özel Ders</span>}</div>
                                        {assistantFoundTopics.filter(t => t.classId === assistantSelectedStudent.classId).map(topic => (
                                            <div key={topic.id} className={`bg-white rounded-3xl border ${assistantSelectedStudent.isVip ? 'border-amber-200' : 'border-slate-200'} p-5 shadow-sm`}><h4 className="font-black text-slate-800 text-lg mb-4 border-b border-slate-100 pb-3 flex items-center gap-2 justify-between"><div className="flex items-center gap-2"><div className={`w-2 h-6 ${assistantSelectedStudent.isVip ? 'bg-amber-500' : 'bg-indigo-500'} rounded-full`}></div>{topic.title}</div>{topic.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Calendar size={12}/>{formatDate(topic.date)}</span>}</h4><div className="space-y-4">
                                                    {topic.subColumns.map(col => {
                                                        const targetClass = classes.find(c => c.id === assistantSelectedStudent.classId); const studentData = targetClass?.students.find(s => s.id === assistantSelectedStudent.id);
                                                        const currentDbGrade = studentData?.grades?.[col.id] || 'exempt'; const currentDbNote = studentData?.assignmentNotes?.[col.id] || '';
                                                        const draftGrade = assistantDraftGrades[assistantSelectedStudent.id]?.[col.id]; const draftNote = assistantDraftNotes[assistantSelectedStudent.id]?.[col.id];
                                                        const displayGrade = draftGrade !== undefined ? draftGrade : currentDbGrade; const displayNote = draftNote !== undefined ? draftNote : currentDbNote;
                                                        const isChanged = (draftGrade !== undefined && draftGrade !== currentDbGrade) || (draftNote !== undefined && draftNote !== currentDbNote);
                                                        return (
                                                            <div key={col.id} className={`flex flex-col gap-3 p-4 rounded-2xl transition-all ${isChanged ? 'bg-amber-50/50 border border-amber-200 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}><div className="text-sm font-bold text-slate-700">{col.title}</div><div className="grid grid-cols-4 gap-2">{STATUS_OPTIONS.map(opt => ( <button key={opt.id} onClick={() => handleDraftGradeChange(assistantSelectedStudent.id, col.id, opt.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${displayGrade === opt.id ? `${opt.bg} ${opt.color} ${opt.border} shadow-sm scale-105` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}><opt.icon size={18} className="mb-1" strokeWidth={2.5} /><span className="text-[10px] font-black uppercase">{opt.label}</span></button> ))}</div><div className="relative mt-1"><div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><StickyNote size={14} className="text-slate-400"/></div><input type="text" placeholder="Öğretmen notu ekle..." className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700 placeholder:text-slate-400" value={displayNote} onChange={(e) => handleDraftNoteChange(assistantSelectedStudent.id, col.id, e.target.value)}/></div></div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        {assistantFoundTopics.filter(t => t.classId === assistantSelectedStudent.classId).length === 0 && <div className="text-xs text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">Konu bulunamadı.</div>}
                                    </div>
                                ) : ( <div className="flex flex-col h-full items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300 p-8"><User size={48} className="mb-4 text-slate-200" /><p className="text-sm font-bold text-slate-500">Öğrenci Seçilmedi</p></div> )}
                            </div>
                        </div>
                        <div className="p-4 md:p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-xs font-bold w-full md:w-auto text-center md:text-left">{Object.keys(assistantDraftGrades).length > 0 || Object.keys(assistantDraftNotes).length > 0 ? ( <span className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center justify-center md:justify-start gap-1.5"><AlertTriangle size={14}/> Kaydedilmeyi bekleyen değişiklikler var</span> ) : ( <span className="text-slate-400">Değişiklik yapılmadı</span> )}</div>
                            <div className="flex gap-3 w-full md:w-auto"><button onClick={() => { setShowAssistantModal(false); setAssistantDraftGrades({}); setAssistantDraftNotes({}); }} className="flex-1 md:flex-none px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm">İptal</button><button onClick={applyAssistantDrafts} disabled={Object.keys(assistantDraftGrades).length === 0 && Object.keys(assistantDraftNotes).length === 0} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black text-white shadow-lg transition-all text-sm flex items-center justify-center gap-2 ${(Object.keys(assistantDraftGrades).length > 0 || Object.keys(assistantDraftNotes).length > 0) ? 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 shadow-indigo-500/30' : 'bg-slate-300 cursor-not-allowed'}`}><Save size={18} /> KAYDET</button></div>
                        </div>
                    </div>
                </div>
            )}
            
            {printData && (
                <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto"><div className="p-4 no-print flex gap-4 bg-slate-100 border-b border-slate-200 sticky top-0 justify-between items-center shadow-sm"><span className="font-bold text-slate-700 text-sm">Yazdırma Önizlemesi</span><div className="flex gap-2"><button onClick={() => setPrintData(null)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm">İptal</button><button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2"><Printer size={16}/> Yazdır / PDF İndir</button></div></div>
                    {printData.type === 'passwords' && ( <div className="p-8 print-only bg-white text-black min-h-screen"><div className="text-center mb-8 border-b-2 border-black pb-4"><h1 className="text-3xl font-black">{printData.classData.className} Şifre Kartları</h1></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{printData.classData.students?.map((std, i) => ( <div key={i} className="border-2 border-dashed border-gray-400 p-4 rounded-xl flex flex-col items-center text-center"><GraduationCap size={24} className="mb-2 text-gray-700" /><div className="font-black text-lg mb-1">{std.name}</div><div className="w-full bg-gray-100 py-1 mb-1 rounded text-xs text-gray-600 font-bold">Kullanıcı Adı</div><div className="font-mono text-sm mb-2">{std.username}</div><div className="w-full bg-gray-100 py-1 mb-1 rounded text-xs text-gray-600 font-bold">Şifre</div><div className="font-mono font-black text-lg tracking-widest">{std.password}</div></div> ))}</div></div> )}
                    {printData.type === 'report' && ( <div className="p-10 print-only bg-white text-black min-h-screen max-w-4xl mx-auto"><div className="flex justify-between items-end border-b-4 border-gray-800 pb-6 mb-8"><div><h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3"><GraduationCap size={36}/> Berkant Hoca</h1><p className="text-gray-500 font-bold tracking-widest mt-1 text-sm uppercase">Öğrenci Gelişim Raporu</p></div><div className="text-right"><div className="font-bold text-xl">{printData.studentData.name}</div><div className="text-gray-500">{printData.classData.className}</div><div className="text-xs text-gray-400 mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</div></div></div><div className="space-y-6">{printData.classData.topics?.map(topic => ( <div key={topic.id} className="mb-6"><div className="bg-gray-100 p-3 flex justify-between items-center border-l-4 border-gray-800 font-bold mb-3"><span className="uppercase">{topic.title}</span>{topic.date && <span className="text-xs text-gray-500">Son Teslim: {formatDate(topic.date)}</span>}</div><table className="w-full text-left border-collapse border border-gray-200 text-sm"><thead><tr className="bg-gray-50 text-gray-600"><th className="border p-2 w-1/2">Kaynak / Görev</th><th className="border p-2 w-1/4 text-center">Durum</th><th className="border p-2 w-1/4 text-center">Öğretmen Notu</th></tr></thead><tbody>{topic.subColumns?.map(col => { const status = printData.studentData.grades?.[col.id] || 'exempt'; const statusData = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3]; const note = printData.studentData.assignmentNotes?.[col.id]; return ( <tr key={col.id} className="border hover:bg-gray-50"><td className="border p-2 font-medium">{col.title}</td><td className="border p-2 text-center font-bold">{statusData.label}</td><td className="border p-2 text-center text-xs italic text-gray-600">{note || '-'}</td></tr> ); })}</tbody></table></div> ))}</div></div> )}
                </div>
            )}
            
            {studentSettingsModal && loggedInStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden modal-anim shadow-2xl"><div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex gap-2 items-center"><Settings className="text-indigo-600"/> Hesabım</h3><button onClick={() => setStudentSettingsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div><div className="p-6"><div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4"><div className="w-12 h-12 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center font-black text-xl">{loggedInStudent.name.charAt(0)}</div><div><div className="font-bold text-slate-800">{loggedInStudent.name}</div><div className="text-xs text-slate-500 font-mono mt-0.5">{loggedInStudent.username}</div></div></div><div className="mb-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Yeni Şifre Belirle</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-slate-800 font-medium tracking-widest" placeholder="En az 4 karakter" value={studentNewPassword} onChange={(e) => setStudentNewPassword(e.target.value)} /></div><button onClick={updateStudentPassword} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md mt-4 transition-colors">Şifremi Güncelle</button></div></div></div>
            )}
            
            {showLibraryManager && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg flex flex-col max-h-[85vh] modal-anim shadow-2xl"><div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex gap-3 items-center"><div className="bg-indigo-100 p-2 rounded-lg"><Library size={20} className="text-indigo-600"/></div> Kütüphane Yönetimi</h3><button onClick={() => setShowLibraryManager(false)} className="text-slate-400 hover:text-rose-600 bg-white p-1.5 rounded-full shadow-sm transition-colors"><X size={20}/></button></div><div className="p-4 bg-white"><div className="flex bg-slate-100 p-1.5 rounded-xl"><button onClick={() => setLibraryCategory(LIBRARY_TYPES.TOPIC)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${libraryCategory === LIBRARY_TYPES.TOPIC ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ödevler</button><button onClick={() => setLibraryCategory(LIBRARY_TYPES.SOURCE)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${libraryCategory === LIBRARY_TYPES.SOURCE ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Kaynaklar</button><button onClick={() => setLibraryCategory(LIBRARY_TYPES.EXCUSE)} className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${libraryCategory === LIBRARY_TYPES.EXCUSE ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Notlar</button></div></div><div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col gap-3"><div className="flex gap-2"><input type="text" className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none shadow-sm" placeholder="Yeni içerik yazın..." value={libraryInput} onChange={(e) => setLibraryInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') {addLibraryItem(libraryInput); setLibraryInput('');} }} /><button onClick={() => { addLibraryItem(libraryInput); setLibraryInput(''); }} className="bg-indigo-600 text-white px-5 rounded-xl hover:bg-indigo-700 shadow-md font-bold transition-transform hover:-translate-y-0.5">Ekle</button></div>{libraryCategory === LIBRARY_TYPES.TOPIC && (<div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200"><Calendar size={16} className="text-slate-400 ml-2"/><input type="date" className="flex-1 bg-transparent text-sm font-bold text-slate-600 outline-none" value={libraryDate} onChange={(e) => setLibraryDate(e.target.value)}/></div>)}</div><div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-2">{libraryItems.filter(i => i.type === libraryCategory).map(item => (<div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 shadow-sm rounded-2xl group hover:border-indigo-200 transition-colors"><div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{item.text}</span>{item.date && <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-1"><Calendar size={12}/> {item.date}</span>}</div><button onClick={() => deleteLibraryItem(item.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button></div>))}{libraryItems.filter(i => i.type === libraryCategory).length === 0 && <div className="flex flex-col items-center justify-center h-32 text-slate-400"><Library size={32} className="mb-2 opacity-50"/><span className="text-sm font-medium">Bu kategori boş.</span></div>}</div></div></div>)}
                    {showCellNoteModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl modal-anim overflow-hidden border border-slate-200"><div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 border-b border-amber-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className="bg-white p-2 rounded-lg shadow-sm"><StickyNote className="text-amber-500" size={20}/></div><h3 className="font-black text-amber-900 text-lg">Öğretmen Notu</h3></div><div className="flex bg-white rounded-lg p-1 shadow-sm border border-amber-100"><button onClick={() => setUseNoteLibrary(false)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${!useNoteLibrary ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Yaz</button><button onClick={() => setUseNoteLibrary(true)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${useNoteLibrary ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Kütüphane</button></div></div><div className="p-6 bg-slate-50">{useNoteLibrary ? (<div className="h-40 overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-inner p-2">{libraryItems.filter(i => i.type === LIBRARY_TYPES.EXCUSE).map(item => (<button key={item.id} onClick={() => setNoteInput(item.text)} className={`w-full text-left p-3 text-sm rounded-xl mb-1 transition-colors flex justify-between items-center ${noteInput === item.text ? 'bg-amber-50 border border-amber-200 text-amber-800 font-bold' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}><span>{item.text}</span> {noteInput === item.text && <CheckCircle size={16} className="text-amber-500"/>}</button>))}{libraryItems.filter(i => i.type === LIBRARY_TYPES.EXCUSE).length === 0 && <p className="text-center text-sm font-medium text-slate-400 py-8">Kayıtlı not bulunamadı.</p>}</div>) : (<textarea className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none text-sm resize-none shadow-inner font-medium text-slate-700" rows={4} placeholder="Öğrenci için notunuzu buraya yazın..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} autoFocus></textarea>)}</div><div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">{noteInput && <button onClick={deleteCellNote} className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors">Sil</button>}<button onClick={() => setShowCellNoteModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">İptal</button><button onClick={saveCellNote} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-200 transition-transform hover:-translate-y-0.5">Kaydet</button></div></div></div>)}
                    {modalType && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden modal-anim shadow-2xl"><div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-black text-lg text-slate-800 flex items-center gap-2">{modalType.startsWith('edit') ? <Pencil size={20} className="text-indigo-600"/> : <Plus size={20} className="text-indigo-600"/>} {modalType.startsWith('edit') ? 'Düzenle' : (modalType === 'class' ? 'Yeni Sınıf' : (modalType === 'vip' ? 'Yeni Özel Ders' : (modalType === 'topic' ? 'Yeni Ödev' : 'Yeni Kaynak')))}</h3><button onClick={closeModal} className="text-slate-400 hover:text-rose-600 bg-white p-1.5 rounded-full shadow-sm transition-colors"><X size={20}/></button></div><div className="p-6 flex flex-col gap-5">{!modalType.startsWith('edit') && modalType !== 'class' && modalType !== 'vip' && (<div className="flex bg-slate-100 p-1 rounded-xl"><button onClick={() => setUseLibrary(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!useLibrary ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Yeni Yaz</button><button onClick={() => setUseLibrary(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${useLibrary ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Kütüphaneden Seç</button></div>)}{useLibrary ? (<div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50 p-2 shadow-inner">{libraryItems.filter(i => i.type === (modalType === 'topic' ? LIBRARY_TYPES.TOPIC : LIBRARY_TYPES.SOURCE)).map(item => (<button key={item.id} onClick={() => { setModalInputVal(item.text); if(item.date) setModalDateVal(item.date); }} className={`w-full text-left p-3 text-sm rounded-xl mb-1 transition-colors flex flex-col gap-1 ${modalInputVal === item.text ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold' : 'hover:bg-white text-slate-600 border border-transparent'}`}><span>{item.text}</span>{item.date && modalType === 'topic' && <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium"><Calendar size={12}/> {item.date}</span>}</button>))}{libraryItems.filter(i => i.type === (modalType === 'topic' ? LIBRARY_TYPES.TOPIC : LIBRARY_TYPES.SOURCE)).length ===0 && <p className="p-6 text-sm font-medium text-center text-slate-400">Kütüphanede kayıtlı veri yok.</p>}</div>) : (<input autoFocus type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none text-slate-800 placeholder:text-slate-400 font-bold" placeholder="İsim giriniz..." value={modalInputVal} onChange={(e) => setModalInputVal(e.target.value)} />)}{(modalType === 'source' || modalType === 'edit-source') && (<div className="flex flex-col gap-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">PDF / Dosya Linki (Opsiyonel)</label><div className="relative"><div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Link size={16} className="text-slate-400"/></div><input type="text" className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Google Drive vb. linki..." value={modalPdfVal} onChange={(e) => setModalPdfVal(e.target.value)} /></div></div>)}{(modalType === 'topic' || modalType === 'edit-topic') && (<div className="flex flex-col gap-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Son Teslim Tarihi</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none" value={modalDateVal} onChange={(e) => setModalDateVal(e.target.value)} /></div>)}</div><div className="p-5 bg-white border-t border-slate-100 flex gap-3"><button onClick={closeModal} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">İptal</button><button onClick={handleModalSubmit} className="flex-1 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5">Kaydet</button></div></div></div>)}
                    {confirmModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full text-center modal-anim shadow-2xl"><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}><AlertTriangle size={32} /></div><p className="text-slate-800 text-lg font-black mb-8 leading-tight">{confirmModal.message}</p><div className="flex gap-3"><button onClick={() => setConfirmModal(null)} className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">İptal Et</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-3.5 rounded-xl text-white font-black shadow-lg transition-transform hover:-translate-y-0.5 ${confirmModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>Onayla</button></div></div></div>)}
                    {showRiskModal && activeRiskClass && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden modal-anim shadow-2xl"><div className="bg-rose-50 p-4 border-b border-rose-100 flex justify-between items-center"><h3 className="font-bold text-rose-800 flex items-center gap-2"><AlertOctagon size={18}/> Risk Analizi</h3><button onClick={() => setShowRiskModal(false)} className="text-rose-400 hover:text-rose-600"><X size={20}/></button></div><div className="p-6"><p className="text-xs text-slate-500 mb-4 font-medium">Bu sınıfta ödev yapma oranı %50'nin altında olan öğrenciler:</p><div className="grid grid-cols-2 gap-3">{calculateStats(activeRiskClass.students, activeRiskClass.topics).atRisk.length > 0 ? (calculateStats(activeRiskClass.students, activeRiskClass.topics).atRisk.map((s, i) => (<div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex flex-col items-center"><span className="font-bold text-slate-700 text-sm text-center">{s.name}</span><span className="text-rose-600 font-black text-lg mt-1">%{s.rate}</span></div>))) : (<p className="col-span-2 text-center text-sm text-emerald-600 font-bold py-4">Harika! Riskli öğrenci yok.</p>)}</div></div></div></div>)}
                    {(activeCell || activeColMenu || activeTopicMenu) && <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" onClick={() => { setActiveCell(null); setActiveColMenu(null); setActiveTopicMenu(null); }}/>}
                    {activeTopicMenu && (<div className="fixed z-menu bg-white rounded-2xl shadow-xl border border-slate-100 w-64 modal-anim overflow-hidden" style={{ top: Math.min(activeTopicMenu.anchorEl.getBoundingClientRect().bottom + 5, window.innerHeight - 200), left: Math.min(Math.max(10, activeTopicMenu.anchorEl.getBoundingClientRect().left), window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}><div className="p-2 bg-slate-50 border-b border-slate-100"><div className="text-[10px] font-black text-slate-400 px-2 py-1 uppercase tracking-widest">Toplu İşlem</div></div><div className="p-2 space-y-1"><button onClick={() => handleTopicBulkAction('assigned', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-700 text-sm font-bold transition-colors"><ArrowDownToLine size={18}/> Herkese Ver</button><button onClick={() => handleTopicBulkAction('done', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-700 text-sm font-bold transition-colors"><CheckCircle size={18}/> Herkese Yapıldı</button></div><div className="h-px bg-slate-100 my-1"></div><div className="p-2 space-y-1"><button onClick={() => { const cls = classes.find(c => c.id === activeTopicMenu.classId); const topic = cls.topics.find(t => t.id === activeTopicMenu.topicId); setModalData({ classId: cls.id, topicId: topic.id, currentTitle: topic.title }); setModalInputVal(topic.title); setModalDateVal(topic.date || ''); setModalType('edit-topic'); setActiveTopicMenu(null); }} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-indigo-600 text-sm font-bold transition-colors"><Pencil size={18}/> Başlığı Düzenle</button><button onClick={() => handleTopicBulkAction('delete', activeTopicMenu.classId, activeTopicMenu.topicId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 text-sm font-bold transition-colors"><Trash2 size={18}/> Ödevi Sil</button></div></div>)}
                    {activeColMenu && (<div className="fixed z-menu bg-white rounded-2xl shadow-xl border border-slate-100 w-48 modal-anim overflow-hidden" style={{ top: Math.min(activeColMenu.anchorEl.getBoundingClientRect().bottom + 5, window.innerHeight - 200), left: Math.min(Math.max(10, activeColMenu.anchorEl.getBoundingClientRect().left), window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}><div className="p-2 space-y-1"><button onClick={() => { const cls = classes.find(c => c.id === activeColMenu.classId); const topic = cls.topics.find(t => t.id === activeColMenu.topicId); const col = topic.subColumns.find(c => c.id === activeColMenu.colId); setModalData({ classId: cls.id, topicId: topic.id, colId: col.id, currentTitle: col.title }); setModalInputVal(col.title); setModalPdfVal(col.pdfLink || ""); setModalType('edit-source'); setActiveColMenu(null); }} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-indigo-600 text-sm font-bold transition-colors"><Pencil size={18}/> Düzenle</button><button onClick={() => deleteColumn(activeColMenu.classId, activeColMenu.topicId, activeColMenu.colId)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 text-sm font-bold transition-colors"><Trash2 size={18}/> Kaynağı Sil</button></div></div>)}
                    {activeCell && (<div className="fixed z-menu bg-white border border-slate-100 rounded-2xl shadow-xl p-2 w-48 modal-anim" style={{ top: Math.min(activeCell.anchorEl.getBoundingClientRect().bottom + 5, window.innerHeight - 200), left: Math.min(Math.max(10, activeCell.anchorEl.getBoundingClientRect().left), window.innerWidth - 200) }} onClick={(e) => e.stopPropagation()}>{STATUS_OPTIONS.map(opt => <button key={opt.id} onClick={() => updateGrade(activeCell.classId, activeCell.studentId, activeCell.colId, opt.id)} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:${opt.bg} transition-colors mb-1 last:mb-0`}><opt.icon size={18} className={opt.color} strokeWidth={2.5}/><span className="text-sm font-bold text-slate-700">{opt.label}</span></button>)}</div>)}
                </div>
            );
        };

        export default App;
