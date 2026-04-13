import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  User,
  Info,
  ShieldCheck,
  Tag,
  Store,
  Phone,
  LogOut,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const SideDrawer = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Home', icon: Home, path: '/home' },
    { label: 'My Profile', icon: User, path: '/profile' },
    { label: 'About Us', icon: Info, path: '/about' },
    { label: 'Our Stores', icon: Store, path: '/stores' },
    { label: 'Contact Us', icon: Phone, path: '/contact' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 max-w-[430px] mx-auto"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-white z-[60] shadow-2xl flex flex-col"
          >
            <div className="p-8 bg-surface border-b border-border relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-primary"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-bold border-4 border-white shadow-subtle">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-primary">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-xs font-medium text-text-muted">
                    +91 {user?.phone}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-4 px-8 py-4 text-text-secondary hover:bg-accent-light hover:text-accent transition-colors"
                >
                  <item.icon size={20} />
                  <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="p-8 border-t border-border">
              <button
                onClick={handleLogout}
                className="flex items-center gap-4 text-danger hover:opacity-80 transition-opacity"
              >
                <LogOut size={20} />
                <span className="text-sm font-black uppercase tracking-widest">Sign Out</span>
              </button>

              <div className="mt-8 text-center">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                  By Semesterless
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
