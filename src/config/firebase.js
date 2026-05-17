import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDNfK49NR1dfbN0TSb35FI85huw8YJfcyQ",
    authDomain: "odevtakip-145f5.firebaseapp.com",
    projectId: "odevtakip-145f5",
    storageBucket: "odevtakip-145f5.firebasestorage.app",
    messagingSenderId: "1083778395806",
    appId: "1:1083778395806:web:c67f99e34a11e5a330958f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// PWA için kritik: Firestore verisini cihazda önbelleğe al
// Bu sayede PWA ilk açıldığında veriler anında hazır olur ve "Yükleniyor" ekranı saniyesinde geçer
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Birden fazla sekme açık — persistence devre dışı bırakıldı.');
    } else if (err.code === 'unimplemented') {
        console.warn('Bu tarayıcı offline persistence desteklemiyor.');
    }
});
