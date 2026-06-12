import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, Lock, Globe, ChevronDown, UserSquare2, Building2, ChevronLeft, Shield, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Notification, NotificationType } from '../components/UI/Notification';
import { getUserByPhone, getStaffRequestByPhone, saveStaffRequestToDB } from '../services/db';
import { sendOTP, verifyOTP } from '../services/sms';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase';

import vastharaIcon from '../assets/vasthara-icon.jpeg';


// ── Admin fallback (stored in .env for security) ──────────────────────────
// ── Admin fallback (stored in .env for security) ──────────────────────────
const ADMIN_ID = (import.meta.env.VITE_ADMIN_ID || '9840077747').trim();
const ADMIN_PASS = (import.meta.env.VITE_ADMIN_PASS || 'benin123').trim();
const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN || '4444').trim();

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithPhone, unlockApp, setUser, user, isUnlocked } = useAuth()!;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'login' | 'staff_request' | 'otp_verify'>('login');
  const [showLang, setShowLang] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ phone: '', password: '', otp: '', securityPin: '' });
  const [errors, setErrors] = useState<any>({});
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // ── Staff request state ────────────────────────────────────────────────────
  const [staffForm, setStaffForm] = useState({ name: '', branch: '', phone: '', password: '' });

  const showNotif = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // If already logged in and unlocked, go home. If PIN-locked, allow this page
  // to stay available for password recovery or switching accounts.
  useEffect(() => {
    if (user && isUnlocked) {
      navigate('/home');
    }
  }, [user, isUnlocked]);

  const toggleLang = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLang(false);
  };

  const getFriendlyError = (error: any) => {
    console.error("Auth Error:", error);
    const code = error?.code || '';
    if (code.includes('auth/configuration-not-found')) return 'Phone login is being set up. Please use Google Login for now.';
    if (code.includes('auth/invalid-phone-number')) return "That phone number doesn't look right.";
    if (code.includes('auth/too-many-requests')) return 'Too many tries! Wait a few minutes and try again.';
    if (code.includes('auth/invalid-verification-code')) return 'The code you entered is incorrect.';
    if (code.includes('auth/network-request-failed')) return 'Connection trouble. Check your internet.';
    return error?.message || 'Oops! Something went wrong. Please try again.';
  };

  const getPhoneCandidates = (phone: string) => {
    const sanitized = phone.replace(/[\s-]/g, '');
    const candidates = [sanitized];
    if (!sanitized.startsWith('+') && sanitized.length === 10) {
      candidates.push(`+91${sanitized}`);
    }
    if (sanitized.startsWith('+91') && sanitized.length === 13) {
      candidates.push(sanitized.slice(3));
    }
    return Array.from(new Set(candidates.filter(Boolean)));
  };

  const setupRecaptcha = () => {
    auth.languageCode = i18n.language;
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { },
      });
    }
  };

  // ── Helper: is the typed phone the admin number? ──────────────────────────
  const isAdminPhone = (phone: string) => {
    const sanitized = phone.replace(/[\s-]/g, '');
    return sanitized === ADMIN_ID || (sanitized.length >= 5 && !sanitized.match(/^\d+$/));
  };

  // ── Main submit ────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Sanitize phone input (remove spaces and dashes)
    const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
    if (!sanitizedPhone) { setErrors({ phone: 'Required' }); return; }

    setLoading(true);
    try {
      // ── 1. Admin check (Firestore first, then hardcoded fallback) ──────────
      const { checkIsAdmin } = await import('../services/db');
      const adminData: any = await checkIsAdmin(sanitizedPhone);

      // Admin identified in Firestore OR matched the hardcoded credentials
      const isAdminById = adminData && adminData.adminId === sanitizedPhone;
      const isHardcodedAdmin =
        sanitizedPhone === ADMIN_ID &&
        formData.password === ADMIN_PASS &&
        formData.securityPin === ADMIN_PIN;

      if (isAdminById || (sanitizedPhone === ADMIN_ID && isAdminPhone(sanitizedPhone))) {
        // Verify credentials
        const expectedPass = adminData?.password ?? ADMIN_PASS;
        const expectedPin = adminData?.securityPin ?? ADMIN_PIN;

        if (formData.password === expectedPass && formData.securityPin === expectedPin) {
          localStorage.setItem('is_admin_authenticated', 'true');
          const isPrimary = !adminData?.docId || adminData.docId === 'main_admin';
          localStorage.setItem('is_primary_admin', isPrimary ? 'true' : 'false');
          
          // Update context state immediately
          setUser({ 
            role: 'admin', 
            firstName: 'Admin', 
            lastName: 'User', 
            id: 'admin', 
            pin: 'ADMIN_BYPASS' 
          } as any);

          setLoading(false);
          navigate('/admin');
          return;
        } else {
          showNotif('Invalid Password or Access Key', 'error');
          setLoading(false);
          return;
        }
      }

      // ── 2. Existing regular user / staff ───────────────────────────────────
      let userDoc: any = null;
      for (const phoneCandidate of getPhoneCandidates(sanitizedPhone)) {
        userDoc = await getUserByPhone(phoneCandidate);
        if (userDoc) break;
      }

      if (userDoc) {
        if (userDoc.role === 'staff' && userDoc.status !== 'active') {
          showNotif('Your staff login is waiting for admin approval.', 'error');
          setLoading(false);
          return;
        }

        const pinMatch = formData.password === userDoc.password || formData.password === userDoc.pin;
        if (formData.password && pinMatch) {
          setUser(userDoc);
          unlockApp();
          // Store phone and pin for future biometric re-login and route protection
          localStorage.setItem('vasthara_last_phone', userDoc.phone);
          localStorage.setItem('vasthara_pin', userDoc.pin || '');
          setLoading(false);
          navigate('/home');
          return;
        } else {
          showNotif('Incorrect Password or PIN', 'error');
          setLoading(false);
          return;
        }
      }

      for (const phoneCandidate of getPhoneCandidates(sanitizedPhone)) {
        const pendingStaff: any = await getStaffRequestByPhone(phoneCandidate);
        if (pendingStaff) {
          showNotif(
            pendingStaff.status === 'rejected'
              ? 'Your staff access request was not approved.'
              : 'Your staff access request is waiting for admin approval.',
            'error'
          );
          setLoading(false);
          return;
        }
      }

      // ── 3. New user → OTP flow ─────────────────────────────────────────────
      const result = await sendOTP(sanitizedPhone);
      if (result.success) {
        setViewMode('otp_verify');
      } else {
        showNotif(result.error || "Failed to send OTP", 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };



  // ── OTP verify ─────────────────────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.otp) { setErrors({ otp: 'Required' }); return; }
    setLoading(true);
    try {
      const result = await verifyOTP(formData.phone, formData.otp);
      if (result.success) {
        showNotif("Verification successful!", 'success');
        navigate('/signup', { state: { phoneNumber: formData.phone } });
      } else {
        showNotif(result.error || "Invalid OTP", 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try { await loginWithGoogle(); }
    catch (err: any) { showNotif(getFriendlyError(err)); }
    setLoading(false);
  };

  const handleStaffRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedPhone = staffForm.phone.replace(/[\s-]/g, '');
    if (!staffForm.name || !staffForm.branch || !sanitizedPhone || !staffForm.password) { showNotif('Please fill all fields'); return; }
    setLoading(true);
    const existingStaff = await getUserByPhone(sanitizedPhone);
    const pendingStaff = await getStaffRequestByPhone(sanitizedPhone);
    if (existingStaff || pendingStaff) {
      setLoading(false);
      showNotif(existingStaff ? 'An account with this mobile number already exists.' : 'A staff request for this mobile number is already pending.');
      return;
    }
    await saveStaffRequestToDB({
      id: sanitizedPhone,
      name: staffForm.name,
      branch: staffForm.branch,
      phone: sanitizedPhone,
      password: staffForm.password,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });
    setLoading(false);
    showNotif('Request sent! Management must approve your access.', 'success');
    setStaffForm({ name: '', branch: '', phone: '', password: '' });
    setViewMode('login');
  };

  const handleBackToLogin = () => {
    setViewMode('login');
    setFormData({ phone: '', password: '', otp: '', securityPin: '' });
    setErrors({});
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-8 flex flex-col min-h-screen relative"
    >
      <div id="recaptcha-container" />

      <Notification
        isVisible={!!notification}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        onClose={() => setNotification(null)}
      />

      {/* Language toggle */}
      <div className="flex items-center justify-between relative">
        <div className="relative">
          <button
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-1 text-[10px] font-black text-text-secondary uppercase tracking-widest"
          >
            <Globe size={14} />
            {i18n.language === 'ta' ? 'தமிழ்' : 'ENG'}
            <ChevronDown size={10} />
          </button>
          {showLang && (
            <div className="absolute top-full left-0 mt-2 bg-surface border border-border rounded-xl shadow-card overflow-hidden w-24 z-50">
              <button onClick={() => toggleLang('en')} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-background">English</button>
              <button onClick={() => toggleLang('ta')} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-background">தமிழ்</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center shadow-card overflow-hidden">
            <img src={vastharaIcon} alt="Vasthara" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tighter mt-6 text-primary">VASTHARA</h1>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-8">
              <div className="w-full space-y-2 text-center">
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Welcome Back</h2>
                <p className="text-sm font-medium text-text-secondary">Login with phone to continue</p>
              </div>

              <div className="w-full space-y-6">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <Input
                    label="Phone Number"
                    placeholder="Enter phone number"
                    icon={Smartphone}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={errors.phone}
                  />
                  <Input
                    label="Password / PIN"
                    placeholder="Enter password or PIN"
                    type="password"
                    icon={Lock}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {isAdminPhone(formData.phone) && (
                    <Input
                      label="Access Key"
                      type="password"
                      placeholder="0000"
                      maxLength={4}
                      icon={Shield}
                      value={formData.securityPin}
                      onChange={(e) => setFormData({ ...formData, securityPin: e.target.value })}
                    />
                  )}
                  <div className="pt-2">
                    <Button fullWidth size="lg" loading={loading}>Login</Button>
                  </div>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-text-muted font-bold">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-14 bg-surface border border-border rounded-xl flex items-center justify-center gap-3 hover:opacity-80 shadow-subtle active:scale-95 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span className="text-sm font-bold text-text-primary">Google Account</span>
                </button>

                {biometricEnabled && biometricAvailable && getStoredBiometricCredentialId(localStorage.getItem('vasthara_last_phone') || undefined) && (
                  <button
                    onClick={handleBiometricLogin}
                    className="w-full h-14 mt-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-center gap-3 hover:bg-primary/10 transition-all text-primary"
                  >
                    <Fingerprint size={20} />
                    <span className="text-sm font-bold">Login with Biometrics</span>
                  </button>
                )}
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm font-medium text-text-secondary">
                  New user?
                  <button onClick={() => navigate('/signup')} className="text-accent font-bold ml-1 hover:underline">Create Account</button>
                </p>
                <div className="pt-6 border-t border-border/50">
                  <button onClick={() => setViewMode('staff_request')} className="text-xs font-bold text-text-muted hover:text-primary flex items-center justify-center gap-2 mx-auto">
                    <UserSquare2 size={16} /> Request Staff Access Form
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'otp_verify' && (
            <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-12">
              <div className="w-full space-y-2 text-center">
                <button onClick={handleBackToLogin} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                  <ChevronLeft size={16} /> Change Number
                </button>
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Verify OTP</h2>
                <p className="text-sm font-medium text-text-secondary">Enter code sent to {formData.phone}</p>
              </div>
              <form onSubmit={handleVerifyOTP} className="w-full space-y-6">
                <Input
                  label="6-Digit Code"
                  placeholder="000000"
                  icon={Lock}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  error={errors.otp}
                />
                <Button fullWidth size="lg" loading={loading}>Verify &amp; Login</Button>
              </form>
            </motion.div>
          )}

          {viewMode === 'staff_request' && (
            <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-8">
              <div className="w-full space-y-2 text-center">
                <button onClick={() => setViewMode('login')} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                  <ChevronLeft size={16} /> Back to Login
                </button>
                <h2 className="text-2xl font-display font-bold text-primary tracking-tight">Staff Request</h2>
                <p className="text-sm font-medium text-text-secondary">Submit a request to management for Staff Console authority.</p>
              </div>
              <form onSubmit={handleStaffRequest} className="w-full space-y-6">
                <Input label="Full Name" placeholder="Enter full name" icon={UserSquare2} required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                <Input label="Branch Name" placeholder="Enter branch name" icon={Building2} required value={staffForm.branch} onChange={(e) => setStaffForm({ ...staffForm, branch: e.target.value })} />
                <Input label="Mobile Number" placeholder="Your contact number" icon={Smartphone} required value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                <Input label="Setup Login Password" placeholder="Create a password" icon={Lock} type="password" required value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                <Button fullWidth size="lg">Submit Request</Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto text-center py-4">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">V-1.0.0</p>
      </div>
    </motion.div>
  );
};

export default Login;
