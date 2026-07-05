import React from 'react';
import { Delete } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  value, 
  onChange, 
  maxLength = 4,
  disabled = false 
}) => {
  const handlePress = (num: number) => {
    if (disabled) return;
    if (value.length < maxLength) {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10);
      }
      onChange(value + num.toString());
    }
  };

  const handleDelete = () => {
    if (disabled) return;
    if (value.length > 0) {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10);
      }
      onChange(value.slice(0, -1));
    }
  };

  const buttons = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9
  ];

  return (
    <div className="w-full max-w-[280px] mx-auto grid grid-cols-3 gap-y-2 gap-x-4 mt-6 relative z-30">
      {buttons.map((num) => (
        <motion.button
          whileTap={{ scale: 0.85 }}
          key={num}
          disabled={disabled}
          onClick={() => handlePress(num)}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-display font-medium text-text-primary mx-auto transition-colors focus:outline-none focus:bg-accent/10 active:bg-accent/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {num}
        </motion.button>
      ))}
      
      {/* Empty slot for layout alignment */}
      <div />
      
      <motion.button
        whileTap={{ scale: 0.85 }}
        disabled={disabled}
        onClick={() => handlePress(0)}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-display font-medium text-text-primary mx-auto transition-colors focus:outline-none focus:bg-accent/10 active:bg-accent/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        0
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.85 }}
        disabled={disabled || value.length === 0}
        onClick={handleDelete}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center text-text-secondary mx-auto transition-colors focus:outline-none focus:bg-accent/10 active:bg-accent/20",
          (disabled || value.length === 0) && "opacity-50 cursor-not-allowed"
        )}
      >
        <Delete size={28} strokeWidth={1.5} />
      </motion.button>
    </div>
  );
};
