import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDrawer } from './NotificationDrawer';
import { getNotificationsFromDB } from '../../services/db';
import vastharaIcon from '../../assets/logo.jpg';

export const Navbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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

  const toggleLang = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLang(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border flex items-center justify-between px-3 sm:px-6 z-40 max-w-[430px] mx-auto transition-colors duration-300 w-full">
        <button onClick={onMenuClick} className="p-1 sm:p-2 -ml-1 sm:-ml-2 text-primary shrink-0">
          <Menu size={24} />
        </button>

        <div 
          onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/home')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <img src={vastharaIcon} alt="Vastra Logo" className="h-7 sm:h-9 w-auto object-contain mix-blend-multiply" />
          <span className="font-display font-black text-lg sm:text-xl text-primary tracking-tight">VASTRA</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowLang(!showLang)}
              className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] font-black text-text-secondary uppercase tracking-widest p-1"
            >
              <Globe size={14} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{i18n.language === 'ta' ? 'தமிழ்' : 'ENG'}</span>
              <ChevronDown size={10} className="w-2.5 h-2.5" />
            </button>

            {showLang && (
              <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-xl shadow-card overflow-hidden w-24">
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
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-background" />
            )}
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-subtle overflow-hidden ml-1"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</>
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
