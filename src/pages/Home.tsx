import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, Gift, Shield } from 'lucide-react';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { getSchemesFromDB, getAllUsersFromDB } from '../services/db';
import { cn, formatCurrency } from '../utils';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    getSchemesFromDB().then(setSchemes);
    getAllUsersFromDB().then(users => setUserCount(users.length));
  }, []);

  const slides = [
    {
      title: "Save Today, Smile Tomorrow 🌟",
      sub: "Start your savings journey with Vasthara",
      bg: "bg-gradient-to-br from-[#FDFCFB] to-[#E2D1C3]"
    },
    {
      title: "Exclusive Akshaya Tritiya Offers",
      sub: "Join any plan today and get zero processing fees",
      bg: "bg-gradient-to-br from-[#EEF2FD] to-[#CFD9DF]"
    },
    {
      title: `Join ${userCount > 0 ? userCount : 'our'} Happy Families`,
      sub: "Trusted by generations for secure savings",
      bg: "bg-gradient-to-br from-[#F7F8FA] to-[#D5D4D0]"
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
          <Sparkles className="text-[#D4AF37]" size={20} />
        </div>

        {schemes.length > 0 ? (
          <Card className="p-0 overflow-hidden border-2 border-[#D4AF37]/30 relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="bg-[#D4AF37]/10 text-[#B8860B]">POPULAR</Badge>
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
                  variant="gold"
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
      <div className="px-6 grid grid-cols-2 gap-4">
        <Card className="bg-surface border-none p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent-light text-accent flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Bonus Rate</p>
            <p className="text-lg font-bold text-primary">8.5%</p>
          </div>
        </Card>
        <Card className="bg-surface border-none p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-success-light text-success flex items-center justify-center">
            <Gift size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Active Users</p>
            <p className="text-lg font-bold text-primary">{userCount}</p>
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
    </motion.div>
  );
};

export default Home;
