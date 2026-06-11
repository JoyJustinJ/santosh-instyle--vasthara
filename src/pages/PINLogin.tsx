import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import {
  checkBiometricAvailability,
  storeBiometricCredentialId,
  getStoredBiometricCredentialId,
} from '../utils/biometrics';
import vastharaIcon from '../assets/vasthara-icon.jpeg';


const PINLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, unlockApp, logout, isBiometricEnabled: biometricEnabled, setBiometricEnabled } = useAuth()!;

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Biometric states
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  useEffect(() => {
    inputRef.current?.focus();

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.pin && !localStorage.getItem('vasthara_pin')) {
      navigate('/set-pin', { replace: true });
      return;
    }

    let cancelled = false;
    checkBiometricAvailability().then((available) => {
      if (cancelled) return;
      setBiometricAvailable(available);
      if (biometricEnabled && available && getStoredBiometricCredentialId(user.id || user.phone)) {
        handleBiometricLogin();
      }
    });

    return () => {
      cancelled = true;
    };
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
    const validPin = user?.pin || localStorage.getItem('vasthara_pin');

    if (pin === validPin) {
      unlockApp();
      
      // Show biometric enrolment prompt if not yet answered and device supports it
      if (!localStorage.getItem('vasthara_biometric_prompted') && biometricAvailable) {
        setShowBiometricPrompt(true);
      } else {
        navigate('/home');
      }
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

  // --- Biometric Registration ---
  const handleEnableBiometrics = async () => {
    try {
      storeBiometricCredentialId('true', user?.id || user?.phone);
      setBiometricEnabled(true);
      localStorage.setItem('vasthara_biometric_prompted', 'true');
    } catch (err) {
      console.error('Biometric registration failed', err);
    } finally {
      setShowBiometricPrompt(false);
      navigate('/home');
    }
  };

  const handleSkipBiometrics = () => {
    localStorage.setItem('vasthara_biometric_prompted', 'true');
    setShowBiometricPrompt(false);
    navigate('/home');
  };

  // --- Biometric Authentication ---
  const handleBiometricLogin = async () => {
    setBiometricError('');
    const credId = getStoredBiometricCredentialId(user?.id || user?.phone);
    const available = await checkBiometricAvailability();
    setBiometricAvailable(available);
    if (!credId || !available) {
      setBiometricError('Biometric login is not available on this device. Use your PIN.');
      return;
    }

    try {
      const { verifyBiometric } = await import('../utils/biometrics');
      const success = await verifyBiometric();

      if (success) {
        unlockApp();
        navigate('/home');
      } else {
        setBiometricError('Biometric verification failed. Use your PIN.');
      }
    } catch (err) {
      setBiometricError('Biometric verification failed. Use your PIN.');
    }
  };

  // --- Biometric Enrolment Prompt Overlay ---
  if (showBiometricPrompt) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="page-transition-wrapper p-8 flex flex-col min-h-screen items-center justify-center bg-surface"
      >
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-20 h-20 mx-auto bg-primary rounded-[28px] flex items-center justify-center shadow-card">
            <Fingerprint size={40} className="text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">
              Enable Biometrics?
            </h2>
            <p className="text-sm font-medium text-text-secondary">
              Enable Face ID / Fingerprint for faster login?
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={handleEnableBiometrics}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-sm tracking-wide shadow-card hover:opacity-90 transition-opacity"
            >
              Enable Biometrics
            </button>
            <button
              onClick={handleSkipBiometrics}
              className="w-full h-14 rounded-2xl border border-border text-text-muted font-bold text-sm tracking-wide hover:bg-surface transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-8 flex flex-col min-h-screen bg-surface"
    >
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center shadow-card overflow-hidden">
            <img src={vastharaIcon} alt="Vasthara" className="w-full h-full object-cover" />
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
          {/* Biometric button — shown only when biometrics are enrolled */}
          {biometricEnabled && biometricAvailable && getStoredBiometricCredentialId(user?.id || user?.phone) && (
            <div className="flex justify-center">
              <button
                onClick={handleBiometricLogin}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-primary text-primary font-bold text-sm tracking-wide shadow-subtle hover:bg-surface transition-colors"
              >
                <Fingerprint size={18} />
                Use Biometrics
              </button>
            </div>
          )}

          {biometricError && (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              {biometricError}
            </p>
          )}

          {/* Hidden Input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
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
                  pin[i] ? "bg-primary border-primary" : "bg-white shadow-inner",
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
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="text-xs font-black text-accent uppercase tracking-[0.2em] hover:underline"
            >
              Forgot PIN?
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto text-center py-8">
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="text-sm font-bold text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <Smartphone size={16} /> Use Mobile Number Instead
        </button>
      </div>
    </motion.div>
  );
};

export default PINLogin;
