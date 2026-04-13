import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Sparkles, CreditCard, PhoneCall } from 'lucide-react';
import { cn } from '../../utils';

export const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/home', icon: Home, label: t('nav.home') },
    { to: '/my-schemes', icon: Sparkles, label: t('nav.my_schemes') },
    { to: '/pay-emi', icon: CreditCard, label: t('nav.pay_emi') },
    { to: '/contact', icon: PhoneCall, label: t('nav.contact') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-border flex items-center justify-around px-4 z-40 max-w-[430px] mx-auto safe-bottom">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => cn(
            'flex flex-col items-center gap-1 transition-all duration-300',
            isActive ? 'text-accent' : 'text-text-muted'
          )}
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                'p-2 rounded-xl transition-all',
                isActive && 'bg-accent-light'
              )}>
                <item.icon size={22} className={cn(isActive && 'stroke-[2.5px]')} />
              </div>
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest transition-all',
                isActive ? 'opacity-100' : 'opacity-60'
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 bg-[#D4AF37] rounded-t-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};
