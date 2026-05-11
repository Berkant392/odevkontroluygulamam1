import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { auth, db, CLASSES_COLLECTION, SETTINGS_COLLECTION, SETTINGS_DOC, DEFAULT_PIN } from './lib/firebase';
import Auth from './components/Auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [currentUserRole, setCurrentUserRole] = useState(null); // 'teacher', 'student'
  const [loggedInStudent, setLoggedInStudent] = useState(null);
  
  const [classes, setClasses] = useState([]);
  const [dbTeacherPin, setDbTeacherPin] = useState(DEFAULT_PIN);

  // Firebase Bağlantısı
  useEffect(() => { 
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) { console.error(e); } }; 
    initAuth(); 
    return onAuthStateChanged(auth, (u) => u && setUser(u)); 
  }, []);

  // Verileri Çekme
  useEffect(() => {
      if (!user) return;
      const qClasses = query(collection(db, CLASSES_COLLECTION));
      const unsubClasses = onSnapshot(qClasses, (snap) => { 
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
          loaded.sort((a, b) => a.className.localeCompare(b.className)); 
          setClasses(loaded); 
          setLoading(false); 
      });
      
      const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
      const unsubSettings = onSnapshot(settingsRef, (snap) => { 
          if (snap.exists()) { 
              const d = snap.data(); 
              if (d.pin !== undefined) setDbTeacherPin(String(d.pin).trim()); 
          } 
      });
      
      return () => { unsubClasses(); unsubSettings(); };
  }, [user]);

  const handleTeacherLogin = (pinInput) => {
      if (String(pinInput).trim() === String(dbTeacherPin).trim()) { 
          setCurrentUserRole('teacher'); 
      } else { 
          alert("Hatalı PIN!"); 
      }
  };

  const handleStudentLogin = (username, password) => {
      let foundStudent = null, foundClass = null;
      for (const cls of classes) { 
          const std = cls.students?.find(s => s.username === username.trim() && s.password === password.trim()); 
          if (std) { foundStudent = std; foundClass = cls; break; } 
      }
      if (foundStudent) {
          setCurrentUserRole('student'); 
          setLoggedInStudent(foundStudent); 
          // Not: İlerleyen aşamalarda Firebase'e "lastLogin" tarihini yazacağız
      } else { 
          alert('Kullanıcı adı veya şifre hatalı!'); 
      }
  };

  const handleLogout = () => { 
      setCurrentUserRole(null); 
      setLoggedInStudent(null); 
  };

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-50 text-indigo-600">
              <Loader2 className="animate-spin" size={48}/>
          </div>
      );
  }

  // Kullanıcı giriş yapmamışsa Auth bileşenini göster
  if (!currentUserRole) {
      return <Auth onTeacherLogin={handleTeacherLogin} onStudentLogin={handleStudentLogin} />;
  }

  // Geçici olarak giriş yaptıktan sonra gösterilecek basit bir ekran
  return (
      <div className="p-8">
          <h1 className="text-2xl font-bold">Hoşgeldiniz!</h1>
          <p>Şu anki Rolünüz: {currentUserRole}</p>
          {loggedInStudent && <p>Öğrenci: {loggedInStudent.name}</p>}
          <button 
              onClick={handleLogout} 
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg"
          >
              Çıkış Yap
          </button>
          
          <div className="mt-8 p-4 bg-slate-100 rounded">
             <p className="text-sm text-slate-500">
               Not: Bu sadece iskelettir. Bir sonraki aşamada (Dashboard ve Öğrenci Paneli bileşenlerini eklediğimizde) burası tam olarak eski tasarımına kavuşacaktır.
             </p>
          </div>
      </div>
  );
}
