import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils';
import { useAuth } from '../../context/AuthContext';

export const BottomNav = () => {
  const { t } = useTranslation();
  const { user } = useAuth()!;
  const homePath = user?.role === 'admin' ? '/admin' : '/home';

  const navItems = [
    {
      to: homePath,
      label: t('nav.home', { defaultValue: 'Home' }),
      renderIcon: (isActive: boolean) => (
        <svg
          className={cn("w-6 h-6 transition-colors duration-200", isActive ? "text-[#86162C]" : "text-[#64748B]")}
          viewBox="0 0 24 24"
          fill={isActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={isActive ? "0" : "1.8"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2.5L2.5 10.5V20.5C2.5 21.0523 2.94772 21.5 3.5 21.5H8.5V15.5C8.5 14.6716 9.17157 14 10 14H14C14.8284 14 15.5 14.6716 15.5 15.5V21.5H20.5C21.0523 21.5 21.5 21.0523 21.5 20.5V10.5L12 2.5Z" />
        </svg>
      )
    },
    {
      to: '/my-schemes',
      label: t('nav.my_schemes', { defaultValue: 'My Subscriptions' }),
      renderIcon: (isActive: boolean) => (
        <svg
          className={cn("w-6 h-6 transition-colors duration-200", isActive ? "text-[#86162C]" : "text-[#64748B]")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <line x1="8.5" y1="8" x2="15.5" y2="8" />
          <line x1="8.5" y1="12" x2="15.5" y2="12" />
          <line x1="8.5" y1="16" x2="12.5" y2="16" />
        </svg>
      )
    },
    {
      to: '/pay-emi',
      label: t('nav.pay_emi', { defaultValue: 'Pay Subscriptions' }),
      renderIcon: (isActive: boolean) => (
        <svg
          className={cn("w-6 h-6 transition-colors duration-200", isActive ? "text-[#86162C]" : "text-[#64748B]")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
          <line x1="2.5" y1="10" x2="21.5" y2="10" />
          <rect x="15" y="14" width="3.5" height="2" rx="0.5" fill="currentColor" />
        </svg>
      )
    },
    {
      to: '/contact',
      label: t('nav.contact', { defaultValue: 'Contact' }),
      renderIcon: (isActive: boolean) => (
        <svg
          className={cn("w-6 h-6 transition-colors duration-200", isActive ? "text-[#86162C]" : "text-[#64748B]")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] bg-white border-t border-zinc-100 flex items-center z-40 max-w-[430px] mx-auto select-none shadow-[0_-4px_24px_rgba(0,0,0,0.04)] px-1">
      {navItems.map((item, idx) => (
        <React.Fragment key={item.to}>
          {idx > 0 && (
            <div className="w-[1px] h-7 bg-zinc-200/50 shrink-0 self-center" />
          )}

          <NavLink
            to={item.to}
            className="relative flex-1 h-full flex flex-col items-center justify-center pt-2 pb-2 px-1 text-center transition-all group"
          >
            {({ isActive }) => (
              <>
                {/* Icon Container */}
                <div className="h-6 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {item.renderIcon(isActive)}
                </div>

                {/* Typography with elegant serif and perfect spacing */}
                <span
                  className={cn(
                    "mt-1 font-serif text-[11px] sm:text-[12px] leading-tight tracking-normal transition-colors whitespace-nowrap",
                    isActive ? "font-bold text-[#86162C]" : "font-normal text-[#64748B]"
                  )}
                >
                  {item.label}
                </span>

                {/* Active Indicator Bar Underline */}
                {isActive ? (
                  <div className="w-12 h-[3.5px] bg-[#86162C] rounded-full mt-1.5 shadow-xs" />
                ) : (
                  <div className="w-12 h-[3.5px] bg-transparent rounded-full mt-1.5" />
                )}
              </>
            )}
          </NavLink>
        </React.Fragment>
      ))}
    </nav>
  );
};
