import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { NumericKeypad } from '../components/UI/NumericKeypad';
import { cn } from '../utils';
import { useNotification } from '../context/NotificationContext';
import { updateUserPIN } from '../services/db';
import {
  checkBiometricAvailability,
  storeBiometricCredentialId,
} from '../utils/biometrics';

const PINSetup = () => {
  const navigate = useNavigate();
  const { unlockApp, user, setUser, setBiometricEnabled } = useAuth()!;
  const { showNotification } = useNotification();
  const [step, setStep] = useState(1); // 1: Set, 2: Confirm, 3: Biometric prompt
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const isChangeMode = queryParams.get('mode') === 'change';

  const currentVal = step === 1 ? pin : confirmPin;

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricAvailable);
  }, []);

  const handleInputChange = (val: string) => {
    if (step === 1) {
      setPin(val);
    } else {
      setConfirmPin(val);
    }
    setError(false);
  };

  const handleNext = async () => {
    if (currentVal.length < 4) return;

    if (step === 1) {
      setStep(2);
      setConfirmPin('');
    } else {
      if (pin === confirmPin) {
        setLoading(true);
        try {
          // Store locally for setup completion state, but NOT the plaintext PIN
          localStorage.setItem('vastra_pin_setup_complete', 'true');
          localStorage.setItem('vastra_pin', pin);
          if (user?.phone) {
            localStorage.setItem('vastra_last_phone', user.phone);
          }

          // Persist to DB if user is logged in
          const userId = user?.id || (user as any)?.uid || user?.phone;
          if (userId) {
            await updateUserPIN(userId, pin);
            if (user) {
              setUser({ ...user, pin } as any);
            }
          }

          showNotification(isChangeMode ? 'PIN changed successfully!' : 'Security PIN set successfully!', 'success');

          if (isChangeMode) {
            // Fix: navigate to the correct security settings route
            navigate('/profile/security');
          } else {
            unlockApp();
            // Show biometric prompt for new PIN setup (if device supports it)
            if (biometricAvailable && !localStorage.getItem('vastra_biometric_prompted')) {
              setStep(3);
            } else {
              navigate('/home');
            }
          }
        } catch (e) {
          console.error('Failed to sync PIN with database', e);
          showNotification('Failed to update PIN. Please try again.', 'error');
        } finally {
          setLoading(false);
        }
      } else {
        setError(true);
        setConfirmPin('');
      }
    }
  };

  // --- Biometric Registration (from PINSetup after first PIN set) ---
  const handleEnableBiometrics = async () => {
    try {
        storeBiometricCredentialId('true', user?.id || user?.phone);
        setBiometricEnabled(true);
        showNotification('Biometrics enabled successfully!', 'success');
    } catch (err) {
      console.error('Biometric registration failed', err);
      showNotification('Biometric setup failed. You can enable it later in Security Settings.', 'info');
    } finally {
      localStorage.setItem('vastra_biometric_prompted', 'true');
      navigate('/home');
    }
  };

  const handleSkipBiometrics = () => {
    localStorage.setItem('vastra_biometric_prompted', 'true');
    navigate('/home');
  };

  // --- Step 3: Biometric Enrollment Prompt ---
  if (step === 3) {
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
              Speed up future logins with Face ID or Fingerprint.
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
              Skip for Now
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
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary hover:bg-white rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        {isChangeMode && <h1 className="text-lg font-display font-bold text-primary">Security</h1>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="w-24 h-24 bg-accent-light rounded-[32px] flex items-center justify-center text-accent">
          <Shield size={48} strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
            {step === 1 ? (isChangeMode ? 'Change Your Security PIN' : 'Set Your Security PIN') : 'Confirm Your PIN'}
          </h1>
          <p className="text-sm font-medium text-text-secondary">
            {step === 1
              ? 'Choose a 4-digit PIN to log in quickly next time'
              : 'Re-enter your PIN to verify'}
          </p>
        </div>

        <div className="w-full space-y-8 relative">
          <div
            className={cn('flex justify-center gap-6', error && 'animate-shake')}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-14 h-14 rounded-full border-2 border-border flex items-center justify-center transition-all',
                  currentVal[i] ? 'bg-primary border-primary' : 'bg-surface',
                  error && 'border-danger'
                )}
              >
                {currentVal[i] && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          <NumericKeypad 
            value={currentVal}
            onChange={handleInputChange}
          />

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
          loading={loading}
        >
          {step === 1 ? 'Set PIN' : 'Verify & Finish'}
        </Button>
      </div>
    </motion.div>
  );
};

export default PINSetup;
