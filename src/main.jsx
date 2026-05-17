import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 💥 ÇİFT DİKİŞ ÖNBELLEK TEMİZLEYİCİ (ZOMBİ AVCISI) 💥
// Öğrencilerin telefonunda kalan inatçı eski sürümü ve hatalı PWA'yı zorla bulur ve siler.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
      console.log('Eski PWA Service Worker zorla silindi!');
    }
  }).catch(err => console.log('SW Temizleme Hatası:', err));

  // Eski tarayıcı önbelleklerini (Cache Storage) kökten temizle
  if ('caches' in window) {
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        console.log('Eski çöp veri silindi:', key);
        return caches.delete(key);
      }));
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
