import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Bell, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDrawer } from './NotificationDrawer';
import { getNotificationsFromDB } from '../../services/db';

export const Navbar = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth()!;
  const [showLang, setShowLang] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const loadUnreadCount = async () => {
        const notifs = await getNotificationsFromDB(user.id);
        const unread = notifs.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      };
      loadUnreadCount();
      // Periodically refresh count or use a listener in a real app
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const toggleLang = (lang) => {
    i18n.changeLanguage(lang);
    setShowLang(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border flex items-center justify-between px-6 z-40 max-w-[430px] mx-auto">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-primary">
          <Menu size={24} />
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-xl font-display font-bold tracking-tighter text-primary">
            VASTHARA
          </h1>
          <div className="h-0.5 w-8 bg-[#D4AF37] -mt-1" />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLang(!showLang)}
              className="flex items-center gap-1 text-[10px] font-black text-text-secondary uppercase tracking-widest"
            >
              <Globe size={14} />
              {i18n.language === 'ta' ? 'தமிழ்' : 'ENG'}
              <ChevronDown size={10} />
            </button>

            {showLang && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-border rounded-xl shadow-card overflow-hidden w-24">
                <button
                  onClick={() => toggleLang('en')}
                  className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-surface"
                >
                  English
                </button>
                <button
                  onClick={() => toggleLang('ta')}
                  className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-surface"
                >
                  தமிழ்
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 text-primary hover:bg-surface rounded-full transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </nav>

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </>
  );
};
