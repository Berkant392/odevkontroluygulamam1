import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDNfK49NR1dfbN0TSb35FI85huw8YJfcyQ",
    authDomain: "odevtakip-145f5.firebaseapp.com",
    projectId: "odevtakip-145f5",
    storageBucket: "odevtakip-145f5.firebasestorage.app",
    messagingSenderId: "1083778395806",
    appId: "1:1083778395806:web:c67f99e34a11e5a330958f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Sabitler
export const CLASSES_COLLECTION = 'berkant_hoca_classes_secure';
export const LIBRARY_COLLECTION = 'berkant_hoca_library';
export const SETTINGS_COLLECTION = 'berkant_hoca_system_config_v2';
export const SETTINGS_DOC = 'main_config';
export const DEFAULT_PIN = "1234"; 
export const LIBRARY_TYPES = { EXCUSE: 'excuse', TOPIC: 'topic', SOURCE: 'source' };
