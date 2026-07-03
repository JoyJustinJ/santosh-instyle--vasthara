import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, Lock, Globe, ChevronDown, UserSquare2, Building2, ChevronLeft, Shield, Fingerprint } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Notification, NotificationType } from '../components/UI/Notification';
import { validatePhone } from '../utils';
import { getUserByPhone, getStaffRequestByPhone, saveStaffRequestToDB, updateUserPassword, checkIsAdmin } from '../services/db';
import { sendOTP, verifyOTP, updateUserViaAPI } from '../services/sms';
import { RecaptchaVerifier, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

import vastharaIcon from '../assets/logo.jpg';


// Removed hardcoded admin fallback variables.

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithPhone, unlockApp, setUser, user, isUnlocked } = useAuth()!;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'login' | 'staff_request' | 'otp_verify' | 'forgot_password_otp' | 'reset_password' | 'first_time_setup_otp' | 'first_time_setup_password'>('login');
  const [showLang, setShowLang] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ phone: '', password: '', otp: '', securityPin: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<any>({});
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // ── Staff request state ────────────────────────────────────────────────────
  const [staffForm, setStaffForm] = useState({ name: '', branch: '', phone: '', password: '' });

  // ── Admin detection: live Firestore lookup as user types ──────────────────
  const [isAdminDetected, setIsAdminDetected] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const showNotif = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // If already logged in and unlocked, go home.
  useEffect(() => {
    if (user && isUnlocked) {
      navigate('/home');
    }
  }, [user, isUnlocked]);

  // ── Live admin phone detection with 500ms debounce ─────────────────────────
  useEffect(() => {
    const sanitized = formData.phone.replace(/[\s-]/g, '');
    // Only check when phone looks complete (10 digits or starts with +91)
    if (sanitized.length < 10) {
      setIsAdminDetected(false);
      return;
    }
    setCheckingAdmin(true);
    const timer = setTimeout(async () => {
      try {
        const candidates = [
          sanitized,
          sanitized.length === 10 ? `+91${sanitized}` : null,
          sanitized.startsWith('+91') ? sanitized.slice(3) : null,
        ].filter(Boolean) as string[];

        let found = false;
        for (const candidate of candidates) {
          const result = await checkIsAdmin(candidate);
          if (result) { found = true; break; }
        }
        setIsAdminDetected(found);
        // Clear securityPin if no longer admin
        if (!found) setFormData(prev => ({ ...prev, securityPin: '' }));
      } catch {
        setIsAdminDetected(false);
      } finally {
        setCheckingAdmin(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

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

  // ── Main submit ────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Sanitize phone input (remove spaces and dashes)
    const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
    if (!sanitizedPhone) { setErrors({ phone: 'Required' }); return; }
    if (!validatePhone(sanitizedPhone)) { setErrors({ phone: 'Invalid Indian phone number' }); return; }

    setLoading(true);
    try {
      // ── 1. Admin check (Firestore strictly) ──────────
      const adminData: any = await checkIsAdmin(sanitizedPhone);

      // Admin identified in Firestore strictly
      const isAdminById = adminData && adminData.adminId === sanitizedPhone;

      if (isAdminById) {
        // Verify credentials
        const expectedPass = adminData.password;
        const expectedPin = adminData.securityPin;

        if (formData.password === expectedPass && (!expectedPin || formData.securityPin === expectedPin)) {
          
          // Build name parts early so they're available everywhere below
          const nameParts = (adminData.name || 'Admin').trim().split(' ');
          const adminFirstName = nameParts[0] || 'Admin';
          const adminLastName = nameParts.slice(1).join(' ') || '';
          const isPrimary = !adminData.docId || adminData.docId === 'main_admin';

          // --- BEGIN ADMIN FIREBASE AUTH FIX ---
          let adminEmail = adminData.authEmail || `admin_${sanitizedPhone}@vasthara.com`;
          try {
            await signInWithEmailAndPassword(auth, adminEmail, formData.password);
          } catch (e: any) {
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials' || e.code === 'auth/wrong-password') {
              try {
                const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, formData.password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                  id: userCredential.user.uid,
                  phone: sanitizedPhone,
                  role: 'admin',
                  firstName: adminFirstName,
                  lastName: adminLastName,
                  name: adminData.name || 'Admin',
                  email: adminData.email || '',
                  branch: adminData.branch || 'Hosur',
                  accountCreatedVia: 'admin',
                  createdAt: adminData.createdAt || new Date().toISOString(),
                }, { merge: true });
                if (!adminData.authEmail) {
                    await setDoc(doc(db, "admins", adminData.docId || (isPrimary ? "main_admin" : `admin_${sanitizedPhone}`)), { authEmail: adminEmail }, { merge: true });
                }
              } catch (createError: any) {
                if (createError.code === 'auth/email-already-in-use') {
                  adminEmail = `admin_${sanitizedPhone}_${Date.now()}@vasthara.com`;
                  const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, formData.password);
                  await setDoc(doc(db, "users", userCredential.user.uid), {
                    id: userCredential.user.uid,
                    phone: sanitizedPhone,
                    role: 'admin',
                    firstName: adminFirstName,
                    lastName: adminLastName,
                    name: adminData.name || 'Admin',
                    email: adminData.email || '',
                    branch: adminData.branch || 'Hosur',
                    accountCreatedVia: 'admin',
                    createdAt: adminData.createdAt || new Date().toISOString(),
                  }, { merge: true });
                  await setDoc(doc(db, "admins", adminData.docId || (isPrimary ? "main_admin" : `admin_${sanitizedPhone}`)), { authEmail: adminEmail }, { merge: true });
                } else {
                  throw createError;
                }
              }
            } else {
              throw e;
            }
          }
          // --- END ADMIN FIREBASE AUTH FIX ---

          localStorage.setItem('is_admin_authenticated', 'true');
          localStorage.setItem('is_primary_admin', isPrimary ? 'true' : 'false');
          
          // Set full user profile in context
          setUser({ 
            role: 'admin', 
            firstName: adminFirstName, 
            lastName: adminLastName, 
            id: auth.currentUser?.uid || sanitizedPhone, 
            phone: sanitizedPhone,
            email: adminData.email || '',
            branch: adminData.branch || 'Hosur',
            accountCreatedVia: 'admin',
            createdAt: adminData.createdAt || new Date().toISOString(),
            emailVerified: !!adminData.email,
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
        if (userDoc.setupRequired || (!userDoc.password && !userDoc.pin)) {
          const result = await sendOTP(sanitizedPhone);
          if (result.success) {
            setViewMode('first_time_setup_otp');
            showNotif('Welcome! Please verify your phone to set up your password.', 'success');
          } else {
            showNotif(result.error || "Failed to send OTP", 'error');
          }
          setLoading(false);
          return;
        }

        if (userDoc.role === 'staff' && userDoc.status !== 'active') {
          showNotif('Your staff login is waiting for admin approval.', 'error');
          setLoading(false);
          return;
        }

        const pinMatch = String(formData.password) === String(userDoc.password) || String(formData.password) === String(userDoc.pin);
        if (formData.password && pinMatch) {
          setUser(userDoc);
          unlockApp();
          // Store phone and pin for future biometric re-login and route protection
          localStorage.setItem('vasthara_last_phone', userDoc.phone);
          localStorage.setItem('vasthara_pin', formData.password);
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
      const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
      const result = await verifyOTP(sanitizedPhone, formData.otp);
      if (result.success) {
        showNotif("Verification successful!", 'success');
        navigate('/signup', { state: { phoneNumber: sanitizedPhone } });
      } else {
        showNotif(result.error || "Invalid OTP", 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setErrors({});
    const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
    if (!sanitizedPhone) {
      setErrors({ phone: 'Please enter your phone number first' });
      return;
    }

    setLoading(true);
    try {
      let userDoc: any = null;
      for (const phoneCandidate of getPhoneCandidates(sanitizedPhone)) {
        userDoc = await getUserByPhone(phoneCandidate);
        if (userDoc) break;
      }

      if (!userDoc) {
        showNotif('Account not found with this number.', 'error');
        setLoading(false);
        return;
      }

      const result = await sendOTP(sanitizedPhone);
      if (result.success) {
        setViewMode('forgot_password_otp');
        showNotif(`OTP sent to ${sanitizedPhone}`, 'success');
      } else {
        showNotif(result.error || "Failed to send OTP", 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleVerifyForgotPasswordOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.otp) { setErrors({ otp: 'Required' }); return; }
    setLoading(true);
    try {
      const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
      const result = await verifyOTP(sanitizedPhone, formData.otp);
      if (result.success) {
        showNotif("Verification successful!", 'success');
        setViewMode('reset_password');
      } else {
        showNotif(result.error || "Invalid OTP", 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.newPassword || !formData.confirmPassword) {
      showNotif('Please fill both password fields.', 'error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showNotif('Passwords do not match.', 'error');
      return;
    }
    if (formData.newPassword.length < 4) {
      showNotif('Password must be at least 4 characters long.', 'error');
      return;
    }
    setLoading(true);
    try {
      const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
      let userDoc: any = null;
      for (const phoneCandidate of getPhoneCandidates(sanitizedPhone)) {
        userDoc = await getUserByPhone(phoneCandidate);
        if (userDoc) break;
      }
      
      if (userDoc) {
        const updateResult = await updateUserViaAPI(userDoc.id, { password: formData.newPassword });
        
        if (!updateResult.success) {
           showNotif(updateResult.error || 'Failed to update password.', 'error');
           setLoading(false);
           return;
        }

        showNotif('Password updated successfully! Please login.', 'success');
        setViewMode('login');
        setFormData({ ...formData, password: '', otp: '', newPassword: '', confirmPassword: '' });
      } else {
        showNotif('User not found.', 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleVerifyFirstTimeOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.otp) { setErrors({ otp: 'Required' }); return; }
    setLoading(true);
    try {
      const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
      const result = await verifyOTP(sanitizedPhone, formData.otp);
      if (result.success) {
        showNotif("Verification successful!", 'success');
        setViewMode('first_time_setup_password');
      } else {
        showNotif(result.error || "Invalid OTP", 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.newPassword || !formData.confirmPassword) {
      showNotif('Please fill both password fields.', 'error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showNotif('Passwords do not match.', 'error');
      return;
    }
    if (formData.newPassword.length < 4) {
      showNotif('Password must be at least 4 characters long.', 'error');
      return;
    }
    setLoading(true);
    try {
      const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
      let userDoc: any = null;
      for (const phoneCandidate of getPhoneCandidates(sanitizedPhone)) {
        userDoc = await getUserByPhone(phoneCandidate);
        if (userDoc) break;
      }
      
      if (userDoc) {
        // Update password and remove setupRequired flag
        // Update password and remove setupRequired flag using secure API to bypass client rules
        const updateResult = await updateUserViaAPI(userDoc.id, {
            password: formData.newPassword,
            setupRequired: false
        });
        
        if (!updateResult.success) {
           showNotif(updateResult.error || 'Failed to update account.', 'error');
           setLoading(false);
           return;
        }

        // Log the user in directly!
        const updatedUser = { ...userDoc, password: formData.newPassword, setupRequired: false };
        setUser(updatedUser);
        unlockApp();
        localStorage.setItem('vasthara_last_phone', updatedUser.phone);
        localStorage.setItem('vasthara_pin', formData.newPassword);
        
        showNotif('Account setup complete! Welcome.', 'success');
        setLoading(false);
        navigate('/home');
        return;
      } else {
        showNotif('User not found.', 'error');
      }
    } catch (err: any) {
      showNotif(getFriendlyError(err));
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    localStorage.removeItem('pending_signup');
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
    setFormData({ phone: '', password: '', otp: '', securityPin: '', newPassword: '', confirmPassword: '' });
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
          <div className="w-40 flex items-center justify-center overflow-hidden">
            <img src={vastharaIcon} alt="Vastra" className="w-full h-auto object-contain mix-blend-multiply" />
          </div>
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
                  {checkingAdmin && formData.phone.replace(/[\s-]/g, '').length >= 10 && (
                    <div className="flex items-center gap-2 text-xs text-text-muted px-1">
                      <div className="w-3 h-3 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                      <span>Checking admin access...</span>
                    </div>
                  )}
                  {isAdminDetected && (
                    <Input
                      label="Access Key"
                      type="password"
                      placeholder="Enter access key"
                      maxLength={10}
                      icon={Shield}
                      value={formData.securityPin}
                      onChange={(e) => setFormData({ ...formData, securityPin: e.target.value })}
                    />
                  )}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-xs font-bold text-accent hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
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
                <Input 
                  label="Setup Login Password" 
                  placeholder="Create a password" 
                  icon={Lock} 
                  type="password" 
                  required 
                  value={staffForm.password} 
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} 
                  hint="Password must be at least 6 characters"
                />
                <Button fullWidth size="lg">Submit Request</Button>
              </form>
            </motion.div>
          )}

          {viewMode === 'forgot_password_otp' && (
            <motion.div key="forgot_otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-12">
              <div className="w-full space-y-2 text-center">
                <button onClick={handleBackToLogin} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                  <ChevronLeft size={16} /> Back to Login
                </button>
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Verify OTP</h2>
                <p className="text-sm font-medium text-text-secondary">Enter code sent to {formData.phone} to reset password</p>
              </div>
              <form onSubmit={handleVerifyForgotPasswordOTP} className="w-full space-y-6">
                <Input
                  label="6-Digit Code"
                  placeholder="000000"
                  icon={Lock}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  error={errors.otp}
                  autoFocus
                />
                <Button fullWidth size="lg" loading={loading}>Verify OTP</Button>
              </form>
            </motion.div>
          )}

          {viewMode === 'reset_password' && (
            <motion.div key="reset_pass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-8">
              <div className="w-full space-y-2 text-center">
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Reset Password</h2>
                <p className="text-sm font-medium text-text-secondary">Create a new password for your account</p>
              </div>
              <form onSubmit={handleResetPassword} className="w-full space-y-6">
                <Input
                  label="New Password"
                  placeholder="Enter new password"
                  type="password"
                  icon={Lock}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  hint="Password must be at least 6 characters"
                  autoFocus
                />
                <Input
                  label="Confirm Password"
                  placeholder="Confirm new password"
                  type="password"
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <Button fullWidth size="lg" loading={loading}>Update Password</Button>
              </form>
            </motion.div>
          )}

          {viewMode === 'first_time_setup_otp' && (
            <motion.div key="first_time_otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-12">
              <div className="w-full space-y-2 text-center">
                <button onClick={handleBackToLogin} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                  <ChevronLeft size={16} /> Back to Login
                </button>
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Verify Your Phone</h2>
                <p className="text-sm font-medium text-text-secondary">Enter code sent to {formData.phone} to set up your account</p>
              </div>
              <form onSubmit={handleVerifyFirstTimeOTP} className="w-full space-y-6">
                <Input
                  label="6-Digit Code"
                  placeholder="000000"
                  icon={Lock}
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  error={errors.otp}
                  autoFocus
                />
                <Button fullWidth size="lg" loading={loading}>Verify OTP</Button>
              </form>
            </motion.div>
          )}

          {viewMode === 'first_time_setup_password' && (
            <motion.div key="first_time_pass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-8">
              <div className="w-full space-y-2 text-center">
                <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Setup Password</h2>
                <p className="text-sm font-medium text-text-secondary">Create a password for your account</p>
              </div>
              <form onSubmit={handleFirstTimeSetup} className="w-full space-y-6">
                <Input
                  label="New Password"
                  placeholder="Enter new password"
                  type="password"
                  icon={Lock}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  hint="Password must be at least 6 characters"
                  autoFocus
                />
                <Input
                  label="Confirm Password"
                  placeholder="Confirm new password"
                  type="password"
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <Button fullWidth size="lg" loading={loading}>Complete Setup &amp; Login</Button>
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
