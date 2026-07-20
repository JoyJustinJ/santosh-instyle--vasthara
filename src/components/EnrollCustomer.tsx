import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, UserCheck, PlusCircle } from 'lucide-react';
import { Card } from './UI/Card';
import { Button } from './UI/Button';
import { Input } from './UI/Input';
import { getUserByPhone, getSchemesFromDB, enrollUserInScheme } from '../services/db';
import { sendOTP, verifyOTP } from '../services/sms';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { formatCurrency } from '../utils';
import { ConfirmModal } from './UI/ConfirmModal';

interface EnrollCustomerProps {
    onBack: () => void;
}

export const EnrollCustomer: React.FC<EnrollCustomerProps> = ({ onBack }) => {
    const { user } = useAuth()!;
    const { showNotification } = useNotification();
    
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerProfile, setCustomerProfile] = useState<any>(null);
    const [schemes, setSchemes] = useState<any[]>([]);
    const [selectedScheme, setSelectedScheme] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [referralEmpId, setReferralEmpId] = useState((user as any)?.empId || user?.phone || '');
    
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otp, setOtp] = useState('');

    useEffect(() => {
        getSchemesFromDB().then(data => {
            setSchemes(data.filter((s: any) => s.status === 'active'));
        });
    }, []);

    const handleSearch = async (phone: string) => {
        setCustomerPhone(phone);
        if (phone.length >= 10) {
            setSearching(true);
            const profile = await getUserByPhone(phone);
            setCustomerProfile(profile);
            setSearching(false);
        } else {
            setCustomerProfile(null);
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerProfile || !selectedScheme) return;
        
        setLoading(true);
        try {
            const result = await sendOTP(customerProfile.phone || customerPhone);
            if (result.success) {
                showNotification(`OTP sent to ${customerProfile.phone || customerPhone}`, 'success');
                setOtpModalOpen(true);
            } else {
                showNotification(result.error || 'Failed to send OTP', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Failed to prepare enrollment.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndEnroll = async () => {
        if (!otp || otp.length < 6) {
            showNotification('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        setLoading(true);
        try {
            const result = await verifyOTP(customerProfile.phone || customerPhone, otp);
            if (result.success) {
                await enrollUserInScheme(customerProfile.id, selectedScheme, user.id || user.phone, referralEmpId);
                showNotification(`Successfully enrolled in ${selectedScheme.name}!`, 'success');
                setOtpModalOpen(false);
                setOtp('');
                onBack();
            } else {
                showNotification(result.error || 'Invalid OTP', 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Failed to verify OTP or enroll customer.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                <button onClick={onBack} className="text-primary">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-display font-bold text-primary">Enroll Customer</h2>
            </div>
            
            <form onSubmit={handleSendOTP} className="space-y-4">
                <Input
                    label="Customer Phone Number"
                    placeholder="Enter phone number"
                    required
                    value={customerPhone}
                    onChange={(e) => handleSearch(e.target.value)}
                />

                {searching && <p className="text-xs text-text-muted">Searching...</p>}

                {customerProfile && (
                    <div className="bg-success-light/20 border border-success/30 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-success uppercase tracking-widest">Verified Customer</p>
                            <p className="font-bold text-primary">{customerProfile.firstName} {customerProfile.lastName}</p>
                            {customerProfile.customerId && (
                                <p className="text-xs text-text-muted mt-1 font-mono">ID: {customerProfile.customerId}</p>
                            )}
                        </div>
                    </div>
                )}

                {!customerProfile && customerPhone.length >= 10 && !searching && (
                    <div className="bg-danger-light/20 border border-danger/30 rounded-xl p-4 space-y-4">
                        <p className="text-center text-sm text-danger font-bold">
                            Customer not found.
                        </p>
                        <Button 
                            fullWidth 
                            variant="outline" 
                            className="border-danger text-danger hover:bg-danger/10"
                            onClick={async (e) => {
                                e.preventDefault();
                                setLoading(true);
                                try {
                                    const { doc, setDoc } = await import('firebase/firestore');
                                    const { db } = await import('../firebase');
                                    await setDoc(doc(db, "users", customerPhone), {
                                        id: customerPhone,
                                        firstName: "New",
                                        lastName: "Customer",
                                        phone: customerPhone,
                                        role: "customer",
                                        createdAt: new Date().toISOString(),
                                        status: "active"
                                    });
                                    const { getUserByPhone } = await import('../services/db');
                                    const profile = await getUserByPhone(customerPhone);
                                    setCustomerProfile(profile);
                                    showNotification("Customer account created successfully! You can now enroll them.", 'success');
                                } catch (error) {
                                    console.error(error);
                                    showNotification("Failed to create customer account.", 'error');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            loading={loading}
                        >
                            <UserCheck size={18} className="mr-2" />
                            Create Basic Account
                        </Button>
                    </div>
                )}

                {customerProfile && (
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Select Scheme</label>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {schemes.map((scheme: any) => (
                                <Card 
                                    key={scheme.id} 
                                    onClick={() => setSelectedScheme(scheme)}
                                    className={`p-3 border cursor-pointer transition-all ${selectedScheme?.id === scheme.id ? 'border-accent bg-accent-light/10 shadow-sm' : 'border-border bg-surface hover:bg-black/5'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-primary">{scheme.name}</p>
                                            <p className="text-xs text-text-secondary mt-1">{scheme.duration} Months</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-text-muted uppercase">Initial Cash</p>
                                            <p className="font-bold text-primary">{formatCurrency(scheme.amount || scheme.monthlyAmount || 0)}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {selectedScheme && (
                    <div className="space-y-4">
                        <Input
                            label="Referral Code (Optional)"
                            placeholder="Staff Employee ID"
                            value={referralEmpId}
                            onChange={(e) => setReferralEmpId(e.target.value)}
                            hint="Defaults to your Staff ID for incentive tracking."
                        />
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-2 text-sm text-text-secondary">
                            <p><strong>First Month Payment:</strong> {formatCurrency(selectedScheme.amount || selectedScheme.monthlyAmount || 0)}</p>
                            <p><strong>Payment Method:</strong> CASH (In-Store)</p>
                            <p><strong>Recorded By:</strong> {user.firstName || 'Staff'}</p>
                        </div>
                    </div>
                )}

                <Button 
                    fullWidth 
                    className="mt-6" 
                    type="submit"
                    disabled={!customerProfile || !selectedScheme || loading}
                    loading={loading}
                >
                    <PlusCircle size={20} className="mr-2" />
                    Verify Phone & Enroll
                </Button>
            </form>

            <ConfirmModal
                isOpen={otpModalOpen}
                title="Verify Customer Consent"
                message={`Please enter the 6-digit OTP sent to ${customerProfile?.phone || customerPhone} to confirm their enrollment.`}
                onConfirm={handleVerifyAndEnroll}
                onCancel={() => {
                    setOtpModalOpen(false);
                    setOtp('');
                }}
                confirmText="Confirm Enrollment"
            >
                <div className="mt-4">
                    <Input
                        label="6-Digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        placeholder="123456"
                        className="text-center tracking-widest text-xl font-bold"
                        autoFocus
                    />
                </div>
            </ConfirmModal>
        </motion.div>
    );
};
