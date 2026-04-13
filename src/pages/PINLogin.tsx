import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';

const PINLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, unlockApp } = useAuth()!;
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lockout > 0) {
      const timer = setInterval(() => setLockout(l => l - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [lockout]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (lockout > 0) return;
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError(false);
  };

  const handleLogin = () => {
    const storedPin = localStorage.getItem('vasthara_pin');

    if (pin === storedPin) {
      unlockApp();
      navigate('/home');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(true);
      setPin('');
      inputRef.current?.focus();

      if (newAttempts >= 3) {
        setLockout(30);
        setAttempts(0);
      }
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleLogin();
    }
  }, [pin]);

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
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center shadow-card relative overflow-hidden">
            <span className="text-white text-5xl font-display font-bold">V</span>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] rounded-tl-full" />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tighter mt-4 text-primary">
            VASTHARA
          </h1>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-sm font-medium text-text-secondary">
            Enter your 4-digit PIN to continue
          </p>
        </div>

        <div className="w-full space-y-8 relative">
          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={handleInputChange}
            className="absolute opacity-0 pointer-events-none"
            disabled={lockout > 0}
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
                  pin[i] ? "bg-primary border-primary" : "bg-surface",
                  error && "border-danger",
                  lockout > 0 && "opacity-50"
                )}
              >
                {pin[i] && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {lockout > 0 ? (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              Locked for {lockout} seconds
            </p>
          ) : error ? (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              Incorrect PIN. {3 - attempts} attempts left.
            </p>
          ) : null}

          <div className="text-center">
            <button 
              onClick={() => navigate('/otp-verify')}
              className="text-xs font-black text-accent uppercase tracking-[0.2em] hover:underline"
            >
              Forgot PIN?
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto text-center py-8">
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <Smartphone size={16} /> Use Mobile Number Instead
        </button>
      </div>
    </motion.div>
  );
};

export default PINLogin;
