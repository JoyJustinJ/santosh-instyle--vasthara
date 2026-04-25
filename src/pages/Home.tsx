import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Gift, Shield } from 'lucide-react';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { useAuth } from '../context/AuthContext';
import { useSchemes } from '../context/SchemeContext';
import { useNotification } from '../context/NotificationContext';
import { getSchemesFromDB, getAllUsersFromDB, getTransactionsFromDB } from '../services/db';
import { cn, formatCurrency } from '../utils';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [showPromo, setShowPromo] = useState(false);

  const { user } = useAuth()!;
  const { userSchemes } = useSchemes() as any;
  const { showNotification } = useNotification();

  useEffect(() => {
    if (user?.role === 'staff') {
      navigate('/staff', { replace: true });
      return;
    }
    getSchemesFromDB().then(data => setSchemes(data.filter((s: any) => s.status === 'active')));

    // Payment Reminders
    if (userSchemes && userSchemes.length > 0) {
      const checkDues = async () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let dueCount = 0;

        for (const scheme of userSchemes) {
          const txs = await getTransactionsFromDB(undefined, scheme.accountId);
          const hasPaidThisMonth = txs.some((tx: any) => {
            const date = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          });

          if (!hasPaidThisMonth) {
            dueCount++;
          }
        }

        if (dueCount > 0) {
          showNotification(`Payment Alert: You have ${dueCount} installment${dueCount > 1 ? 's' : ''} due for this month.`, 'warning');
        }
      };
      checkDues();
    }
  }, [user, navigate, userSchemes, showNotification]);

  // Removed random promo effect

  const slides = [
    {
      title: "Save Today, Smile Tomorrow 🌟",
      sub: "Start your savings journey with Vasthara",
      bg: "bg-gradient-to-br from-[#FDFCFB] to-[#E2D1C3]"
    },
    {
      title: "Premium Money Savings Plans",
      sub: "Secure your future with our exclusive plans",
      bg: "bg-gradient-to-br from-[#EEF2FD] to-[#CFD9DF]"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const featuredScheme = schemes[0] || { name: 'Loading...', tagline: '', monthlyAmount: 0, maturityValue: 0, id: '' };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper space-y-8 pb-12"
    >
      {/* Hero Carousel */}
      <div className="relative h-56 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8 }}
            className={cn("absolute inset-0 p-8 flex flex-col justify-center", slides[currentSlide].bg)}
          >
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-display font-bold text-primary leading-tight"
            >
              {slides[currentSlide].title}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-medium text-text-secondary mt-2"
            >
              {slides[currentSlide].sub}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-6 left-8 flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentSlide === i ? "w-6 bg-primary" : "w-1.5 bg-primary/20"
              )}
            />
          ))}
        </div>
      </div>

      {/* Featured Scheme */}
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-primary tracking-tight">
            {t('home.featured_scheme')}
          </h3>
          <Sparkles className="text-accent" size={20} />
        </div>

        {schemes.length > 0 ? (
          <Card className="p-0 overflow-hidden border-2 border-accent/20 relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">POPULAR</Badge>
                  <Badge variant="default">{featuredScheme.duration} MONTHS</Badge>
                </div>
                <h4 className="text-2xl font-display font-bold text-primary mt-2">
                  {featuredScheme.name}
                </h4>
                <p className="text-sm font-medium text-accent italic">
                  {featuredScheme.tagline}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(featuredScheme.monthlyAmount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Maturity</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(featuredScheme.maturityValue)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/scheme-info')}
                  className="border-primary/20 text-primary"
                >
                  {t('home.know_more')}
                </Button>
                <Button
                  variant="accent"
                  fullWidth
                  onClick={() => navigate('/schemes-list')}
                  className="shadow-card"
                >
                  {t('home.join_now')}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="text-center p-8 bg-surface rounded-3xl border border-dashed border-border">
            <p className="text-sm text-text-muted">No schemes active at the moment. Please check back later!</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-6">
        <Card className="bg-surface border-none p-5 space-y-3 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Available Investment Plans</p>
            <p className="text-2xl font-bold text-primary">{schemes.length}</p>
          </div>
        </Card>
      </div>

      {/* Why Vasthara */}
      <div className="px-6 space-y-4">
        <h3 className="text-lg font-display font-bold text-primary tracking-tight">
          Why Choose Us?
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
          {[
            { title: "Zero Fees", desc: "No processing charges on maturity", icon: Sparkles },
            { title: "Secure", desc: "100% safe & transparent", icon: Shield },
            { title: "Flexible", desc: "Multiple plans for everyone", icon: TrendingUp }
          ].map((item, i) => (
            <div key={i} className="min-w-[200px] bg-surface rounded-2xl p-5 space-y-2 border border-border/50">
              <item.icon className="text-accent" size={24} />
              <h5 className="font-bold text-primary">{item.title}</h5>
              <p className="text-xs text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {showPromo && featuredScheme && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-6 right-6 bg-primary text-white p-4 rounded-2xl shadow-card z-50 flex items-center justify-between cursor-pointer"
            onClick={() => navigate('/schemes-list')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={20} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Trending Scheme</p>
                <p className="text-sm font-bold truncate pr-4">Check out our famous "{featuredScheme.name}" plan!</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-white opacity-80" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
