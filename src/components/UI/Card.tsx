import React from 'react';
import { cn } from '../../utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, loading = false, ...props }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && !loading && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={loading ? undefined : onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !loading ? 0 : undefined}
      className={cn(
        'bg-surface border border-border rounded-2xl p-4 shadow-subtle transition-all relative overflow-hidden',
        onClick && !loading && 'cursor-pointer active:scale-[0.98] hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        loading && 'opacity-80 pointer-events-none cursor-wait',
        className
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-[1px] z-20 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-primary">Loading...</span>
        </div>
      )}
      {children}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-accent-light text-accent',
    success: 'bg-success-light text-success',
    danger: 'bg-danger-light text-danger',
    warning: 'bg-warning/10 text-warning',
    primary: 'bg-primary text-white',
  };

  return (
    <span className={cn(
      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
