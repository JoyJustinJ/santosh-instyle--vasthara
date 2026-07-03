import React from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  ChevronRight,
  Download,
  Smartphone
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import vastharaIcon from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';

const StartPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading, isUnlocked } = useAuth()!;

  React.useEffect(() => {
    if (!loading && user) {
      const userHasPin = !!user.pin || !!localStorage.getItem('vasthara_pin');
      if (!userHasPin) {
        navigate('/set-pin', { replace: true });
      } else if (!isUnlocked) {
        navigate('/pin-login', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [user, loading, isUnlocked, navigate]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-full flex items-center justify-center"
        >
          <div className="w-40 mx-auto">
            <img src={vastharaIcon} alt="Vastra" className="w-full h-auto object-contain rounded-2xl bg-white p-2" />
          </div>
        </motion.div>
      </div>
    );
  }

  const infoSections = [
    {
      title: t('start_page.about_us_title'),
      icon: ShieldCheck,
      path: '/about',
      text: t('start_page.about_us_desc'),
    },
    {
      title: t('start_page.privacy_title'),
      icon: LockKeyhole,
      path: '/privacy',
      text: t('start_page.privacy_desc'),
    },
    {
      title: t('start_page.terms_title'),
      icon: FileText,
      path: '/terms',
      text: t('start_page.terms_desc'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col bg-surface text-primary"
    >
      {/* Premium Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden shrink-0">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-32 rounded-3xl bg-white shadow-2xl flex items-center justify-center p-2 relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-3xl" />
            <img src={vastharaIcon} alt="Vastra Logo" className="w-full h-auto object-contain rounded-[20px]" />
          </motion.div>
          
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-2xl font-black text-primary tracking-tight mt-[-1rem] z-10 relative"
          >
            Vastra Scheme Subscription
          </motion.h2>
          
          <div className="space-y-5 max-w-md mx-auto">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent backdrop-blur-md shadow-sm"
            >
              <CheckCircle2 size={14} className="text-accent" />
              {t('start_page.secure_platform')}
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-display font-black leading-[1.15] tracking-tight text-primary"
            >
              {t('start_page.elevate_your')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-sm">
                {t('start_page.loyalty_journey')}
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-sm font-medium text-text-secondary leading-relaxed px-2"
            >
              {t('start_page.hero_desc')}
            </motion.p>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="w-full flex flex-col gap-4 pt-6 px-2"
          >
            <Button
              size="lg"
              fullWidth
              onClick={() => navigate('/signup')}
              className="h-14 text-base bg-accent text-primary hover:bg-accent-light shadow-[0_8px_30px_rgba(234,179,8,0.3)] rounded-2xl font-bold border-none"
            >
              {t('start_page.create_account')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button
              size="lg"
              fullWidth
              variant="outline"
              onClick={() => navigate('/login')}
              className="h-14 text-base border-primary/20 text-primary hover:bg-primary/5 rounded-2xl backdrop-blur-sm"
            >
              {t('start_page.sign_in')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Content Section - Overlapping the Hero */}
      <section className="px-6 pb-12 relative -mt-8 rounded-t-[32px] z-20 space-y-6 pt-10 flex-1 bg-surface">
        
        <div className="space-y-4">
          {infoSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (index * 0.1) }}
              >
                <Card 
                  onClick={() => navigate(section.path)}
                  className="border shadow-sm p-6 group hover:border-accent/50 hover:shadow-card transition-all duration-300 cursor-pointer overflow-hidden relative rounded-[24px] bg-white border-border"
                >
                  <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ChevronRight className="text-accent" size={24} />
                  </div>
                  <div className="flex flex-col gap-4 pr-10">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-display font-bold text-primary">
                        {section.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-text-secondary">
                        {section.text}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
        
        {/* App Download Section */}
        {!Capacitor.isNativePlatform() && !window.matchMedia('(display-mode: standalone)').matches && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-[32px] p-8 relative overflow-hidden mt-8 shadow-card border border-border/50 bg-white"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-success/20 to-transparent rounded-br-full -ml-16 -mt-16" />
          
          <h3 className="text-[10px] font-black text-success uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-success"></span> Download Android App
          </h3>
          
          <div className="space-y-6 relative z-10">
            <div>
              <h4 className="text-xl font-display font-bold text-primary mb-2">Get the Vastra Experience</h4>
              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                Download the official VASTRA 3.0 Android application for a faster, seamless, and premium loyalty experience right from your phone.
              </p>
            </div>
            
            <a href={`/vasthara-app.apk?v=${new Date().getTime()}`} download className="block">
              <Button fullWidth className="h-14 bg-success hover:bg-[#16a34a] text-white rounded-2xl shadow-[0_8px_30px_rgba(34,197,94,0.3)] border-none">
                <Download className="mr-2" size={20} />
                Download APK Version
              </Button>
            </a>
          </div>
        </motion.div>
        )}

        {/* Premium Contact Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-[32px] p-8 relative overflow-hidden mt-8 shadow-card bg-white border border-border/50"
        >
           {/* Abstract shape */}
           <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-accent/20 to-transparent rounded-bl-full -mr-16 -mt-16" />
           
           <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
             <span className="w-8 h-[1px] bg-accent"></span> {t('start_page.get_in_touch')}
           </h3>
           
           <div className="space-y-8 relative z-10">
             <div className="flex gap-5 items-center group">
               <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center shrink-0 border border-border group-hover:bg-accent group-hover:border-accent group-hover:text-primary transition-colors text-accent">
                 <Phone size={24} strokeWidth={1.5} />
               </div>
               <div>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('start_page.premium_support')}</p>
                 <a href="tel:+919751500007" className="text-xl font-display font-bold text-primary tracking-wide">
                   +91 97515 00007
                 </a>
               </div>
             </div>
             
             <div className="flex gap-5 items-center group">
               <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center shrink-0 border border-border group-hover:bg-accent group-hover:border-accent group-hover:text-primary transition-colors text-accent">
                 <MapPin size={24} strokeWidth={1.5} />
               </div>
               <div>
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{t('start_page.headquarters')}</p>
                 <p className="text-sm font-medium text-text-primary leading-relaxed">
                   {t('start_page.address_line1')}<br/>{t('start_page.address_line2')}
                 </p>
               </div>
             </div>
           </div>
        </motion.div>
      </section>

      {/* Sophisticated Footer */}
      <footer className="px-6 py-10 text-center space-y-8 bg-background shrink-0 border-t border-border/50">
        <div className="bg-surface/50 p-6 rounded-3xl border border-border/80 text-left space-y-3 shadow-subtle backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2">
            <LockKeyhole size={14} /> {t('start_page.important_disclaimer')}
          </p>
          <p className="text-[10px] text-text-muted leading-relaxed text-justify">
            {t('start_page.disclaimer_text')}
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em]">
          <button onClick={() => navigate('/about')} className="hover:text-accent transition-colors">{t('start_page.about')}</button>
          <button onClick={() => navigate('/terms')} className="hover:text-accent transition-colors">{t('start_page.terms')}</button>
          <button onClick={() => navigate('/privacy')} className="hover:text-accent transition-colors">{t('start_page.privacy')}</button>
          <button onClick={() => navigate('/refund-policy')} className="hover:text-accent transition-colors">{t('start_page.refunds')}</button>
          <button onClick={() => navigate('/program-rules')} className="hover:text-accent transition-colors">{t('start_page.rules')}</button>
        </div>
        
        <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.25em] pt-6">
          {t('start_page.copyright')}
        </p>
      </footer>
    </motion.div>
  );
};

export default StartPage;
