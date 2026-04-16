import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, Lock, Globe, ChevronDown, UserSquare2, Building2, ChevronLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Notification, NotificationType } from '../components/UI/Notification';
import { getUserFromDB, saveStaffRequestToDB } from '../services/db';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase';

// ── Hardcoded admin fallback (matches Firestore seed) ──────────────────────
const ADMIN_ID = '9345578962';
const ADMIN_PASS = 'benin123';
const ADMIN_PIN = '4444';

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithPhone, unlockApp, setUser, user } = useAuth()!;

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
  const [staffForm, setStaffForm] = useState({ name: '', branch: '', phone: '' });

  const showNotif = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // If already logged in as a normal user, go home
  useEffect(() => {
    if (user) navigate('/home');
  }, [user]);

  const toggleLang = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLang(false);
  };

  const getFriendlyError = (error: any) => {
    const code = error?.code || '';
    if (code.includes('auth/configuration-not-found')) return 'Phone login is being set up. Please use Google Login for now.';
    if (code.includes('auth/invalid-phone-number')) return "That phone number doesn't look right.";
    if (code.includes('auth/too-many-requests')) return 'Too many tries! Wait a few minutes and try again.';
    if (code.includes('auth/invalid-verification-code')) return 'The code you entered is incorrect.';
    if (code.includes('auth/network-request-failed')) return 'Connection trouble. Check your internet.';
    return 'Oops! Something went wrong. Please try again.';
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
  const isAdminPhone = (phone: string) =>
    phone === ADMIN_ID || (phone.length >= 5 && !phone.match(/^\d+$/));

  // ── Main submit ────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.phone) { setErrors({ phone: 'Required' }); return; }

    setLoading(true);
    try {
      // ── 1. Admin check (Firestore first, then hardcoded fallback) ──────────
      const { checkIsAdmin } = await import('../services/db');
      const adminData: any = await checkIsAdmin(formData.phone);

      // Admin identified in Firestore OR matched the hardcoded credentials
      const isAdminById = adminData && adminData.adminId === formData.phone;
      const isHardcodedAdmin =
        formData.phone === ADMIN_ID &&
        formData.password === ADMIN_PASS &&
        formData.securityPin === ADMIN_PIN;

      if (isAdminById || (formData.phone === ADMIN_ID && isAdminPhone(formData.phone))) {
        // Verify credentials
        const expectedPass = adminData?.password ?? ADMIN_PASS;
        const expectedPin = adminData?.securityPin ?? ADMIN_PIN;

        if (formData.password === expectedPass && formData.securityPin === expectedPin) {
          localStorage.setItem('is_admin_authenticated', 'true');
          // Primary admin = the one whose Firestore doc is "main_admin"
          // checkIsAdmin returns the HARDCODED_ADMIN object (no docId field) for the primary admin
          // Secondary admins are stored as "admin_xxxxx" docs and have a docId field set
          const isPrimary = !adminData?.docId || adminData.docId === 'main_admin';
          localStorage.setItem('is_primary_admin', isPrimary ? 'true' : 'false');
          setLoading(false);
          navigate('/admin');
          return;
        } else {
          showNotif('Invalid Admin Password or Security PIN', 'error');
          setLoading(false);
          return;
        }
      }

      // ── 2. Existing regular user / staff ───────────────────────────────────
      const userDoc: any = await getUserFromDB(formData.phone);
      if (userDoc) {
        const pinMatch = formData.password === userDoc.password || formData.password === userDoc.pin;
        if (formData.password && pinMatch) {
          setUser(userDoc);
          unlockApp();
          setLoading(false);
          navigate(userDoc.role === 'staff' ? '/staff' : '/home');
          return;
        } else {
          showNotif('Incorrect Password or PIN', 'error');
          setLoading(false);
          return;
        }
      }

      // ── 3. New user → OTP flow ─────────────────────────────────────────────
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formatted = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`;
      const confirmation = await loginWithPhone(formatted, appVerifier);
      setConfirmationResult(confirmation);
      setViewMode('otp_verify');
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
      await confirmationResult.confirm(formData.otp);
      // Firebase auth state change → AuthContext handles the rest
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
    if (!staffForm.name || !staffForm.branch) { showNotif('Please fill all fields'); return; }
    setLoading(true);
    await saveStaffRequestToDB({
      id: Math.random().toString(),
      name: staffForm.name,
      branch: staffForm.branch,
      phone: staffForm.phone,
      status: 'pending',
    });
    setLoading(false);
    showNotif('Request sent! Admin must approve your access.', 'success');
    setStaffForm({ name: '', branch: '', phone: '' });
    setViewMode('login');
  };

  // ── "Change number" resets everything back to the login form ───────────────
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
            <div className="absolute top-full left-0 mt-2 bg-white border border-border rounded-xl shadow-card overflow-hidden w-24 z-50">
              <button onClick={() => toggleLang('en')} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-surface">English</button>
              <button onClick={() => toggleLang('ta')} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-surface">தமிழ்</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center shadow-card relative overflow-hidden">
            <span className="text-white text-5xl font-display font-bold">V</span>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] rounded-tl-full" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tighter mt-6 text-primary">VASTHARA</h1>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Login form ──────────────────────────────────────────────────── */}
          {viewMode === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-8">
              <div className="w-full space-y-2 text-center">
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Welcome Back</h2>
                <p className="text-sm font-medium text-text-secondary">Login with phone or admin ID to continue</p>
              </div>

              <div className="w-full space-y-6">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <Input
                    label="Phone / Admin ID"
                    placeholder="Enter number or admin ID"
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
                  {/* Security PIN — visible when admin phone is entered */}
                  {isAdminPhone(formData.phone) && (
                    <Input
                      label="Security PIN (Admins Only)"
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
                    <span className="bg-white px-2 text-text-muted font-bold">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full h-14 bg-white border border-border rounded-xl flex items-center justify-center gap-3 hover:bg-surface shadow-subtle active:scale-95 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span className="text-sm font-bold text-text-primary">Google Account</span>
                </button>
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

          {/* ── OTP verify ─────────────────────────────────────────────────── */}
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

          {/* ── Staff request ───────────────────────────────────────────────── */}
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
