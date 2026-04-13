import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { User, Mail, Smartphone, MapPin, Lock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Country, State, City } from 'country-state-city';
import { Input } from '../components/UI/Input';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Notification, NotificationType } from '../components/UI/Notification';
import { validateEmail, validatePhone, cn } from '../utils';

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    country: 'IN',
    state: '',
    city: '',
    pincode: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<any>({});
  const [passwordStrength, setPasswordStrength] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const showNotif = (message: string, type: NotificationType = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const countries = Country.getAllCountries();
  const states = State.getStatesOfCountry(formData.country);
  const cities = City.getCitiesOfState(formData.country, formData.state);

  useEffect(() => {
    const pass = formData.password;
    if (!pass) setPasswordStrength('');
    else if (pass.length < 6) setPasswordStrength('weak');
    else if (pass.match(/[A-Z]/) && pass.match(/[0-9]/) && pass.match(/[^A-Za-z0-9]/)) setPasswordStrength('strong');
    else setPasswordStrength('medium');
  }, [formData.password]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!validateEmail(formData.email)) newErrors.email = 'Invalid email';
    if (!validatePhone(formData.phone)) newErrors.phone = 'Invalid phone number';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (formData.password.length < 6) newErrors.password = 'Min 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    // Simulate OTP sending
    setTimeout(() => {
      localStorage.setItem('pending_signup', JSON.stringify(formData));
      navigate('/otp-verify');
      setLoading(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-6 pb-12"
    >
      <Notification
        isVisible={!!notification}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        onClose={() => setNotification(null)}
      />
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/login')} className="p-2 -ml-2 text-primary">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">
            {t('signup.step')}
          </p>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
            {t('signup.title')}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-6">
        <Card className="p-6 space-y-6 border-none shadow-card">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('signup.first_name')}
              placeholder="Enter first name"
              icon={User}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={errors.firstName}
            />
            <Input
              label={t('signup.last_name')}
              placeholder="Enter last name"
              icon={User}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              error={errors.lastName}
            />
          </div>

          <Input
            label={t('signup.email')}
            placeholder="email@example.com"
            type="email"
            icon={Mail}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />

          <Input
            label={t('signup.mobile')}
            placeholder="10-digit mobile number"
            type="tel"
            icon={Smartphone}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
          />

          <Input
            label={t('signup.address')}
            placeholder="Street address, colony"
            icon={MapPin}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('signup.country')}</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '', city: '' })}
              >
                {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('signup.state')}</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('signup.city')}</label>
              <select
                className="w-full h-14 bg-surface border-2 border-border rounded-xl px-4 font-medium outline-none focus:border-accent"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              >
                <option value="">Select City</option>
                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <Input
              label={t('signup.pincode')}
              placeholder="6-digit pincode"
              type="number"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <Input
              label={t('signup.password')}
              type="password"
              icon={Lock}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
            />
            {passwordStrength && (
              <div className="flex items-center gap-2 ml-1">
                <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                  <div className={cn(
                    'h-full transition-all duration-500',
                    passwordStrength === 'weak' ? 'w-1/3 bg-danger' :
                      passwordStrength === 'medium' ? 'w-2/3 bg-warning' : 'w-full bg-success'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-black uppercase tracking-widest',
                  passwordStrength === 'weak' ? 'text-danger' :
                    passwordStrength === 'medium' ? 'text-warning' : 'text-success'
                )}>
                  {passwordStrength}
                </span>
              </div>
            )}
            <Input
              label={t('signup.confirm_password')}
              type="password"
              icon={Lock}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
            />
          </div>
        </Card>

        <Button fullWidth size="lg" loading={loading} className="shadow-card">
          {t('signup.submit_btn')}
        </Button>
      </form>
    </motion.div>
  );
};

export default Signup;
