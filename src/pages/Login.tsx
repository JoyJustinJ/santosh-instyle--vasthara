import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Smartphone, Lock, Globe, ChevronDown, UserSquare2, Building2, ChevronLeft, LogIn, AlertCircle, X, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Notification, NotificationType } from '../components/UI/Notification';
import { getUserFromDB, saveStaffRequestToDB } from '../services/db';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithPhone, user } = useAuth()!;
  const [viewMode, setViewMode] = useState<'login' | 'staff_request' | 'otp_verify'>('login');
  const [showLang, setShowLang] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const showNotification = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Login State
  const [formData, setFormData] = useState({ phone: '', password: '', otp: '' });
  const [errors, setErrors] = useState<any>({});
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Staff Request State
  const [staffForm, setStaffForm] = useState({ name: '', branch: '', phone: '' });

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user]);

  const toggleLang = (lang: string) => {
    i18n.changeLanguage(lang);
    setShowLang(false);
  };

  const getFriendlyErrorMessage = (error: any) => {
    const code = error.code || '';
    if (code.includes('auth/configuration-not-found')) {
      return "Phone login is currently being configured. Please use Google Login or try again later.";
    }
    if (code.includes('auth/invalid-phone-number')) {
      return "The phone number you entered is invalid. Please check and try again.";
    }
    if (code.includes('auth/too-many-requests')) {
      return "Too many attempts. Please wait a few minutes before trying again.";
    }
    if (code.includes('auth/invalid-verification-code')) {
      return "The OTP code is incorrect. Please check and try again.";
    }
    if (code.includes('auth/unauthorized-domain')) {
      return "Domain Check: Please add 'localhost' to Authorized Domains in your Firebase Console.";
    }
    // Return the actual code if unknown to help the user debug
    return `Security Error (${code || 'Unknown'}). Please check your Firebase settings or internet.`;
  };

  const setupRecaptcha = () => {
    // Sync Firebase language with app language (e.g. 'ta' for Tamil, 'en' for English)
    auth.languageCode = i18n.language;

    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => { }
      });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.phone) {
      setErrors({ phone: 'Required' });
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`;
      const confirmation = await loginWithPhone(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      process.env.NODE_ENV === 'development' && console.log("OTP Sent");
      setViewMode('otp_verify');
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error));
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!formData.otp) {
      setErrors({ otp: 'Required' });
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(formData.otp);
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error));
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      showNotification(getFriendlyErrorMessage(error));
    }
    setLoading(false);
  };

  const handleStaffRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.branch) {
      showNotification("Please fill all fields");
      return;
    }

    setLoading(true);
    const newRequest = {
      id: Math.random().toString(),
      name: staffForm.name,
      branch: staffForm.branch,
      phone: staffForm.phone,
      status: 'pending'
    };

    await saveStaffRequestToDB(newRequest);
    setLoading(false);

    showNotification("Request Sent! Admin must approve your access.", 'success');
    setStaffForm({ name: '', branch: '', phone: '' });
    setViewMode('login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-8 flex flex-col min-h-screen relative"
    >
      <div id="recaptcha-container"></div>

      <Notification
        isVisible={!!notification}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        onClose={() => setNotification(null)}
      />

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

        {/* Admin Access Shield Icon */}
        <button
          onClick={() => navigate('/admin-login')}
          className="p-2 -mr-2 text-text-secondary hover:text-primary transition-colors"
          title="Admin Access"
        >
          <Shield size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center shadow-card relative overflow-hidden group">
            <span className="text-white text-5xl font-display font-bold">V</span>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] rounded-tl-full" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tighter mt-6 text-primary">
            VASTHARA
          </h1>
        </div>

        {viewMode === 'login' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-12">
            <div className="w-full space-y-2 text-center">
              <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">
                Welcome Back
              </h2>
              <p className="text-sm font-medium text-text-secondary">
                Login with your phone to continue
              </p>
            </div>

            <div className="w-full space-y-6">
              <form onSubmit={handlePhoneLogin} className="space-y-6">
                <Input
                  label="Mobile Number"
                  placeholder="Enter 10 digit number"
                  icon={Smartphone}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={errors.phone}
                />
                <Button fullWidth size="lg" loading={loading}>
                  Send OTP
                </Button>
              </form>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-text-muted font-bold">Or continue with</span></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full h-14 bg-white border border-border rounded-xl flex items-center justify-center gap-3 hover:bg-surface transition-colors shadow-subtle active:scale-95 transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-bold text-text-primary">Google Account</span>
              </button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm font-medium text-text-secondary">
                New user?
                <button onClick={() => navigate('/signup')} className="text-accent font-bold ml-1 hover:underline">
                  Create Account
                </button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-12">
            <div className="w-full space-y-2 text-center">
              <button onClick={() => setViewMode('login')} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                <ChevronLeft size={16} /> Change Number
              </button>
              <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">
                Verify OTP
              </h2>
              <p className="text-sm font-medium text-text-secondary">
                Enter code sent to {formData.phone}
              </p>
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
              <Button fullWidth size="lg" loading={loading}>
                Verify & Login
              </Button>
            </form>
          </motion.div>
        )}

        {viewMode === 'staff_request' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-8">
            <div className="w-full space-y-2 text-center">
              <button onClick={() => setViewMode('login')} className="mx-auto mb-4 p-2 text-text-muted hover:text-primary flex items-center gap-1 text-sm font-bold">
                <ChevronLeft size={16} /> Back to Login
              </button>
              <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
                Staff Request
              </h2>
              <p className="text-sm font-medium text-text-secondary">
                Submit a request to management for Staff Console authority.
              </p>
            </div>

            <form onSubmit={handleStaffRequest} className="w-full space-y-6">
              <Input
                label="Full Name"
                placeholder="Enter full name"
                icon={UserSquare2}
                required
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              />
              <Input
                label="Branch Name"
                placeholder="Enter branch name"
                icon={Building2}
                required
                value={staffForm.branch}
                onChange={(e) => setStaffForm({ ...staffForm, branch: e.target.value })}
              />
              <Input
                label="Mobile Number"
                placeholder="Your contact number"
                icon={Smartphone}
                required
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
              />

              <Button fullWidth size="lg">
                Submit Request
              </Button>
            </form>
          </motion.div>
        )}
      </div>

      <div className="mt-auto text-center py-4">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">
          V-1.0.0
        </p>
      </div>
    </motion.div>
  );
};

export default Login;
