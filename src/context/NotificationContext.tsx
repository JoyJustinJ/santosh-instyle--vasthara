import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification, NotificationType } from '../components/UI/Notification';
import { AnimatePresence } from 'framer-motion';

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notif, setNotif] = useState<{ message: string; type: NotificationType } | null>(null);

    const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
        setNotif({ message, type });
        setTimeout(() => setNotif(null), 5000);
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <AnimatePresence>
                {notif && (
                    <div className="fixed top-6 left-6 right-6 z-[9999] pointer-events-none">
                        <Notification
                            isVisible={true}
                            message={notif.message}
                            type={notif.type}
                            onClose={() => setNotif(null)}
                        />
                    </div>
                )}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
