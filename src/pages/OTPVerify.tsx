import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, ChevronLeft, CheckCircle2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/UI/Button';
import { cn } from '../utils';
import { createUserProfile } from '../services/db';

const OTPVerify = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<'phone' | 'email'>('phone');
  const [targetValue, setTargetValue] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    const pendingData = localStorage.getItem('pending_signup');
    if (pendingData) {
      const data = JSON.parse(pendingData);
      setVerifyMethod(data.verifyMethod || 'phone');
      setTargetValue(data.verifyMethod === 'email' ? data.email : data.phone);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 6) return;

    setLoading(true);
    // Simulate verification
    setTimeout(async () => {
      if (code === '123456') {
        const pendingData = localStorage.getItem('pending_signup');
        if (pendingData) {
          const userData = JSON.parse(pendingData);
          await createUserProfile(userData);
          localStorage.removeItem('pending_signup');
        }
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(true);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0].focus();
      }
      setLoading(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-8 flex flex-col min-h-screen"
    >
      <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary self-start mb-8">
        <ChevronLeft size={24} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="relative">
          <div className="w-24 h-24 bg-accent-light rounded-[32px] flex items-center justify-center text-accent">
            {verifyMethod === 'email' ? <Mail size={48} strokeWidth={1.5} /> : <Smartphone size={48} strokeWidth={1.5} />}
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-warning rounded-full flex items-center justify-center text-white"
          >
            <Sparkles size={16} />
          </motion.div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
            {verifyMethod === 'email' ? 'Verify Email' : t('otp.title')}
          </h1>
          <p className="text-sm font-medium text-text-secondary">
            {verifyMethod === 'email'
              ? `We've sent a code to ${targetValue}`
              : t('otp.subtext', { phone: `+91 ${targetValue.slice(-4).padStart(targetValue.length, '*')}` })
            }
          </p>
        </div>

        <div className="w-full space-y-8">
          <div className={cn("flex justify-between gap-2", error && "animate-shake")}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={cn(
                  "w-12 h-16 bg-surface border-2 border-border rounded-xl text-center text-2xl font-bold text-primary focus:border-accent focus:bg-white outline-none transition-all",
                  error && "border-danger text-danger"
                )}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              Invalid OTP. Try again.
            </p>
          )}

          <div className="text-center">
            {timer > 0 ? (
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                {t('otp.resend', { timer: `00:${timer < 10 ? `0${timer}` : timer}` })}
              </p>
            ) : (
              <button
                onClick={() => setTimer(30)}
                className="text-xs font-black text-accent uppercase tracking-[0.2em] hover:underline"
              >
                {t('otp.resend_btn')}
              </button>
            )}
          </div>
        </div>

        <Button fullWidth size="lg" loading={loading} onClick={handleVerify}>
          {t('otp.verify_btn')}
        </Button>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="w-24 h-24 bg-success rounded-full flex items-center justify-center text-white shadow-card"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-primary">Verification Successful</h2>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Sparkles = ({ size, className = '' }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" />
  </svg>
);

export default OTPVerify;
