import React from 'react';
import { motion } from 'motion/react';

interface ProgressBarProps {
  current: number;
  total: number;
  variant?: 'active' | 'matured';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  current, 
  total, 
  variant = 'active' 
}) => {
  const safeTotal = total > 0 ? total : 1;
  const safeCurrent = Math.max(current || 0, 0);
  const percentage = Math.min((safeCurrent / safeTotal) * 100, 100);
  const color = variant === 'active' ? 'bg-accent' : 'bg-success';

  return (
    <div className="space-y-1.5">
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
      <p className="text-xs text-text-secondary">{safeCurrent} of {total || 0} months paid</p>
    </div>
  );
};
