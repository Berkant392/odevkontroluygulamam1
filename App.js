import React, { useState, useEffect } from 'react';
import { AdminPanel } from './AdminPanel.js';
import { StudentView } from './StudentView.js';
import { Header, Countdown, Announcement } from './CommonUI.js';

const HomeworkTracker = () => {
    const [currentUserRole, setCurrentUserRole] = useState(null); // 'teacher' veya 'student'
    
    // ... Login/Logout fonksiyonları ...

    return (
        <div className="min-h-screen pb-20">
            <Header role={currentUserRole} onLogout={handleLogout} />
            <Countdown />
            <Announcement isTeacher={currentUserRole === 'teacher'} />
            
            <main className="max-w-6xl mx-auto px-4 mt-8">
                {currentUserRole === 'teacher' ? (
                    <AdminPanel />
                ) : (
                    <StudentView />
                )}
            </main>
        </div>
    );
};
