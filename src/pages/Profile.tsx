import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';

const Profile = () => {
  const navigate = useNavigate();
  const { user, login: updateUserContext, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    const { createUserProfile } = await import('../services/db');
    const updatedUser = { ...user, ...formData, avatar: avatarPreview };
    await createUserProfile(updatedUser);
    updateUserContext(updatedUser);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChangeSub = () => {
    if (!otpSent) {
      setOtpSent(true);
      // Integrate with real OTP service here
      alert("Verification code sent to your registered number.");
    } else {
      // Real OTP verification logic goes here
      if (passwordForm.otp) {
        alert("Password update requested. Verification in progress.");
        setChangingPassword(false);
      }
    }
  };

  const menuItems = [
    { label: 'Security & PIN', icon: Shield, path: '/profile/security' },
    { label: 'Notifications', icon: Bell, path: '/profile/notifications' },
    { label: 'Payment Methods', icon: CreditCard, path: '/profile/payments' },
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
            {isEditing ? 'Edit Profile' : 'My Profile'}
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
              <p className="text-sm font-medium text-white/60 mt-1">
                Customer ID: V-88291
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
                  <Input label="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  <Input label="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
                <Input label="Email" type="email" icon={Mail} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                <Input label="Phone" type="tel" icon={Smartphone} value={formData.phone} readOnly className="bg-surface-alt opacity-70" />
                <Button fullWidth onClick={handleSaveProfile} className="mt-4"><Check size={18} className="mr-2" /> Save Profile</Button>
              </Card>

              <Card className="p-6 mt-6 space-y-4 border-none shadow-card">
                <h3 className="font-display font-bold text-primary">Change Password</h3>
                {!changingPassword ? (
                  <Button variant="outline" fullWidth onClick={() => setChangingPassword(true)}>
                    Request Password Change
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="New Password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                    {otpSent ? (
                      <>
                        <Input
                          label="Enter OTP sent to email/phone (Use: 1234)"
                          value={passwordForm.otp}
                          onChange={(e) => setPasswordForm({ ...passwordForm, otp: e.target.value })}
                        />
                        <Button fullWidth onClick={handlePasswordChangeSub}>Verify & Change</Button>
                      </>
                    ) : (
                      <Button fullWidth onClick={handlePasswordChangeSub}>Send OTP</Button>
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
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Mobile Number</p>
                      <p className="text-sm font-bold text-primary">+91 {user?.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Email Address</p>
                      <p className="text-sm font-bold text-primary">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Primary Branch</p>
                      <p className="text-sm font-bold text-primary">{user?.branch || 'Krishnagiri'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">Settings</h3>
                <Card className="p-0 overflow-hidden border-none shadow-subtle">
                  {menuItems.map((item, i) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center justify-between p-5 hover:bg-surface transition-colors",
                        i !== menuItems.length - 1 && "border-b border-border/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-accent-light text-accent flex items-center justify-center">
                          <item.icon size={18} />
                        </div>
                        <span className="text-sm font-bold text-primary">{item.label}</span>
                      </div>
                      <ChevronRight size={18} className="text-text-muted" />
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
                <LogOut size={18} className="mr-2" /> SIGN OUT
              </Button>

              <div className="text-center py-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">
                  App Version 1.0.0
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default Profile;
