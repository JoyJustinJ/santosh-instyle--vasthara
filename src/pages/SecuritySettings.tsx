import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, Fingerprint, Lock, Trash2, Smartphone, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Notification, NotificationType } from '../components/UI/Notification';
import { cn } from '../utils';
import { checkBiometricAvailability, getStoredBiometricCredentialId, getBiometricCredentialKey } from '../utils/biometrics';
import { sendOTP, verifyOTP } from '../services/sms';

const SecuritySettings = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isBiometricEnabled, setBiometricEnabled, user, setUser: setUserInContext } = useAuth()!;
    const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
    const [hasStoredCredId, setHasStoredCredId] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', otp: '' });
    const [otpSent, setOtpSent] = useState(false);

    useEffect(() => {
        const userId = user?.id || user?.phone;
        setHasStoredCredId(!!getStoredBiometricCredentialId(userId));
        checkBiometricAvailability().then(setBiometricAvailable);
    }, [user]);

    const showNotif = (message: string, type: NotificationType = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleToggleBiometrics = () => {
        if (isBiometricEnabled) {
            setBiometricEnabled(false);
            showNotif(t('security.biometric_disabled'), 'info');
        } else {
            if (!biometricAvailable) {
                showNotif(t('security.biometric_unavailable'), 'error');
                return;
            }
            if (!hasStoredCredId) {
                showNotif(t('security.biometric_pin_required'), 'error');
                return;
            }
            setBiometricEnabled(true);
            showNotif(t('security.biometric_enabled'));
        }
    };

    const handleClearBiometrics = () => {
        const userId = user?.id || user?.phone;
        localStorage.removeItem('vasthara_biometric_credId');
        localStorage.removeItem(getBiometricCredentialKey(userId));
        setBiometricEnabled(false);
        setHasStoredCredId(false);
        showNotif(t('security.biometric_cleared'), 'info');
    };

    const handlePasswordChangeSub = async () => {
        if (!otpSent) {
            if (passwordForm.newPassword.length < 6) {
                showNotif('Password must be at least 6 characters.', 'error');
                return;
            }
            const result = await sendOTP(user?.phone || '');
            if (result.success) {
                setOtpSent(true);
                showNotif('OTP sent to your phone number.', 'info');
            } else {
                showNotif(result.error || "Failed to send OTP.", 'error');
            }
        } else {
            const result = await verifyOTP(user?.phone || '', passwordForm.otp);
            if (result.success) {
                try {
                    const uid = user?.id || user?.phone;
                    if (!uid) throw new Error('User not found');

                    // 1. Targeted Firestore update (does NOT wipe other fields)
                    const { updateUserPassword } = await import('../services/db');
                    await updateUserPassword(uid, passwordForm.newPassword);

                    // 2. Update local auth context state immediately
                    setUserInContext({ ...(user as any), password: passwordForm.newPassword });

                    // 3. Try Firebase Auth password update for email-linked accounts
                    try {
                        const { auth } = await import('../firebase');
                        if (auth.currentUser) {
                            const { updatePassword } = await import('firebase/auth');
                            await updatePassword(auth.currentUser, passwordForm.newPassword);
                        }
                    } catch (authErr) {
                        console.warn("Firebase Auth password update skipped:", authErr);
                    }

                    showNotif("Password updated successfully!");
                    setChangingPassword(false);
                    setOtpSent(false);
                    setPasswordForm({ newPassword: '', otp: '' });
                } catch (err) {
                    console.error('Password update failed:', err);
                    showNotif("Failed to update password. Please try again.", 'error');
                }
            } else {
                showNotif(result.error || "Invalid OTP.", 'error');
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="page-transition-wrapper p-6 flex flex-col min-h-screen bg-surface"
        >
            <Notification
                isVisible={!!notification}
                message={notification?.message || ''}
                type={notification?.type || 'success'}
                onClose={() => setNotification(null)}
            />

            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/profile')} className="p-2 -ml-2 text-primary hover:bg-surface rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-display font-bold text-primary">{t('security.title')}</h1>
            </div>

            <div className="space-y-6">
                {/* PIN Section */}
                <section className="bg-surface rounded-2xl p-5 shadow-subtle border border-border/50 space-y-4">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-accent">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold">{t('security.app_lock_pin')}</h2>
                            <p className="text-xs text-text-muted">{t('security.secure_account_pin')}</p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        fullWidth
                        onClick={() => navigate('/set-pin?mode=change')}
                        className="justify-between"
                    >
                        {t('security.change_pin')}
                        <ChevronLeft size={16} className="rotate-180" />
                    </Button>
                </section>

                {/* Password Section */}
                <section className="bg-surface rounded-2xl p-5 shadow-subtle border border-border/50 space-y-4">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-accent">
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold">Password Management</h2>
                            <p className="text-xs text-text-muted">Update your account password securely</p>
                        </div>
                    </div>

                    {!changingPassword ? (
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={() => setChangingPassword(true)}
                            className="justify-between"
                        >
                            Change Password
                            <ChevronLeft size={16} className="rotate-180" />
                        </Button>
                    ) : (
                        <div className="space-y-4 pt-2 border-t border-border/50">
                            <Input
                                label="New Password"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                hint="Password must be at least 6 characters"
                                disabled={otpSent}
                            />
                            {otpSent && (
                                <Input
                                    label="Enter OTP"
                                    value={passwordForm.otp}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, otp: e.target.value })}
                                    placeholder="6-digit code"
                                />
                            )}
                            <div className="flex gap-2">
                                <Button variant="outline" fullWidth onClick={() => {
                                    setChangingPassword(false);
                                    setOtpSent(false);
                                    setPasswordForm({ newPassword: '', otp: '' });
                                }}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handlePasswordChangeSub}>
                                    {otpSent ? 'Verify & Update' : 'Send OTP'}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Biometric Section */}
                <section className="bg-surface rounded-2xl p-5 shadow-subtle border border-border/50 space-y-4">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-accent">
                            <Fingerprint size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold">{t('security.biometric_login')}</h2>
                            <p className="text-xs text-text-muted">
                                {biometricAvailable ? t('security.use_fingerprint') : t('security.unavailable_device')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-y border-border/50">
                        <span className="text-sm font-medium text-text-secondary">{t('security.enable_biometrics')}</span>
                        <button
                            onClick={handleToggleBiometrics}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                isBiometricEnabled ? "bg-accent" : "bg-border"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                isBiometricEnabled ? "right-1" : "left-1"
                            )} />
                        </button>
                    </div>

                    {hasStoredCredId && (
                        <button
                            onClick={handleClearBiometrics}
                            className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-danger hover:bg-danger-light rounded-xl transition-colors"
                        >
                            <Trash2 size={14} />
                            {t('security.clear_biometric_data')}
                        </button>
                    )}

                    {!hasStoredCredId && (
                        <p className="text-[10px] text-text-muted italic text-center p-2">
                            {t('security.biometric_note')}
                        </p>
                    )}
                </section>

                {/* APK specific hint */}
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex gap-3">
                        <Smartphone className="text-primary shrink-0" size={18} />
                        <div>
                            <h3 className="text-xs font-bold text-primary mb-1">{t('security.device_compatibility')}</h3>
                            <p className="text-[10px] leading-relaxed text-text-secondary">
                                {t('security.device_compatibility_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SecuritySettings;
