import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, User, ChevronLeft, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Notification, NotificationType } from '../components/UI/Notification';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        adminId: '',
        password: '',
        securityPin: ''
    });
    const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

    const showNotif = (message: string, type: NotificationType = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulated Admin check - In a real app we'd check a secure Firestore "admins" collection
        // For now using secure defaults as requested for testing
        setTimeout(() => {
            if (
                (formData.adminId === 'admin' || formData.adminId === 'vasthara@admin.com') &&
                formData.password === 'admin123' &&
                formData.securityPin === '0000'
            ) {
                localStorage.setItem('is_admin_authenticated', 'true');
                navigate('/admin');
            } else {
                showNotif('Invalid Admin Credentials or Security PIN', 'error');
            }
            setLoading(true);
            setLoading(false);
        }, 1500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="page-transition-wrapper p-8 flex flex-col items-center justify-center min-h-screen bg-surface/30"
        >
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-4">
                    <button onClick={() => navigate('/login')} className="flex items-center gap-2 mx-auto text-text-secondary hover:text-primary font-bold text-sm">
                        <ChevronLeft size={18} /> Back to User Login
                    </button>

                    <div className="mx-auto w-20 h-20 bg-primary text-white rounded-[28px] flex items-center justify-center shadow-gold border-2 border-accent/20">
                        <Shield size={40} />
                    </div>

                    <div>
                        <h1 className="text-3xl font-display font-bold text-primary tracking-tight">Admin Portal</h1>
                        <p className="text-sm font-medium text-text-secondary mt-1 uppercase tracking-widest">Authorized Personnel Only</p>
                    </div>
                </div>

                <Card className="p-8 space-y-6 border-2 border-accent/5 shadow-xl bg-white/80 backdrop-blur-xl">
                    <Notification
                        isVisible={!!notification}
                        message={notification?.message || ''}
                        type={notification?.type || 'error'}
                        onClose={() => setNotification(null)}
                    />

                    <form onSubmit={handleAdminLogin} className="space-y-6">
                        <Input
                            label="Admin ID / Email"
                            placeholder="username or email"
                            icon={User}
                            value={formData.adminId}
                            onChange={e => setFormData({ ...formData, adminId: e.target.value })}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />

                        <Input
                            label="Security PIN"
                            type="password"
                            placeholder="0000"
                            icon={KeyRound}
                            maxLength={4}
                            value={formData.securityPin}
                            onChange={e => setFormData({ ...formData, securityPin: e.target.value })}
                        />

                        <Button fullWidth size="lg" variant="primary" loading={loading} className="shadow-lg h-14">
                            Unlock Dashboard
                        </Button>
                    </form>
                </Card>

                <p className="text-center text-[10px] text-text-muted font-bold uppercase tracking-[0.4em]">
                    SECURE ENCRYPTED ACCESS
                </p>
            </div>
        </motion.div>
    );
};

export default AdminLogin;
