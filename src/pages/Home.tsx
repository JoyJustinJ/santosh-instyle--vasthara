import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Gift, Shield } from 'lucide-react';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { usePrograms } from '../context/ProgramContext';
import { useNotification } from '../context/NotificationContext';
import { getSchemesFromDB, getAllUsersFromDB, getTransactionsFromDB, getNotificationsFromDB, markNotificationAsRead } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { cn, formatCurrency } from '../utils';

// Helper to safely parse Firestore Timestamp or ISO string
const getTxDate = (timestamp: any): Date => {
    if (!timestamp) return new Date(0);
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000);
    }
    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
    }
    return new Date(timestamp);
};

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [showPromo, setShowPromo] = useState(false);

  const { userSchemes } = usePrograms() as any;
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      getNotificationsFromDB(user.id).then(notifs => {
        const unreadBroadcast = notifs.find((n: any) => !n.read && n.type === 'broadcast');
        if (unreadBroadcast) {
          setActiveBroadcast(unreadBroadcast);
        }
      });
    }
  }, [user]);

  useEffect(() => {
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
            const date = getTxDate(tx.timestamp);
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
  }, [navigate, userSchemes, showNotification]);

  // Removed random promo effect

  const slides = [
    {
      title: t('home.hero_title_1'),
      sub: t('home.hero_sub_1'),
      bg: "bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]"
    },
    {
      title: t('home.hero_title_2'),
      sub: t('home.hero_sub_2'),
      bg: "bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0]"
    },
    {
      title: t('home.hero_title_3'),
      sub: t('home.hero_sub_3'),
      bg: "bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]"
    },
    {
      title: t('home.hero_title_4'),
      sub: t('home.hero_sub_4'),
      bg: "bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6]"
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
      <ConfirmModal
        isOpen={!!activeBroadcast}
        title={activeBroadcast?.title || 'Announcement'}
        message={activeBroadcast?.message || ''}
        confirmText="Got it!"
        onConfirm={() => {
            if (activeBroadcast?.id) {
                markNotificationAsRead(activeBroadcast.id);
            }
            setActiveBroadcast(null);
        }}
        onCancel={() => {
            if (activeBroadcast?.id) {
                markNotificationAsRead(activeBroadcast.id);
            }
            setActiveBroadcast(null);
        }}
      />

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
              className="text-3xl font-display font-bold leading-tight !text-[#0F172A]"
            >
              {slides[currentSlide].title}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-medium mt-2 !text-[#475569]"
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
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('home.monthly')}</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(featuredScheme.monthlyAmount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('home.total_amount')}</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(featuredScheme.monthlyAmount * featuredScheme.duration)}</p>
                </div>
              </div>

              {(featuredScheme.gifts || featuredScheme.bonuses) && (
                <div className="flex flex-col gap-2 pb-2">
                  {featuredScheme.gifts && (
                    <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-700 text-xs px-3 py-2 rounded-xl flex items-center font-medium">
                      <span className="font-bold mr-1">Gift:</span> <span>{featuredScheme.gifts}</span>
                    </div>
                  )}
                  {featuredScheme.bonuses && (
                    <div className="bg-amber-50/50 border border-amber-100 text-amber-700 text-xs px-3 py-2 rounded-xl flex items-center font-medium">
                      <span className="font-bold mr-1">Bonus:</span> <span>{featuredScheme.bonuses}</span>
                    </div>
                  )}
                </div>
              )}

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
            <p className="text-sm text-text-muted">{t('home.no_schemes')}</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-6 space-y-4">
        <Card className="bg-surface border-none p-5 space-y-3 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('home.available_programs')}</p>
            <p className="text-2xl font-bold text-primary">{schemes.length}</p>
          </div>
        </Card>

        <Button 
          variant="outline" 
          fullWidth 
          onClick={() => navigate('/schemes-list')}
          className="bg-primary text-white border-primary hover:bg-primary-light h-14 text-base font-bold shadow-card rounded-2xl group"
        >
          {t('home.explore_programs')}
          <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      {/* Why Vastra */}
      <div className="px-6 space-y-4">
        <h3 className="text-lg font-display font-bold text-primary tracking-tight">
          {t('home.why_choose_us')}
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
          {[
            { title: t('home.zero_fees'), desc: t('home.zero_fees_desc'), icon: Shield },
            { title: t('home.secure'), desc: t('home.secure_desc'), icon: Shield },
            { title: t('home.flexible'), desc: t('home.flexible_desc'), icon: TrendingUp }
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

              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">{t('home.trending_program')}</p>
                <p className="text-sm font-bold truncate pr-4">{t('home.trending_program_desc', { name: featuredScheme.name })}</p>
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
