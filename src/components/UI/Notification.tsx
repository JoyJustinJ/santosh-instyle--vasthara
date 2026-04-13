import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
    message: string;
    type: NotificationType;
    isVisible: boolean;
    onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, isVisible, onClose }) => {
    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-emerald-50/90',
                    text: 'text-emerald-800',
                    border: 'border-emerald-200/50',
                    icon: <CheckCircle className="text-emerald-500" size={18} />,
                    accent: 'bg-emerald-500'
                };
            case 'error':
                return {
                    bg: 'bg-rose-50/90',
                    text: 'text-rose-800',
                    border: 'border-rose-200/50',
                    icon: <AlertCircle className="text-rose-500" size={18} />,
                    accent: 'bg-rose-500'
                };
            case 'warning':
                return {
                    bg: 'bg-amber-50/90',
                    text: 'text-amber-800',
                    border: 'border-amber-200/50',
                    icon: <AlertCircle className="text-amber-500" size={18} />,
                    accent: 'bg-amber-500'
                };
            default:
                return {
                    bg: 'bg-sky-50/90',
                    text: 'text-sky-800',
                    border: 'border-sky-200/50',
                    icon: <Info className="text-sky-500" size={18} />,
                    accent: 'bg-sky-500'
                };
        }
    };

    const styles = getStyles();

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed top-6 left-0 right-0 z-[9999] flex justify-center px-6 pointer-events-none">
                    <motion.div
                        initial={{ y: -100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border ${styles.bg} ${styles.border} backdrop-blur-md min-w-[320px] max-w-md group overflow-hidden relative`}
                    >
                        {/* Subtle Progress Bar */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 4, ease: "linear" }}
                            className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${styles.accent} opacity-20`}
                        />

                        <div className="flex-shrink-0 bg-white shadow-sm p-1.5 rounded-lg border border-white/50">
                            {styles.icon}
                        </div>

                        <div className="flex-1 pr-2">
                            <p className={`text-sm font-bold tracking-tight ${styles.text}`}>
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="flex-shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors text-black/20 hover:text-black/40"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
