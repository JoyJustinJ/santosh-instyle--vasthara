import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  User,
  Mail,
  Smartphone,
  MapPin,
  Shield,
  Bell,
  CreditCard,
  LogOut,
  ChevronRight,
  Edit2,
  Camera,
  Check,
  X,
  Moon,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { cn } from '../utils';
import { ThemeToggle } from '../components/UI/ThemeToggle';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { sendOTP, verifyOTP } from '../services/sms';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setUser: updateUserContext, logout } = useAuth()!;
  const { showNotification } = useNotification();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { updateUserViaAPI } = await import('../services/sms');
      const updates = { ...formData, avatar: avatarPreview || user?.avatar };
      const uid = user?.id || user?.phone;
      if (!uid) throw new Error('User ID not found.');
      
      const result = await updateUserViaAPI(uid, updates);
      if (!result.success) {
         throw new Error(result.error || 'Failed to update profile');
      }
      
      const updatedUser = { ...user, ...updates } as any;
      updateUserContext(updatedUser);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      showNotification('Failed to save profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setAvatarPreview(canvas.toDataURL('image/jpeg', 0.8));
          }
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChangeSub = async () => {
    if (!otpSent) {
      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        showNotification("Please enter a new password (minimum 6 characters).", 'warning');
        return;
      }
      const result = await sendOTP(user?.phone || '');
      if (result.success) {
        setOtpSent(true);
        showNotification("OTP sent successfully to your mobile number.", 'success');
      } else {
        showNotification(result.error || "Failed to send OTP.", 'error');
      }
    } else {
      const result = await verifyOTP(user?.phone || '', passwordForm.otp);
      if (result.success) {
        try {
          const uid = user?.id || user?.phone;
          if (!uid) throw new Error('User ID not found. Please log in again.');

          // 1. Update password using the API (bypasses Firestore client rules)
          const { updateUserViaAPI } = await import('../services/sms');
          const updateResult = await updateUserViaAPI(uid, { password: passwordForm.newPassword, setupRequired: false, pin: "" });
          
          if (!updateResult.success) {
            throw new Error(updateResult.error || 'Failed to update password');
          }

          // 2. Update the local auth context so subsequent API calls use the new password
          updateUserContext({ ...user, password: passwordForm.newPassword } as any);

          // 3. Try to update Firebase Auth password as well (only for Firebase-auth users)
          try {
            const { auth } = await import('../firebase');
            if (auth.currentUser) {
              const { updatePassword } = await import('firebase/auth');
              await updatePassword(auth.currentUser, passwordForm.newPassword);
            }
          } catch (authErr: any) {
            console.warn('Firebase Auth password update skipped:', authErr.code);
          }

          showNotification("Password updated successfully!", 'success');
          setChangingPassword(false);
          setOtpSent(false);
          setPasswordForm({ newPassword: '', otp: '' });
        } catch (err) {
          console.error('Password update failed:', err);
          showNotification("Failed to update password. Please try again.", 'error');
        }
      } else {
        showNotification(result.error || "Invalid OTP.", 'error');
      }
    }
  };

  const menuItems = [
    { label: t('profile.security_pin'), icon: Shield, path: '/profile/security' },
    { label: t('profile.notifications'), icon: Bell, path: '/notifications' },
    { label: t('profile.transactions'), icon: CreditCard, path: '/transactions' },
    ...((user?.role === 'staff' || user?.role === 'manager' || user?.accessLevel === 'manager') ? [{ label: t('profile.staff_authority'), icon: UserCheck, path: '/staff', isSpecial: true }] : []),
    ...(user?.role === 'admin' ? [{ label: t('profile.admin_access'), icon: Shield, path: '/admin?view=management', isSpecial: true }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper pb-12"
    >
      {/* Profile Header */}
      <div className="bg-primary pt-12 pb-24 px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full -ml-16 -mb-16" />

        <div className="flex items-center justify-between relative z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/80 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-display font-bold text-white tracking-tight">
            {isEditing ? t('profile.edit_profile') : t('profile.my_profile')}
          </h1>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="p-2 -mr-2 text-white/80 hover:text-white">
              <Edit2 size={20} />
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className="p-2 -mr-2 text-white/80 hover:text-white">
              <X size={24} />
            </button>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center relative z-10">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-accent text-white flex items-center justify-center text-4xl font-bold border-4 border-white shadow-card overflow-hidden">
              {avatarPreview || user?.avatar ? (
                <img src={avatarPreview || user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`
              )}
            </div>
            {isEditing && (
              <label className="absolute bottom-1 right-1 w-8 h-8 bg-surface rounded-full border-2 border-primary flex items-center justify-center cursor-pointer hover:bg-gray-200 transition">
                <Camera size={14} className="text-primary" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            )}
            {!isEditing && (
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-success rounded-full border-4 border-primary flex items-center justify-center">
                <Shield size={12} className="text-white" />
              </div>
            )}
          </div>
          {!isEditing && (
            <>
              <h2 className="text-2xl font-display font-bold text-white mt-4 tracking-tight">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className={cn("font-medium text-white/60 mt-1 text-center px-4", user?.role === 'admin' ? "text-[10px] break-all" : "text-sm")}>
                {user?.role === 'admin' ? 'Admin ID' : t('profile.customer_id')}: {(user as any)?.customerId || user?.id || user?.phone || t('profile.pending')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-6 -mt-12 relative z-20 space-y-6">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="p-6 space-y-4 border-none shadow-card">
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t('profile.first_name')} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  <Input label={t('profile.last_name')} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
                <Input label={t('profile.email')} type="email" icon={Mail} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                <Input label={t('profile.phone')} type="tel" icon={Smartphone} value={formData.phone} readOnly className="bg-surface-alt opacity-70" />
                <Button fullWidth onClick={handleSaveProfile} loading={isSaving} className="mt-4"><Check size={18} className="mr-2" /> {t('profile.save_profile')}</Button>
              </Card>

              <Card className="p-6 mt-6 space-y-4 border-none shadow-card">
                <h3 className="font-display font-bold text-primary">{t('profile.change_password')}</h3>
                {!changingPassword ? (
                  <Button variant="outline" fullWidth onClick={() => setChangingPassword(true)}>
                    {t('profile.request_password_change')}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label={t('profile.new_password')}
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      hint="Password must be at least 6 characters"
                    />
                    {otpSent ? (
                      <>
                        <Input
                          label={t('profile.enter_otp')}
                          value={passwordForm.otp}
                          onChange={(e) => setPasswordForm({ ...passwordForm, otp: e.target.value })}
                        />
                        <Button fullWidth onClick={handlePasswordChangeSub}>{t('profile.verify_change')}</Button>
                      </>
                    ) : (
                      <Button fullWidth onClick={handlePasswordChangeSub}>{t('profile.send_otp')}</Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          ) : (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <Card className="p-6 space-y-6 border-none shadow-card">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('profile.mobile_number')}</p>
                      <p className="text-sm font-bold text-primary">
                        {user?.phone
                          ? (user.phone.startsWith('+91') ? user.phone : `+91 ${user.phone}`)
                          : 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('profile.email_address')}</p>
                      <p className="text-sm font-bold text-primary">{user?.email || t('profile.not_provided')}</p>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">
                        {user?.emailVerified ? t('profile.email_verified') : t('profile.email_not_verified')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('profile.primary_branch')}</p>
                      <p className="text-sm font-bold text-primary">{user?.branch || 'Hosur'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('profile.account_details')}</p>
                      <p className="text-sm font-bold text-primary">
                        {t('profile.created_via')} {(user?.accountCreatedVia || 'phone').toUpperCase()}
                      </p>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-1">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('profile.join_date_unavailable')}
                      </p>
                    </div>
                  </div>
                  {(user?.address || user?.city || user?.state || user?.pincode) && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('profile.address')}</p>
                        <p className="text-sm font-bold text-primary">
                          {[user?.address, user?.city, user?.state, user?.pincode].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">{t('profile.settings')}</h3>
                <Card className="p-0 overflow-hidden border-none shadow-subtle">
                  {/* Theme Toggle Item */}
                  <div className="w-full flex items-center justify-between p-5 border-b border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-accent-light text-accent flex items-center justify-center">
                        <Moon size={18} />
                      </div>
                      <span className="text-sm font-bold text-primary">{t('profile.dark_mode')}</span>
                    </div>
                    <ThemeToggle />
                  </div>

                  {menuItems.map((item, i) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center justify-between p-5 hover:bg-surface transition-colors",
                        i !== menuItems.length - 1 && "border-b border-border/50",
                        (item as any).isSpecial && "bg-accent/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          (item as any).isSpecial ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-accent-light text-accent"
                        )}>
                          <item.icon size={18} />
                        </div>
                        <span className={cn(
                          "text-sm font-bold",
                          (item as any).isSpecial ? "text-accent" : "text-primary"
                        )}>{item.label}</span>
                      </div>
                      <ChevronRight size={18} className={(item as any).isSpecial ? "text-accent" : "text-text-muted"} />
                    </button>
                  ))}
                </Card>
              </div>

              <Button
                variant="outline"
                fullWidth
                onClick={handleLogout}
                className="h-14 border-danger/20 text-danger hover:bg-danger hover:text-white mt-8"
              >
                <LogOut size={18} className="mr-2" /> {t('profile.sign_out')}
              </Button>

              <div className="text-center py-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">
                  {t('profile.app_version')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Profile;
