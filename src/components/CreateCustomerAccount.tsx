import React, { useState } from 'react';
import { User, Smartphone } from 'lucide-react';
import { Input } from './UI/Input';
import { Button } from './UI/Button';
import { Card } from './UI/Card';
import { validatePhone } from '../utils';
import { useAuth } from '../context/AuthContext';
import { getUserByPhone, createUserProfile } from '../services/db';
import { sendOTP, verifyOTP } from '../services/sms';
import { useNotification } from '../context/NotificationContext';
import { ConfirmModal } from './UI/ConfirmModal';

export const CreateCustomerAccount = () => {
    const { user } = useAuth()!;
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        referralStaff: (user as any)?.empId || user?.phone || ''
    });
    
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otp, setOtp] = useState('');

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.firstName || !formData.lastName || !formData.phone) {
            showNotification('Please fill all required fields', 'error');
            return;
        }

        const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
        if (!validatePhone(sanitizedPhone)) {
            showNotification('Invalid phone number', 'error');
            return;
        }

        setLoading(true);
        try {
            const existingUser = await getUserByPhone(sanitizedPhone);
            if (existingUser) {
                showNotification('An account with this phone number already exists', 'error');
                setLoading(false);
                return;
            }

            const result = await sendOTP(sanitizedPhone);
            if (result.success) {
                showNotification(`OTP sent to ${sanitizedPhone}`, 'success');
                setOtpModalOpen(true);
            } else {
                showNotification(result.error || 'Failed to send OTP', 'error');
            }
        } catch (err: any) {
            console.error(err);
            showNotification('An error occurred while preparing account', 'error');
        }
        setLoading(false);
    };

    const handleVerifyAndCreate = async () => {
        if (!otp || otp.length < 6) {
            showNotification('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        setLoading(true);
        try {
            const sanitizedPhone = formData.phone.replace(/[\s-]/g, '');
            const result = await verifyOTP(sanitizedPhone, otp);
            
            if (result.success) {
                const newProfile = {
                    id: sanitizedPhone,
                    phone: sanitizedPhone,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    role: 'customer',
                    referralEmpId: formData.referralStaff,
                    phoneVerified: true,
                    accountCreatedVia: 'staff',
                    setupRequired: true, // Forces customer to set password on first login
                    createdAt: new Date().toISOString(),
                };

                await createUserProfile(newProfile);
                showNotification('Customer account created successfully!', 'success');
                
                // Reset form
                setFormData({
                    firstName: '',
                    lastName: '',
                    phone: '',
                    referralStaff: (user as any)?.empId || user?.phone || ''
                });
                setOtpModalOpen(false);
                setOtp('');
            } else {
                showNotification(result.error || 'Invalid OTP', 'error');
            }
        } catch (err: any) {
            console.error(err);
            showNotification('Failed to verify OTP or create account', 'error');
        }
        setLoading(false);
    };

    return (
        <Card className="p-6 border-none shadow-card bg-white w-full mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-primary">Create Customer Account</h2>
                <p className="text-xs text-text-secondary mt-1">
                    Create an account for a customer without setting their password. They will be prompted to create a password on their first login.
                </p>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        icon={User}
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                    <Input
                        label="Last Name"
                        icon={User}
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                </div>

                <Input
                    label="Customer Phone Number"
                    icon={Smartphone}
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                />

                <Input
                    label="Referral Code (Optional)"
                    placeholder="Staff Employee ID"
                    value={formData.referralStaff}
                    onChange={(e) => setFormData({ ...formData, referralStaff: e.target.value })}
                    hint="Defaults to your Staff ID for incentive tracking."
                />

                <Button fullWidth size="lg" type="submit" loading={loading} className="mt-2">
                    Verify Phone &amp; Create Account
                </Button>
            </form>

            <ConfirmModal
                isOpen={otpModalOpen}
                title="Verify Customer Phone"
                message={`Please enter the 6-digit OTP sent to ${formData.phone}`}
                onConfirm={handleVerifyAndCreate}
                onCancel={() => {
                    setOtpModalOpen(false);
                    setOtp('');
                }}
                confirmText="Create Account"
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
        </Card>
    );
};
