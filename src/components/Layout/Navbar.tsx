import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDrawer } from './NotificationDrawer';
import { getNotificationsFromDB } from '../../services/db';

export const Navbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth()!;
  const [showLang, setShowLang] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    if (user?.id) {
      try {
        const notifs = await getNotificationsFromDB(user.id);
        const unread = notifs.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    } else {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const toggleLang = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLang(false);
  };

  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || 'T';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#2e050d] flex items-center justify-between px-3 sm:px-4 z-40 max-w-[430px] mx-auto w-full shadow-md select-none">
        {/* Hamburger Menu */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="p-2 text-white hover:text-white/80 transition-colors shrink-0 flex items-center justify-center -ml-1"
        >
          <Menu size={24} className="stroke-[2.2]" />
        </button>

        {/* Brand Header Logo */}
        <div
          onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/home')}
          className="flex items-center cursor-pointer transition-transform active:scale-95 shrink-0"
        >
          <img
            src="/assets/brand_logo_trimmed.png"
            alt="Santhosh Silks | VASTRA"
            className="h-8 sm:h-8.5 w-auto object-contain"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Language Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLang(!showLang)}
              className="flex items-center gap-1 text-[11px] font-semibold text-white/95 uppercase tracking-wide px-1.5 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <Globe size={15} className="text-white/90" />
              <span>{i18n.language === 'ta' ? 'தமிழ்' : 'ENG'}</span>
              <ChevronDown size={12} className="text-white/80" />
            </button>

            {showLang && (
              <div className="absolute top-full right-0 mt-2 bg-white text-zinc-900 border border-zinc-200 rounded-xl shadow-xl overflow-hidden w-28 z-50">
                <button
                  onClick={() => toggleLang('en')}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-zinc-100 transition-colors"
                >
                  English
                </button>
                <button
                  onClick={() => toggleLang('ta')}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-zinc-100 transition-colors"
                >
                  தமிழ்
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => setIsNotifOpen(true)}
            aria-label="Notifications"
            className="relative p-1.5 text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
          >
            <Bell size={20} className="stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#E53E3E] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-[#2e050d] shadow-sm animate-in fade-in zoom-in duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Circle Avatar */}
          <button
            onClick={() => navigate('/profile')}
            aria-label="Profile"
            className="w-8 h-8 rounded-full bg-white text-zinc-900 flex items-center justify-center text-xs font-bold shadow-md hover:ring-2 hover:ring-white/40 transition-all overflow-hidden ml-0.5"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{userInitial}</span>
            )}
          </button>
        </div>
      </nav>

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => {
          setIsNotifOpen(false);
          refreshUnreadCount();
        }}
        onUpdate={refreshUnreadCount}
      />
    </>
  );
};
