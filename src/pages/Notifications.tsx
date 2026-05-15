import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Bell,
  BellOff,
  Trash2,
  CheckCheck,
  Info,
  AlertCircle,
  CheckCircle2,
  Gift,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationsFromDB,
  markNotificationAsRead,
  deleteNotificationFromDB,
  clearAllNotificationsFromDB,
} from '../services/db';
import { Button } from '../components/UI/Button';

interface Notification {
  id: string;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
  timestamp: string;
}

const iconMap: Record<string, React.ReactNode> = {
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertCircle size={18} />,
  error: <AlertCircle size={18} />,
  gift: <Gift size={18} />,
};

const colorMap: Record<string, string> = {
  info: 'text-accent bg-accent-light',
  success: 'text-success bg-success-light',
  warning: 'text-warning bg-amber-50',
  error: 'text-danger bg-danger-light',
  gift: 'text-accent bg-accent-light',
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth()!;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id || user?.phone || '';

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getNotificationsFromDB(userId);
    setNotifications(data as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteNotificationFromDB(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationAsRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    await clearAllNotificationsFromDB(userId);
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper pb-24 min-h-screen bg-surface"
    >
      {/* Header */}
      <div className="bg-primary px-6 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-white tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-white/60 text-xs font-medium mt-0.5">
                {unreadCount} unread
              </p>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                  title="Mark all as read"
                >
                  <CheckCheck size={18} />
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                title="Clear all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-text-muted mb-4 shadow-subtle">
              <BellOff size={36} />
            </div>
            <h3 className="font-display font-bold text-primary text-lg">No Notifications</h3>
            <p className="text-sm text-text-secondary mt-2">
              You're all caught up! Notifications about your schemes and payments will appear here.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => navigate('/profile')}
            >
              Back to Profile
            </Button>
          </motion.div>
        ) : (
          notifications.map((n, i) => {
            const type = n.type || 'info';
            const colorClass = colorMap[type] || colorMap.info;
            const icon = iconMap[type] || iconMap.info;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white rounded-2xl p-4 shadow-subtle border-l-4 ${
                  n.read ? 'border-border/30 opacity-70' : 'border-accent'
                }`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.title && (
                      <h4 className="font-bold text-primary text-sm">{n.title}</h4>
                    )}
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        {formatTime(n.timestamp)}
                      </p>
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span className="w-2 h-2 bg-accent rounded-full inline-block" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id);
                          }}
                          className="text-text-muted hover:text-danger transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default Notifications;
