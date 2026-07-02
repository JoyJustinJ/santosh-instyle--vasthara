import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, Fingerprint, Lock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import {
  checkBiometricAvailability,
  storeBiometricCredentialId,
  getStoredBiometricCredentialId,
  verifyBiometric
} from '../utils/biometrics';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { NumericKeypad } from '../components/UI/NumericKeypad';
import { Notification, NotificationType } from '../components/UI/Notification';
import { sendOTP, verifyOTP } from '../services/sms';
import { updateUserPIN } from '../services/db';
import vastharaIcon from '../assets/logo.jpg';


const PINLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, unlockApp, logout, isBiometricEnabled: biometricEnabled, setBiometricEnabled } = useAuth()!;

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);

  const [viewMode, setViewMode] = useState<'pin' | 'otp'>('pin');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [otpError, setOtpError] = useState('');

  // Biometric states
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const showNotif = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.pin && !localStorage.getItem('vasthara_pin')) {
      navigate('/set-pin', { replace: true });
      return;
    }

    const hasBiometric = biometricEnabled && getStoredBiometricCredentialId(user.id || user.phone);
    if (hasBiometric) {
      handleBiometricLogin();
    }

    let cancelled = false;
    checkBiometricAvailability().then((available) => {
      if (cancelled) return;
      setBiometricAvailable(available);
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

  const handleInputChange = (val: string) => {
    if (lockout > 0) return;
    setPin(val);
    setError(false);
  };

  const handleLogin = () => {
    const validPin = String(user?.pin || localStorage.getItem('vasthara_pin') || '');

    if (pin === validPin && validPin.length === 4) {
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
    if (!credId) {
      setBiometricError('Biometric login is not available on this device. Use your PIN.');
      return;
    }

    try {
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

  // --- PIN Reset Flow ---
  const handleForgotPin = async () => {
    if (!user?.phone) {
      await logout();
      navigate('/login');
      return;
    }
    setLoading(true);
    const result = await sendOTP(user.phone);
    if (result.success) {
      setViewMode('otp');
      showNotif(`OTP sent to ${user.phone}`, 'success');
    } else {
      showNotif(result.error || "Failed to send OTP", 'error');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (!otp) {
      setOtpError('Required');
      return;
    }
    if (!user?.phone) return;

    setLoading(true);
    const result = await verifyOTP(user.phone, otp);
    if (result.success) {
      showNotif("Verification successful!", 'success');
      
      localStorage.removeItem('vasthara_pin');
      const userId = user?.id || (user as any)?.uid || user?.phone;
      if (userId) {
         await updateUserPIN(userId, '');
      }

      setUser({ ...user, pin: '' } as any);
      navigate('/set-pin', { replace: true });
    } else {
      showNotif(result.error || "Invalid OTP", 'error');
    }
    setLoading(false);
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
      className="page-transition-wrapper p-8 flex flex-col min-h-screen bg-surface relative"
    >
      <Notification
        isVisible={!!notification}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        onClose={() => setNotification(null)}
      />
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="flex flex-col items-center">
          <div className="w-40 flex items-center justify-center overflow-hidden">
            <img src={vastharaIcon} alt="Vastra" className="w-full h-auto object-contain mix-blend-multiply" />
          </div>
        </div>

        {viewMode === 'pin' ? (
          <>
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
            <div className="flex justify-center relative z-20">
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

          <div
            className={cn("flex justify-center gap-6", error && "animate-shake")}
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

          <NumericKeypad 
            value={pin}
            onChange={handleInputChange}
            disabled={lockout > 0}
          />

          {lockout > 0 ? (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              Locked for {lockout} seconds
            </p>
          ) : error ? (
            <p className="text-center text-xs font-bold text-danger uppercase tracking-widest">
              Incorrect PIN. {3 - attempts} attempts left.
            </p>
          ) : null}

          <div className="text-center relative z-20">
            <button
              onClick={handleForgotPin}
              disabled={loading}
              className={cn("text-xs font-black text-accent uppercase tracking-[0.2em] hover:underline", loading && "opacity-50 cursor-not-allowed")}
            >
              {loading ? 'SENDING OTP...' : 'Forgot PIN?'}
            </button>
          </div>
        </div>
        </>
        ) : (
          <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-full space-y-2 text-center">
              <button onClick={() => setViewMode('pin')} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                <ChevronLeft size={16} /> Back to PIN
              </button>
              <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Verify Identity</h2>
              <p className="text-sm font-medium text-text-secondary">Enter the OTP sent to {user?.phone}</p>
            </div>
            
            <form onSubmit={handleVerifyOTP} className="w-full space-y-6">
              <Input
                label="6-Digit Code"
                placeholder="000000"
                icon={Lock}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                error={otpError}
                autoFocus
              />
              <Button fullWidth size="lg" loading={loading}>
                Verify & Reset PIN
              </Button>
            </form>
          </div>
        )}
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
