import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Smartphone, MapPin, CheckCircle2 } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Notification, NotificationType } from '../components/UI/Notification';
import { validatePhone } from '../utils';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth()!;
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const [formData, setFormData] = useState({
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

  const countries = Country.getAllCountries();
  const states = State.getStatesOfCountry(formData.country);
  const cities = City.getCitiesOfState(formData.country, formData.state);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (!validatePhone(formData.phone)) newErrors.phone = 'Invalid phone number';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.pincode) newErrors.pincode = 'Pincode is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) throw new Error('User not found');
      
      const userRef = doc(db, 'users', user.id);
      const updates = {
        phone: formData.phone,
        address: formData.address,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updates);
      
      // Update local context
      setUser({ ...user, ...updates });
      
      showNotif('Profile updated successfully!', 'success');
      setTimeout(() => navigate('/set-pin', { replace: true }), 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      showNotif(err.message || 'Failed to update profile. Please try again.');
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
      <div className="flex flex-col items-center text-center mt-8 mb-8 space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-sm text-text-secondary mt-2 max-w-xs">
            We need a few more details to set up your account properly.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6 border-none shadow-card">
          <Input
            label="Mobile Number"
            placeholder="10-digit mobile number"
            type="tel"
            icon={Smartphone}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
          />

          <Input
            label="Street Address"
            placeholder="Street address, colony"
            icon={MapPin}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={errors.address}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Country</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '', city: '' })}
              >
                {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">State</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
              </select>
              {errors.state && <p className="text-xs text-danger font-bold mt-1 ml-1">{errors.state}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">City</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              >
                <option value="">Select City</option>
                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              {errors.city && <p className="text-xs text-danger font-bold mt-1 ml-1">{errors.city}</p>}
            </div>
            <Input
              label="Pincode"
              placeholder="6-digit pincode"
              type="number"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              error={errors.pincode}
            />
          </div>
        </Card>

        <Button fullWidth size="lg" loading={loading} className="shadow-card">
          Save Profile
        </Button>
      </form>
    </motion.div>
  );
};

export default CompleteProfile;
