import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, Fingerprint, Lock, Trash2, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { Notification, NotificationType } from '../components/UI/Notification';
import { cn } from '../utils';

const SecuritySettings = () => {
    const navigate = useNavigate();
    const { isBiometricEnabled, setBiometricEnabled } = useAuth()!;
    const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
    const [hasStoredCredId, setHasStoredCredId] = useState(false);

    useEffect(() => {
        setHasStoredCredId(!!localStorage.getItem('vasthara_biometric_credId'));
    }, []);

    const showNotif = (message: string, type: NotificationType = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleToggleBiometrics = () => {
        if (isBiometricEnabled) {
            setBiometricEnabled(false);
            showNotif('Biometric login disabled', 'info');
        } else {
            if (!hasStoredCredId) {
                showNotif('Please log in with PIN first to enable biometrics', 'error');
                return;
            }
            setBiometricEnabled(true);
            showNotif('Biometric login enabled');
        }
    };

    const handleClearBiometrics = () => {
        localStorage.removeItem('vasthara_biometric_credId');
        setBiometricEnabled(false);
        setHasStoredCredId(false);
        showNotif('Biometric data cleared', 'info');
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
                <button onClick={() => navigate('/profile')} className="p-2 -ml-2 text-primary hover:bg-white rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-display font-bold text-primary">Security Settings</h1>
            </div>

            <div className="space-y-6">
                {/* PIN Section */}
                <section className="bg-white rounded-2xl p-5 shadow-subtle space-y-4">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-accent">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold">App Lock PIN</h2>
                            <p className="text-xs text-text-muted">Secure your account with a 4-digit PIN</p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        fullWidth
                        onClick={() => navigate('/set-pin?mode=change')}
                        className="justify-between"
                    >
                        Change PIN
                        <ChevronLeft size={16} className="rotate-180" />
                    </Button>
                </section>

                {/* Biometric Section */}
                <section className="bg-white rounded-2xl p-5 shadow-subtle space-y-4">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-accent">
                            <Fingerprint size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold">Biometric Login</h2>
                            <p className="text-xs text-text-muted">Use Fingerprint or Face ID to unlock</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-y border-border/50">
                        <span className="text-sm font-medium text-text-secondary">Enable Biometrics</span>
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
                            Clear Stored Biometric Data
                        </button>
                    )}

                    {!hasStoredCredId && (
                        <p className="text-[10px] text-text-muted italic text-center p-2">
                            Note: You must login with PIN once to register your biometrics on this device.
                        </p>
                    )}
                </section>

                {/* APK specific hint */}
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex gap-3">
                        <Smartphone className="text-primary shrink-0" size={18} />
                        <div>
                            <h3 className="text-xs font-bold text-primary mb-1">Device Compatibility</h3>
                            <p className="text-[10px] leading-relaxed text-text-secondary">
                                For the best experience in our mobile app, ensure your device has a secure screen lock (Pattern, PIN, or Biometrics) enabled in your phone settings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SecuritySettings;
