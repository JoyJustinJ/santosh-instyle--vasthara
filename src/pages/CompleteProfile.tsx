import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Smartphone, MapPin, CheckCircle2, ChevronLeft } from 'lucide-react';
import { INDIAN_STATES } from '../constants';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Notification, NotificationType } from '../components/UI/Notification';
import { validatePhone } from '../utils';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuth()!;
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const [formData, setFormData] = useState({
    firstName: user?.firstName === 'User' ? '' : (user?.firstName || ''),
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    country: user?.country || 'IN',
    state: user?.state || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
  });

  const [errors, setErrors] = useState<any>({});

  const showNotif = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleGoBack = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (!formData.firstName) newErrors.firstName = t('complete_profile.errors.first_name_required') || 'First name is required';
    if (!formData.lastName) newErrors.lastName = t('complete_profile.errors.last_name_required') || 'Last name is required';
    if (!validatePhone(formData.phone)) newErrors.phone = t('complete_profile.errors.invalid_phone');
    if (!formData.address) newErrors.address = t('complete_profile.errors.address_required');
    if (!formData.state) newErrors.state = t('complete_profile.errors.state_required');
    if (!formData.city) newErrors.city = t('complete_profile.errors.city_required');
    if (!formData.pincode) newErrors.pincode = t('complete_profile.errors.pincode_required');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) throw new Error(t('complete_profile.errors.user_not_found'));
      
      const userRef = doc(db, 'users', user.id);
      const updates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
        updatedAt: new Date().toISOString()
      };

      const updateResult = await updateUserViaAPI(user.id, updates);
      if (!updateResult.success) {
         showNotif(updateResult.error || 'Failed to update profile.', 'error');
         setLoading(false);
         return;
      }
      
      // Update local context
      setUser({ ...user, ...updates });
      
      showNotif(t('complete_profile.profile_updated'), 'success');
      setTimeout(() => navigate('/set-pin', { replace: true }), 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      showNotif(err.message || t('complete_profile.profile_update_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-6 pb-12 min-h-screen bg-background"
    >
      <Notification
        isVisible={!!notification}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        onClose={() => setNotification(null)}
      />

      <div className="flex items-center gap-4 mt-2">
        <button onClick={handleGoBack} className="p-2 -ml-2 text-primary hover:bg-surface rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center text-center mt-2 mb-8 space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
            {t('complete_profile.title')}
          </h1>
          <p className="text-sm text-text-secondary mt-2 max-w-xs">
            {t('complete_profile.subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6 border-none shadow-card">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('profile.first_name') || 'First Name'}
              placeholder="First name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={errors.firstName}
            />
            <Input
              label={t('profile.last_name') || 'Last Name'}
              placeholder="Last name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              error={errors.lastName}
            />
          </div>

          <Input
            label={t('complete_profile.mobile_number')}
            placeholder={t('complete_profile.mobile_placeholder')}
            type="tel"
            icon={Smartphone}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
          />

          <Input
            label={t('complete_profile.street_address')}
            placeholder={t('complete_profile.street_placeholder')}
            icon={MapPin}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={errors.address}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('complete_profile.country')}</label>
              <div className="w-full h-14 bg-surface/50 border-2 border-border rounded-xl px-4 flex items-center font-medium text-text-secondary cursor-not-allowed">
                India
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('complete_profile.state')}</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
              >
                <option value="">{t('complete_profile.select_state')}</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-xs text-danger font-bold mt-1 ml-1">{errors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Input
                label={t('complete_profile.city')}
                placeholder={t('complete_profile.select_city')}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                error={errors.city}
              />
            </div>
            <Input
              label={t('complete_profile.pincode')}
              placeholder={t('complete_profile.pincode_placeholder')}
              type="number"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              error={errors.pincode}
            />
          </div>
        </Card>

        <Button fullWidth size="lg" loading={loading} className="shadow-card">
          {t('complete_profile.save_profile')}
        </Button>
      </form>
    </motion.div>
  );
};

export default CompleteProfile;
