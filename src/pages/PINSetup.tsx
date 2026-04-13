import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { cn } from '../utils';

const PINSetup = () => {
  const navigate = useNavigate();
  const { unlockApp } = useAuth()!;
  const [step, setStep] = useState(1); // 1: Set, 2: Confirm
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentVal = step === 1 ? pin : confirmPin;

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (step === 1) {
      setPin(val);
    } else {
      setConfirmPin(val);
    }
    setError(false);
  };

  const handleNext = () => {
    if (currentVal.length < 4) return;

    if (step === 1) {
      setStep(2);
    } else {
      if (pin === confirmPin) {
        localStorage.setItem('vasthara_pin', pin);
        unlockApp();
        navigate('/home');
      } else {
        setError(true);
        setConfirmPin('');
        inputRef.current?.focus();
      }
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-8 flex flex-col min-h-screen"
    >
      {step === 2 && (
        <button onClick={() => setStep(1)} className="p-2 -ml-2 text-primary self-start mb-8">
          <ChevronLeft size={24} />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="w-24 h-24 bg-accent-light rounded-[32px] flex items-center justify-center text-accent">
          <Shield size={48} strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
            {step === 1 ? "Set Your Security PIN" : "Confirm Your PIN"}
          </h1>
          <p className="text-sm font-medium text-text-secondary">
            {step === 1 
              ? "Choose a 4-digit PIN to log in quickly next time" 
              : "Re-enter your PIN to verify"}
          </p>
        </div>

        <div className="w-full space-y-8 relative">
          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={currentVal}
            onChange={handleInputChange}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
          />

          <div 
            className={cn("flex justify-center gap-6 cursor-pointer", error && "animate-shake")}
            onClick={handleContainerClick}
          >
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={cn(
                  "w-14 h-14 rounded-full border-2 border-border flex items-center justify-center transition-all",
                  currentVal[i] ? "bg-primary border-primary" : "bg-surface",
                  error && "border-danger"
                )}
              >
                {currentVal[i] && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              PINs do not match. Try again.
            </p>
          )}
        </div>

        <Button 
          fullWidth 
          size="lg" 
          onClick={handleNext}
          disabled={currentVal.length < 4}
        >
          {step === 1 ? "Set PIN" : "Verify & Finish"}
        </Button>
      </div>
    </motion.div>
  );
};

export default PINSetup;
