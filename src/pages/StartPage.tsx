import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import vastharaIcon from '../assets/vasthara-icon.jpeg';
import { useAuth } from '../context/AuthContext';

const StartPage = () => {
  const navigate = useNavigate();
  const { user, loading, isUnlocked } = useAuth()!;

  React.useEffect(() => {
    if (!loading && user) {
      const userHasPin = !!user.pin || !!localStorage.getItem('vasthara_pin');
      if (isUnlocked || !userHasPin) {
        navigate('/home', { replace: true });
      } else {
        navigate('/pin-login', { replace: true });
      }
    }
  }, [user, loading, isUnlocked, navigate]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-24 h-24 rounded-[28px] bg-primary flex items-center justify-center shadow-card overflow-hidden"
        >
          <img src={vastharaIcon} alt="Vasthara" className="w-full h-full object-cover" />
        </motion.div>
      </div>
    );
  }

  const infoSections = [
    {
      title: 'About Us',
      icon: ShieldCheck,
      text: 'Vasthara by Santosh Instyle helps customers manage savings schemes, track payments, and stay connected with the store from one secure mobile-first app.',
    },
    {
      title: 'Privacy Policy',
      icon: LockKeyhole,
      text: 'We use customer information only to manage accounts, payments, service requests, and app communication. Personal details are handled with care and are not sold to outside parties.',
    },
    {
      title: 'Terms and Conditions',
      icon: FileText,
      text: 'By using this app, customers agree to provide accurate details, keep login credentials private, and follow the scheme and payment rules shared by Santosh Instyle.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-background p-6 pb-10 space-y-8"
    >
      <section className="pt-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-card overflow-hidden">
              <img src={vastharaIcon} alt="Vasthara" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">
                Santosh Instyle
              </p>
              <h1 className="text-2xl font-display font-bold text-primary leading-tight">
                VASTHARA
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-light px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent">
            <CheckCircle2 size={14} />
            Secure savings scheme app
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-display font-black text-primary leading-tight">
              Start your savings journey with confidence.
            </h2>
            <p className="text-sm font-medium text-text-secondary leading-6">
              View scheme details, manage payments, receive reminders, and reach our team whenever you need support.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              fullWidth
              onClick={() => navigate('/login')}
              className="rounded-2xl"
            >
              Login
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              size="lg"
              fullWidth
              variant="outline"
              onClick={() => navigate('/signup')}
              className="rounded-2xl"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {infoSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-none shadow-subtle p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-display font-bold text-primary">
                  {section.title}
                </h3>
              </div>
              <p className="text-sm text-text-secondary leading-6">
                {section.text}
              </p>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
          Contact Us
        </h3>
        <Card className="border-none shadow-subtle p-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-light text-success flex items-center justify-center shrink-0">
              <Phone size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-primary">Customer Support</h4>
              <a href="tel:+919840077747" className="text-sm font-bold text-accent">
                +91 98400 77747
              </a>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border/60">
            <div className="w-10 h-10 rounded-xl bg-surface text-text-muted flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-primary">Santosh Instyle</h4>
              <p className="text-sm text-text-secondary leading-6">
                Nethaji Road, Hosur, Tamil Nadu 635109
              </p>
            </div>
          </div>
        </Card>
      </section>
    </motion.div>
  );
};

export default StartPage;
