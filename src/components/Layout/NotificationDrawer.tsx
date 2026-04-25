import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, BellOff, CheckCircle2, Info, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../UI/Button';
import { getNotificationsFromDB, deleteNotificationFromDB, clearAllNotificationsFromDB, markNotificationAsRead } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationDrawer = ({ isOpen, onClose }: NotificationDrawerProps) => {
    const { user } = useAuth()!;
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            loadNotifications();
        }
    }, [isOpen, user]);

    const loadNotifications = async () => {
        setLoading(true);
        const data = await getNotificationsFromDB(user.id);
        setNotifications(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        await deleteNotificationFromDB(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleClearAll = async () => {
        if (!window.confirm('Clear all notifications?')) return;
        await clearAllNotificationsFromDB(user.id);
        setNotifications([]);
    };

    const handleMarkRead = async (id: string, currentlyRead: boolean) => {
        if (currentlyRead) return;
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-success" size={18} />;
            case 'warning': return <AlertTriangle className="text-warning" size={18} />;
            case 'error': return <AlertTriangle className="text-danger" size={18} />;
            default: return <Info className="text-accent" size={18} />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] max-w-[430px] mx-auto"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px] bg-white z-[101] shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-display font-bold text-primary">Notifications</h2>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5">
                                    Recent activities
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-surface rounded-full transition-colors text-text-secondary"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-12 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Loading...</p>
                                </div>
                            ) : notifications.length > 0 ? (
                                <div className="divide-y divide-border/50">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleMarkRead(notification.id, notification.read)}
                                            className={cn(
                                                "p-4 transition-colors hover:bg-surface relative group",
                                                !notification.read && "bg-accent/5"
                                            )}
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-1 flex-shrink-0">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className={cn("text-sm font-bold", notification.read ? "text-primary" : "text-accent")}>
                                                            {notification.title}
                                                        </h3>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                                                            className="p-1.5 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-text-secondary leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted pt-1">
                                                        <Clock size={10} />
                                                        <span>{notification.time || new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {!notification.read && (
                                                <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-accent rounded-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                                    <div className="w-16 h-16 bg-surface rounded-[24px] flex items-center justify-center text-text-muted">
                                        <BellOff size={32} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-display font-bold text-primary">All caught up!</h3>
                                        <p className="text-xs text-text-secondary mt-1">No new notifications to show.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-4 bg-surface/50 border-t border-border">
                                <Button
                                    variant="outline"
                                    fullWidth
                                    onClick={handleClearAll}
                                    className="text-danger border-danger/20 hover:bg-danger/5"
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
