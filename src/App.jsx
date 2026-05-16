import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, GraduationCap, Library, Settings, LogOut, Mic, X, Megaphone, Edit3, Pencil, Trash2, Download, Share, Plus } from 'lucide-react';

// PDF KÜTÜPHANELERİ
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// FİREBASE
import { db } from './config/firebase'; 
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';

// YARDIMCILAR VE SABİTLER
import { LIBRARY_TYPES, CLASSES_COLLECTION, LIBRARY_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN, STATUS_OPTIONS } from './utils/constants';
import { generateId, calculateStats } from './utils/helpers';

// 🧩 PARÇALANMIŞ BİLEŞENLERİMİZ
import LoginScreen from './components/auth/LoginScreen';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';
import ClassDetail from './components/views/ClassDetail';
import StudentDetail from './components/views/StudentDetail';
import LibraryModal from './components/modals/LibraryModal';
import CountdownTimer from './components/ui/Countdown'; 
import JarvisModal from './components/assistant/JarvisModal'; 

// 🔥 TÜRKÇE KARAKTER VE BÜYÜK/KÜÇÜK HARF TEMİZLEYİCİ (Geri Eklendi!)
const makeSafe = (str) => {
    if (!str) return "";
    return String(str).trim()
        .replace(/I/g, 'i').replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .toLowerCase();
};

const App = () => {
    // 🔥 FİREBASE YÜKLENME KALKANI
    const [isClassesLoaded, setIsClassesLoaded] = useState(false);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const isFirebaseLoaded = isClassesLoaded && isConfigLoaded;

    // 🔥 KALICI OTURUM (BENİ HATIRLA) KONTROLÜ
    const [isRestoring, setIsRestoring] = useState(!!localStorage.getItem('berkantHocaSession'));

    const [classes, setClasses] = useState([]);
    const [libraryItems, setLibraryItems] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [isTeacherMode, setIsTeacherMode] = useState(false);
    const [loggedInStudent, setLoggedInStudent] = useState(null);
    const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN); 
    const [announcementTitle, setAnnouncementTitle] = useState("Sistem Duyurusu");
    const [systemAnnouncement, setSystemAnnouncement] = useState("Eğitim, dünyayı değiştirmek için en güçlü silahtır.");
    const [countdownConfig, setCountdownConfig] = useState({ targetDate: '2026-06-20T00:00:00', startDate: '2025-06-20T00:00:00', label: '20 Haziran 2026' });
    const [view, setView] = useState('home'); 
    const [activeTab, setActiveTab] = useState('homework'); 
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudentForView, setSelectedStudentForView] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    // 📱 MOBİL UYGULAMA (PWA) YÜKLEME STATE'LERİ
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIosInstallModal, setShowIosInstallModal] = useState(false);

    useEffect(() => { 
        const handleResize = () => setIsMobile(window.innerWidth < 768); 
        window.addEventListener('resize', handleResize); 

        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIos(/iphone|ipad|ipod/.test(userAgent));
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

        const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', () => { setDeferredPrompt(null); setIsStandalone(true); });

        return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); }; 
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setDeferredPrompt(null); } 
        else if (isIos) { setShowIosInstallModal(true); } 
        else { alert("Uygulama zaten yüklü veya tarayıcınız bu özelliği desteklemiyor."); }
    };
    
    const [newStudentName, setNewStudentName] = useState("");
    const [modalType, setModalType] = useState(null); 
    const [modalData, setModalData] = useState(null);
    const [modalInputVal, setModalInputVal] = useState("");
    const [modalTitleVal, setModalTitleVal] = useState(""); 
    const [modalDateVal, setModalDateVal] = useState("");
    const [modalPdfVal, setModalPdfVal] = useState("");
    
    const [activeTopicMenu, setActiveTopicMenu] = useState(null);
    const [activeColMenu, setActiveColMenu] = useState(null);
    const [activeCell, setActiveCell] = useState(null);
    const [studentSettingsModal, setStudentSettingsModal] = useState(false);
    const [cellNoteModal, setCellNoteModal] = useState(null);
    
    const [showLibraryManager, setShowLibraryManager] = useState(false);
    const [libraryCategory, setLibraryCategory] = useState(LIBRARY_TYPES.TOPIC);
    const [libraryInput, setLibraryInput] = useState("");
    const [libraryDate, setLibraryDate] = useState("");
    
    const [showAssistant, setShowAssistant] = useState(false);

    const regularClasses = classes.filter(c => c.type !== 'vip');
    const vipClasses = classes.filter(c => c.type === 'vip');

    // 🌐 FİREBASE VERİ ÇEKME
    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, CLASSES_COLLECTION), (snap) => {
            setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsClassesLoaded(true);
        });
        const unsubLibrary = onSnapshot(collection(db, LIBRARY_COLLECTION), (snap) => setLibraryItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubConfig = onSnapshot(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.pin) setDbTeacherPin(data.pin);
                if (data.announcement) setSystemAnnouncement(data.announcement);
                if (data.announcementTitle) setAnnouncementTitle(data.announcementTitle);
                if (data.countdown) setCountdownConfig(data.countdown);
            }
            setIsConfigLoaded(true);
        });
        return () => { unsubClasses(); unsubLibrary(); unsubConfig(); };
    }, []);

    // 🚀 OTOMATİK GİRİŞ (AUTO-LOGIN) MOTORU - Klavye Korumalı
    useEffect(() => {
        if (isFirebaseLoaded && !currentUserRole) {
            const sessionStr = localStorage.getItem('berkantHocaSession');
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);
                    if (session.role === 'teacher') {
                        if (String(session.pin).trim() === String(dbTeacherPin).trim()) {
                            setIsTeacherMode(true); setCurrentUserRole('teacher'); setView('home'); setActiveTab('homework');
                        } else {
                            localStorage.removeItem('berkantHocaSession'); 
                        }
                    } else if (session.role === 'student' || session.role === 'vip-student') {
                        const classesToSearch = session.role === 'vip-student' ? vipClasses : regularClasses;
                        let foundStudent = null, foundClass = null;
                        const safeSessionUser = makeSafe(session.username); // Koruma eklendi
                        for (const cls of classesToSearch) {
                            const std = cls.students?.find(s => s.username && makeSafe(s.username) === safeSessionUser && s.password === session.password);
                            if (std) { foundStudent = std; foundClass = cls; break; }
                        }
                        if (foundStudent) {
                            setCurrentUserRole(session.role); setLoggedInStudent(foundStudent); setSelectedClass(foundClass); setSelectedStudentForView(foundStudent); setView('student-detail'); setActiveTab('homework');
                        } else {
                            localStorage.removeItem('berkantHocaSession'); 
                        }
                    }
                } catch (e) {
                    localStorage.removeItem('berkantHocaSession');
                }
            }
            setIsRestoring(false); 
        }
    }, [isFirebaseLoaded, classes, dbTeacherPin]); 


    // 🔐 GİRİŞ FONKSİYONLARI 
    const verifyPin = (inputPin) => { 
        if (!isFirebaseLoaded) { alert("Sistem verileri yükleniyor... Lütfen bekleyin."); return; }
        if (String(inputPin).trim() === String(dbTeacherPin).trim()) { 
            localStorage.setItem('berkantHocaSession', JSON.stringify({ role: 'teacher', pin: String(inputPin).trim() }));
            setIsTeacherMode(true); setCurrentUserRole('teacher'); setView('home'); setActiveTab('homework'); 
        } else { 
            alert("Hatalı PIN!"); 
        } 
    };

    const handleStudentLogin = (username, password, isVipLogin = false) => {
        if (!isFirebaseLoaded) { alert("Sistem verileri yükleniyor... Lütfen bekleyin."); return; }

        let foundStudent = null, foundClass = null; const classesToSearch = isVipLogin ? vipClasses : regularClasses;
        const safeUsername = makeSafe(username); // 🔥 KLAVYE KORUMASI BURADA!
        const safePassword = password.trim();

        for (const cls of classesToSearch) { 
            const std = cls.students?.find(s => s.username && makeSafe(s.username) === safeUsername && s.password.trim() === safePassword); 
            if (std) { foundStudent = std; foundClass = cls; break; } 
        }

        if (foundStudent) { 
            const role = isVipLogin ? 'vip-student' : 'student';
            localStorage.setItem('berkantHocaSession', JSON.stringify({ role, username: safeUsername, password: safePassword }));
            setCurrentUserRole(role); setLoggedInStudent(foundStudent); setSelectedClass(foundClass); setSelectedStudentForView(foundStudent); setView('student-detail'); setActiveTab('homework'); 
            
            const updatedStudents = foundClass.students.map(s => s.id === foundStudent.id ? { ...s, lastLogin: new Date().toISOString() } : s); 
            updateClassInDb({ ...foundClass, students: updatedStudents }); 
        } else { 
            alert('Kullanıcı adı veya şifre hatalı!'); 
        }
    };
    
    // 🚪 ÇIKIŞ YAP (Hafızayı Siler)
    const handleLogout = () => { 
        localStorage.removeItem('berkantHocaSession');
        setCurrentUserRole(null); setIsTeacherMode(false); setLoggedInStudent(null); setSelectedClass(null); setSelectedStudentForView(null); setView('home'); 
    };
    
    const updateClassInDb = async (updatedClass) => { try { await updateDoc(doc(db, CLASSES_COLLECTION, updatedClass.id), updatedClass); if (selectedClass?.id === updatedClass.id) setSelectedClass(updatedClass); } catch (e) { console.error("Sınıf güncellenemedi:", e); } };
    const goHome = () => { setView('home'); setSelectedClass(null); setSelectedStudentForView(null); setActiveTab('homework'); };
    const openClass = (cls) => { setSelectedClass(cls); setView('class-detail'); setActiveTab('homework'); };
    const openStudent = (std) => { setSelectedStudentForView(std); setView('student-detail'); setActiveTab('homework'); };
    
    const addLibraryItem = async (text) => { if(!text || typeof text !== 'string' || !text.trim()) return; let subTopics = []; let mainText = text.trim(); if (libraryCategory === LIBRARY_TYPES.CURRICULUM && text.includes(',')) { const parts = text.split(','); mainText = parts[0].trim(); subTopics = parts.slice(1).map(p => ({ title: p.trim() })).filter(p => p.title); } await addDoc(collection(db, LIBRARY_COLLECTION), { text: mainText, type: libraryCategory, date: libraryCategory === LIBRARY_TYPES.TOPIC ? libraryDate : null, subTopics: subTopics }); };
    const deleteLibraryItem = async (id) => { await deleteDoc(doc(db, LIBRARY_COLLECTION, id)); };
    
    const addStudent = (classId) => { if(!newStudentName.trim()) return; const cls = classes.find(c => c.id === classId); const username = newStudentName.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random()*1000); const password = Math.random().toString(36).slice(-6); const newStd = { id: generateId('std'), name: newStudentName, username, password, grades: {}, assignmentNotes: {} }; updateClassInDb({ ...cls, students: [...(cls.students || []), newStd] }); setNewStudentName(""); };
    const deleteStudent = (e, classId, studentId) => { e.stopPropagation(); if(!window.confirm('Öğrenciyi silmek istediğinize emin misiniz?')) return; const cls = classes.find(c => c.id === classId); updateClassInDb({ ...cls, students: cls.students.filter(s => s.id !== studentId) }); };
    
    const updateGrade = (classId, studentId, colId, statusId) => { const cls = classes.find(c => c.id === classId); const updatedStudents = cls.students.map(s => s.id === studentId ? { ...s, grades: { ...(s.grades || {}), [colId]: statusId } } : s); updateClassInDb({ ...cls, students: updatedStudents }); setActiveCell(null); };
    const deleteColumn = (classId, topicId, colId) => { if(!window.confirm('Kaynağı silmek istediğinize emin misiniz?')) return; const cls = classes.find(c => c.id === classId); const updatedTopics = cls.topics.map(t => t.id === topicId ? { ...t, subColumns: t.subColumns.filter(c => c.id !== colId) } : t); updateClassInDb({ ...cls, topics: updatedTopics }); };
    const deleteClass = (e, classId) => { e.stopPropagation(); if(!window.confirm('Tüm sınıf silinecek. Emin misiniz?')) return; deleteDoc(doc(db, CLASSES_COLLECTION, classId)); goHome(); };
    
    const handlePrintStudentReport = async (cls, student) => {
        const printDiv = document.createElement('div');
        printDiv.style.position = 'absolute'; printDiv.style.left = '-9999px'; printDiv.style.top = '-9999px';
        printDiv.style.width = '800px'; printDiv.style.background = '#ffffff'; printDiv.style.padding = '40px';
        printDiv.style.fontFamily = 'sans-serif'; printDiv.style.color = '#333';
        const stats = calculateStats([student], cls.topics);
        let html = `
            <div style="border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">BERKANT HOCA - Gelişim Raporu</h1>
                <h2 style="margin: 10px 0 0 0; font-size: 22px;">Öğrenci: ${student.name}</h2>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 16px;">Sınıf: ${cls.className} | Genel Başarı: %${stats.percentage}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                <thead><tr style="background-color: #f8fafc;"><th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; color: #475569;">Konu ve Kaynak</th><th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; color: #475569;">Durum</th><th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; color: #475569;">Öğretmen Notu</th></tr></thead><tbody>
        `;
        cls.topics.forEach(topic => {
            topic.subColumns.forEach(col => {
                const statusId = student.grades?.[col.id] || 'assigned';
                let statusHtml = '';
                if(statusId === 'done') statusHtml = '<span style="color: #16a34a; font-weight: bold;">✓ Yapıldı</span>';
                else if(statusId === 'missing') statusHtml = '<span style="color: #dc2626; font-weight: bold;">✗ Eksik</span>';
                else if(statusId === 'assigned') statusHtml = '<span style="color: #d97706; font-weight: bold;">⏳ Verildi</span>';
                else statusHtml = '<span style="color: #94a3b8;">Muaf</span>';
                const note = student.assignmentNotes?.[col.id] || '-';
                html += `<tr><td style="border: 1px solid #e2e8f0; padding: 12px;"><b>${topic.title}</b><br/><span style="font-size:12px; color:#64748b;">${col.title}</span></td><td style="border: 1px solid #e2e8f0; padding: 12px;">${statusHtml}</td><td style="border: 1px solid #e2e8f0; padding: 12px; font-style: italic;">${note}</td></tr>`;
            });
        });
        html += `</tbody></table><div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">Bu rapor otomatik olarak oluşturulmuştur. Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>`;
        printDiv.innerHTML = html; document.body.appendChild(printDiv);
        try {
            const canvas = await html2canvas(printDiv, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); pdf.save(`${student.name.replace(/\s+/g, '_')}_Rapor.pdf`);
        } catch (error) { console.error("PDF oluşturma hatası:", error); alert("PDF oluşturulurken bir hata oluştu."); } finally { document.body.removeChild(printDiv); }
    };

    const handlePrintPasswords = async (cls) => {
        const printDiv = document.createElement('div');
        printDiv.style.position = 'absolute'; printDiv.style.left = '-9999px'; printDiv.style.top = '-9999px';
        printDiv.style.width = '800px'; printDiv.style.background = '#ffffff'; printDiv.style.padding = '40px';
        printDiv.style.fontFamily = 'sans-serif'; printDiv.style.color = '#333';
        let html = `<div style="border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px;"><h1 style="color: #4f46e5; margin: 0; font-size: 28px;">${cls.className} Sınıfı - Şifre Listesi</h1></div><table style="width: 100%; border-collapse: collapse; margin-top: 20px;"><thead><tr style="background-color: #f8fafc;"><th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; color: #475569;">Öğrenci Adı</th><th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; color: #475569;">Kullanıcı Adı</th><th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; color: #475569;">Şifre</th></tr></thead><tbody>`;
        cls.students.forEach(s => { html += `<tr><td style="border: 1px solid #e2e8f0; padding: 12px;"><strong>${s.name}</strong></td><td style="border: 1px solid #e2e8f0; padding: 12px; font-family: monospace; font-size: 14px;">${s.username}</td><td style="border: 1px solid #e2e8f0; padding: 12px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 2px;">${s.password}</td></tr>`; });
        html += `</tbody></table>`;
        printDiv.innerHTML = html; document.body.appendChild(printDiv);
        try {
            const canvas = await html2canvas(printDiv, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); pdf.save(`${cls.className.replace(/\s+/g, '_')}_Sifreler.pdf`);
        } catch (error) { console.error("PDF oluşturma hatası:", error); alert("PDF oluşturulurken bir hata oluştu."); } finally { document.body.removeChild(printDiv); }
    };

    const handleOpenRisk = (cls) => { const stats = calculateStats(cls.students, cls.topics); if (stats.atRisk && stats.atRisk.length > 0) { let msg = `⚠️ RİSKLİ ÖĞRENCİLER (${cls.className})\n\n`; stats.atRisk.forEach(s => { msg += `• ${s.name} - Başarı Oranı: %${s.rate}\n`; }); alert(msg); } else { alert(`✅ ${cls.className} sınıfında risk grubunda olan öğrenci bulunmuyor.`); } };
    const openCellNoteModal = (classId, studentId, colId, currentNote) => { setCellNoteModal({ classId, studentId, colId, note: currentNote || "" }); };
    
    const handleModalSubmit = async () => {
        if (modalType === 'system-settings') { await updateDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { announcement: modalInputVal, announcementTitle: modalTitleVal, countdown: { targetDate: modalDateVal ? `${modalDateVal}T00:00:00` : countdownConfig.targetDate, startDate: countdownConfig.startDate, label: modalPdfVal || "" } }); setModalType(null); setModalInputVal(""); setModalTitleVal(""); setModalDateVal(""); setModalPdfVal(""); return; }
        if (!modalInputVal.trim() && modalType !== 'edit-date') return;
        if (modalType === 'class' || modalType === 'vip') { await addDoc(collection(db, CLASSES_COLLECTION), { className: modalInputVal, type: modalType === 'vip' ? 'vip' : 'regular', students: [], topics: [], curriculum: [] }); } 
        else if (modalType === 'edit-class') { const cls = classes.find(c => c.id === modalData.classId); updateClassInDb({ ...cls, className: modalInputVal }); } 
        else if (modalType === 'edit-student') { const cls = classes.find(c => c.id === modalData.classId); const updatedStudents = cls.students.map(s => s.id === modalData.studentId ? { ...s, name: modalInputVal } : s); updateClassInDb({ ...cls, students: updatedStudents }); } 
        else if (modalType === 'topic') { const cls = classes.find(c => c.id === modalData.classId); const newTopic = { id: generateId('top'), title: modalInputVal, date: modalDateVal, subColumns: [] }; updateClassInDb({ ...cls, topics: [...(cls.topics||[]), newTopic] }); } 
        else if (modalType === 'edit-topic') { const cls = classes.find(c => c.id === modalData.classId); const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, title: modalInputVal, date: modalDateVal } : t); updateClassInDb({ ...cls, topics: updatedTopics }); } 
        else if (modalType === 'edit-date') { const cls = classes.find(c => c.id === modalData.classId); const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, date: modalDateVal } : t); updateClassInDb({ ...cls, topics: updatedTopics }); } 
        else if (modalType === 'source') { const cls = classes.find(c => c.id === modalData.classId); const updatedTopics = cls.topics.map(t => t.id === modalData.topicId ? { ...t, subColumns: [...(t.subColumns||[]), { id: generateId('col'), title: modalInputVal, pdfLink: modalPdfVal }] } : t); updateClassInDb({ ...cls, topics: updatedTopics }); } 
        else if (modalType === 'edit-source') { const cls = classes.find(c => c.id === modalData.classId); const updatedTopics = cls.topics.map(t => { if (t.id === modalData.topicId) { return { ...t, subColumns: t.subColumns.map(c => c.id === modalData.colId ? { ...c, title: modalInputVal, pdfLink: modalPdfVal } : c) }; } return t; }); updateClassInDb({ ...cls, topics: updatedTopics }); }
        setModalType(null); setModalInputVal(""); setModalTitleVal(""); setModalDateVal(""); setModalPdfVal("");
    };

    // 🕒 EĞER OTURUM GERİ YÜKLENİYORSA ŞIK BİR BEKLEME EKRANI GÖSTER
    if (isRestoring) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <GraduationCap size={64} className="text-brandPurple mb-6" />
                </motion.div>
                <h2 className="text-sm font-black tracking-widest animate-pulse text-slate-400">OTURUM AÇILIYOR...</h2>
            </div>
        );
    }

    // GİRİŞ EKRANI
    if (!currentUserRole) return <LoginScreen onStudentLogin={handleStudentLogin} onTeacherLogin={verifyPin} />;

    return (
        <div className={`min-h-screen pb-32 relative transition-colors duration-1000 ${currentUserRole === 'vip-student' ? 'bg-slate-900' : 'bg-lightBg'}`}>
            {currentUserRole === 'vip-student' && ( <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"><div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-screen opacity-10" style={{background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)'}}></div><div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full mix-blend-screen opacity-[0.05]" style={{background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)'}}></div></div> )}
            
            <header className={`no-print relative z-20 transition-all duration-500 ${currentUserRole === 'vip-student' ? 'bg-slate-800/90 border-b border-slate-700 shadow-md' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
                 <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3 w-full justify-between">
                        {currentUserRole !== 'student' && currentUserRole !== 'vip-student' && view !== 'home' ? ( <button onClick={() => view === 'student-detail' ? setView('class-detail') : goHome()} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><ChevronLeft size={24} /></button> ) : <div className="w-10"></div>}
                        
                        <div className="text-center"><h1 className={`text-xl md:text-3xl font-black tracking-tight flex items-center justify-center gap-3 ${currentUserRole === 'vip-student' ? 'real-gold-text' : 'text-slate-800'}`}><div className={`p-2 rounded-xl shadow-md transition-transform hover:scale-105 hover-lift ${currentUserRole === 'vip-student' ? 'real-gold-bg shadow-vip-glow' : 'bg-gradient-to-tr from-brandPurple to-blue-600 shadow-glow'}`}><GraduationCap className={currentUserRole === 'vip-student' ? 'text-[#111]' : 'text-white'} size={24} strokeWidth={2.5} /></div> BERKANT HOCA</h1></div>
                        
                        <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            {!isStandalone && (deferredPrompt || isIos) && (
                                <button onClick={handleInstallClick} className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 rounded-full transition-colors shadow-sm border border-emerald-200 hover-lift" title="Uygulamayı Telefona İndir">
                                    <Download size={20}/>
                                </button>
                            )}

                            {isTeacherMode && <button onClick={() => setShowLibraryManager(true)} className="p-2 text-slate-500 hover:text-brandPurple bg-white hover:bg-purple-50 rounded-full transition-colors shadow-sm border border-slate-200 hover-lift"><Library size={20}/></button>}
                            {(currentUserRole === 'student' || currentUserRole === 'vip-student') && <button onClick={() => setStudentSettingsModal(true)} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-slate-300 hover:text-vipGold bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-500 hover:text-brandPurple bg-white shadow-sm border border-slate-200'}`} title="Hesabım"><Settings size={20}/></button>}
                            <button onClick={handleLogout} className={`p-2 rounded-full transition-colors hover-lift ${currentUserRole === 'vip-student' ? 'text-rose-400 hover:text-rose-300 bg-slate-700 border border-slate-600 shadow-sm' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-slate-200'}`} title="Çıkış Yap"><LogOut size={20}/></button>
                        </div>
                    </div>
                </div>
            </header>

            {view === 'home' && (
                <>
                    <div className="max-w-7xl mx-auto px-4 mt-6 animate-fade-in-up relative z-10">
                        <div className={`p-5 md:p-6 rounded-[2rem] shadow-sm border flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden ${currentUserRole === 'vip-student' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100'}`}>
                            <div className={`p-3 rounded-2xl shrink-0 ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-vipGold shadow-vip-glow' : 'bg-white text-brandPurple shadow-sm'}`}><Megaphone size={28} /></div>
                            <div className="flex-1 z-10 pr-8">
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${currentUserRole === 'vip-student' ? 'text-slate-400' : 'text-brandPurple'}`}>{announcementTitle}</h4>
                                <p className={`text-sm md:text-base font-medium leading-relaxed ${currentUserRole === 'vip-student' ? 'text-slate-200' : 'text-slate-700'}`}>{systemAnnouncement}</p>
                            </div>
                            {isTeacherMode && <button onClick={() => { setModalType('system-settings'); setModalInputVal(systemAnnouncement); setModalTitleVal(announcementTitle); setModalPdfVal(countdownConfig.label); setModalDateVal(countdownConfig.targetDate.split('T')[0]); }} className={`absolute top-4 right-4 p-2 rounded-xl transition-all shadow-sm ${currentUserRole === 'vip-student' ? 'bg-slate-700 text-slate-300 hover:text-vipGold' : 'bg-white text-slate-400 hover:text-brandPurple hover:bg-purple-100'}`} title="Duyuru ve Takvimi Düzenle"><Edit3 size={18} /></button>}
                        </div>
                    </div>
                    <CountdownTimer targetDateStr={countdownConfig.targetDate} startDateStr={countdownConfig.startDate} targetLabel={countdownConfig.label} />
                </>
            )}

            <main className="max-w-7xl mx-auto px-4 mt-8 no-print relative z-10">
                <AnimatePresence mode="wait">
                    {isTeacherMode && view === 'home' && <TeacherDashboard regularClasses={regularClasses} vipClasses={vipClasses} onOpenClass={openClass} onNewClass={() => { setModalType('class'); setModalInputVal(''); }} onNewVipClass={() => { setModalType('vip'); setModalInputVal(''); }} />}
                    {isTeacherMode && view === 'class-detail' && selectedClass && <ClassDetail selectedClass={selectedClass} activeTab={activeTab} setActiveTab={setActiveTab} isMobile={isMobile} newStudentName={newStudentName} setNewStudentName={setNewStudentName} addStudent={addStudent} updateGrade={updateGrade} openCellNoteModal={openCellNoteModal} setModalData={setModalData} setModalInputVal={setModalInputVal} setModalDateVal={setModalDateVal} setModalPdfVal={setModalPdfVal} setModalType={setModalType} deleteStudent={deleteStudent} handlePrintStudentReport={handlePrintStudentReport} openStudent={openStudent} setActiveTopicMenu={setActiveTopicMenu} setActiveColMenu={setActiveColMenu} setActiveCell={setActiveCell} deleteColumn={deleteColumn} updateClassInDb={updateClassInDb} handleOpenRisk={handleOpenRisk} handlePrintPasswords={handlePrintPasswords} deleteClass={deleteClass} libraryItems={libraryItems.filter(i => i.type === LIBRARY_TYPES.CURRICULUM)} saveToLibrary={async (topic) => { if(!topic.title) return; try { await addDoc(collection(db, LIBRARY_COLLECTION), { text: topic.title, type: LIBRARY_TYPES.CURRICULUM, subTopics: topic.subTopics ? topic.subTopics.map(st => ({ title: st.title })) : [] }); } catch (e) { console.error("Kütüphane kayıt hatası:", e); } }} />}
                    {!isTeacherMode && view === 'home' && <StudentDashboard classes={classes} currentUserRole={currentUserRole} onOpenClass={openClass} />}
                    {view === 'student-detail' && selectedClass && selectedStudentForView && <StudentDetail selectedStudentForView={selectedStudentForView} selectedClass={selectedClass} currentUserRole={currentUserRole} activeTab={activeTab} setActiveTab={setActiveTab} isTeacherMode={isTeacherMode} openCellNoteModal={openCellNoteModal} updateGrade={updateGrade} updateClassInDb={updateClassInDb} />}
                </AnimatePresence>
            </main>

            {showLibraryManager && <LibraryModal libraryCategory={libraryCategory} setLibraryCategory={setLibraryCategory} libraryInput={libraryInput} setLibraryInput={setLibraryInput} libraryDate={libraryDate} setLibraryDate={setLibraryDate} libraryItems={libraryItems} addLibraryItem={addLibraryItem} deleteLibraryItem={deleteLibraryItem} onClose={() => setShowLibraryManager(false)} />}
            
            {showAssistant && <JarvisModal classes={classes} updateClassInDb={updateClassInDb} onClose={() => setShowAssistant(false)} />}

            {/* 🍎 iOS (iPHONE) KURULUM REHBERİ MODALI */}
            <AnimatePresence>
                {showIosInstallModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%'}}>
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                            <button onClick={() => setShowIosInstallModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                            <div className="bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-sm border border-emerald-500/30"><Download size={32} /></div>
                            <h3 className="text-xl font-black text-white mb-2">Uygulamayı Telefona Kur</h3>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">iPhone (iOS) güvenliği sebebiyle uygulamayı tek tıkla yükleyemiyoruz. Lütfen şu 2 adımı izleyin:</p>
                            
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-700 p-2 rounded-xl border border-slate-600 shadow-sm text-blue-400 shrink-0"><Share size={20}/></div>
                                    <div><p className="text-sm font-bold text-slate-200">Adım 1</p><p className="text-xs text-slate-400 mt-1">Ekranın en altındaki Safari menüsünden <b>"Paylaş"</b> ikonuna dokunun.</p></div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-700 p-2 rounded-xl border border-slate-600 shadow-sm text-slate-200 shrink-0"><Plus size={20}/></div>
                                    <div><p className="text-sm font-bold text-slate-200">Adım 2</p><p className="text-xs text-slate-400 mt-1">Açılan menüyü aşağı kaydırıp <b>"Ana Ekrana Ekle"</b> seçeneğini seçin.</p></div>
                                </div>
                            </div>
                            <button onClick={() => setShowIosInstallModal(false)} className="mt-6 w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-colors">Anladım</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DİĞER MODALLAR */}
            {modalType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        {modalType === 'system-settings' ? (
                            <>
                                <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><Settings size={20} className="text-brandPurple"/> Sistem Ayarları</h3>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Duyuru Başlığı</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalTitleVal} onChange={e => setModalTitleVal(e.target.value)} />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Duyuru Metni</label>
                                <textarea rows="3" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalInputVal} onChange={e => setModalInputVal(e.target.value)}></textarea>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sayaç Başlığı (Örn: 20 Haziran 2026)</label>
                                <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sayaç Hedef Tarihi</label>
                                <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} />
                            </>
                        ) : (
                            <>
                                <h3 className="font-bold text-lg mb-4 text-slate-800">{modalType === 'class' ? 'Yeni Sınıf Oluştur' : modalType === 'vip' ? 'Yeni Özel Ders Oluştur' : modalType === 'topic' ? 'Yeni Ödev Ekle' : modalType === 'edit-student' ? 'Öğrenci Adını Düzenle' : 'Düzenle'}</h3>
                                <input type="text" autoFocus className="w-full border-2 border-slate-200 rounded-xl p-3 mb-2 font-bold outline-none focus:border-brandPurple" placeholder="Başlık girin..." value={modalInputVal} onChange={e => setModalInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} />
                                
                                {modalType === 'topic' && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Veya Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.TOPIC).map(item => ( <button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-xs bg-purple-50 hover:bg-purple-100 text-brandPurple px-2.5 py-1.5 rounded-lg transition-colors font-bold border border-purple-100">{item.text}</button> ))}
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.TOPIC).length === 0 && <span className="text-[10px] text-slate-400 italic">Kütüphanede ödev başlığı yok.</span>}
                                        </div>
                                    </div>
                                )}
                                {modalType === 'source' && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Veya Kütüphaneden Seç:</label>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.SOURCE).map(item => ( <button key={item.id} onClick={() => setModalInputVal(item.text)} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors font-bold border border-emerald-100">{item.text}</button> ))}
                                            {libraryItems.filter(i => i.type === LIBRARY_TYPES.SOURCE).length === 0 && <span className="text-[10px] text-slate-400 italic">Kütüphanede kaynak başlığı yok.</span>}
                                        </div>
                                    </div>
                                )}

                                {(modalType === 'source' || modalType === 'edit-source') && ( <input type="text" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" placeholder="Google Drive Linki (İsteğe bağlı)" value={modalPdfVal} onChange={e => setModalPdfVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} /> )}
                                {(modalType === 'topic' || modalType === 'edit-topic' || modalType === 'edit-date') && ( <input type="date" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-bold text-sm outline-none focus:border-brandPurple" value={modalDateVal} onChange={e => setModalDateVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleModalSubmit()} /> )}
                            </>
                        )}
                        <div className="flex gap-2 justify-end mt-2"><button onClick={() => setModalType(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button><button onClick={handleModalSubmit} className="px-4 py-2 bg-brandPurple text-white font-bold rounded-xl hover:bg-purple-700 shadow-md">Kaydet</button></div>
                    </motion.div>
                </div>
            )}

            {activeCell && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveCell(null)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-4 rounded-2xl shadow-xl flex gap-2" onClick={e => e.stopPropagation()}>{STATUS_OPTIONS.map(opt => ( <button key={opt.id} onClick={() => updateGrade(activeCell.classId, activeCell.studentId, activeCell.colId, opt.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${opt.bg} ${opt.color} hover:scale-105 border ${opt.border}`}><opt.icon size={24} className="mb-2" strokeWidth={2.5}/><span className="text-xs font-black uppercase tracking-wider">{opt.label}</span></button> ))}</motion.div></div>}
            {activeColMenu && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveColMenu(null)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-2 rounded-2xl shadow-xl flex flex-col gap-1 w-52" onClick={e => e.stopPropagation()}><button onClick={() => { const cls = classes.find(c => c.id === activeColMenu.classId); const col = cls.topics.find(t => t.id === activeColMenu.topicId).subColumns.find(c => c.id === activeColMenu.colId); setModalData({ classId: cls.id, topicId: activeColMenu.topicId, colId: col.id }); setModalInputVal(col.title); setModalPdfVal(col.pdfLink || ""); setModalType('edit-source'); setActiveColMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Pencil size={16}/> Kaynağı Düzenle</button><button onClick={() => { deleteColumn(activeColMenu.classId, activeColMenu.topicId, activeColMenu.colId); setActiveColMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16}/> Kaynağı Sil</button></motion.div></div>}
            {activeTopicMenu && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveTopicMenu(null)}><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-2 rounded-2xl shadow-xl flex flex-col gap-1 w-56" onClick={e => e.stopPropagation()}><button onClick={() => { const cls = classes.find(c => c.id === activeTopicMenu.classId); const top = cls.topics.find(t => t.id === activeTopicMenu.topicId); setModalData({ classId: cls.id, topicId: top.id }); setModalInputVal(top.title); setModalDateVal(top.date || ""); setModalType('edit-topic'); setActiveTopicMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><Pencil size={16}/> Başlık / Tarih Düzenle</button></motion.div></div>}
            {cellNoteModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4"><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"><h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><Edit3 size={20} className="text-amber-500"/>Öğretmen Notu</h3><textarea autoFocus rows="4" className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 font-medium text-sm outline-none focus:border-amber-400" placeholder="Öğrenci için notunuzu buraya yazın..." value={cellNoteModal.note} onChange={e => setCellNoteModal({ ...cellNoteModal, note: e.target.value })}></textarea><div className="flex gap-2 justify-end mt-2"><button onClick={() => setCellNoteModal(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">İptal</button><button onClick={() => { const cls = classes.find(c => c.id === cellNoteModal.classId); const updatedStudents = cls.students.map(s => s.id === cellNoteModal.studentId ? { ...s, assignmentNotes: { ...(s.assignmentNotes || {}), [cellNoteModal.colId]: cellNoteModal.note } } : s); updateClassInDb({ ...cls, students: updatedStudents }); setCellNoteModal(null); }} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md">Notu Kaydet</button></div></motion.div></div>}
            
            {isTeacherMode && <button onClick={() => setShowAssistant(true)} className="fab-button bg-brandPurple text-white" title="Akıllı Asistan"><div className="fab-pulse"></div><Mic size={28} /></button>}
        </div>
    );
};
export default App;
