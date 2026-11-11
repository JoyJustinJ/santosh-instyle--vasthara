import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Calendar, 
  Gift, 
  Percent, 
  ChevronRight,
  TrendingUp,
  Shield
} from 'lucide-react';
import { usePrograms } from '../context/ProgramContext';
import { useNotification } from '../context/NotificationContext';
import { 
  getSchemesFromDB, 
  getTransactionsFromDB, 
  getNotificationsFromDB, 
  markNotificationAsRead 
} from '../services/db';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { WalkthroughModal } from '../components/UI/WalkthroughModal';
import { cn, formatCurrency, safeDate } from '../utils';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  const { userSchemes } = usePrograms() as any;
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);

  useEffect(() => {
    // Check if new user needs to see the interactive feature walkthrough
    const hasSeenWalkthrough = localStorage.getItem('vastra_walkthrough_seen');
    if (!hasSeenWalkthrough) {
      const timer = setTimeout(() => {
        setIsWalkthroughOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

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

  // Stabilize dependency: only re-run when the list of account IDs actually changes
  const schemeAccountIds = userSchemes?.map((s: any) => s.accountId).join(',') || '';

  useEffect(() => {
    getSchemesFromDB().then(data => {
      const active = data.filter((s: any) => s.status === 'active');
      setSchemes(active);
    });

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
            const date = safeDate(tx.date || tx.timestamp);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          });

          if (!hasPaidThisMonth) {
            dueCount++;
          }
        }

        if (dueCount > 0) {
          showNotification(
            `Payment Alert: You have ${dueCount} installment${dueCount > 1 ? 's' : ''} due for this month.`,
            'warning'
          );
        }
      };
      checkDues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeAccountIds]);

  const slides = [
    {
      eyebrow: "TRADITION MEETS TOMORROW",
      titleLine1: "Your Style",
      titleLine2: "Our Care",
      sub: "Join Vastra and make your celebrations more special",
    },
    {
      eyebrow: "ROYAL HERITAGE & SAVINGS",
      titleLine1: "Celebrate Big",
      titleLine2: "Save Small",
      sub: "Cherish every milestone with authentic Kanchipuram silk",
    },
    {
      eyebrow: "EXCLUSIVE PRIVILEGES",
      titleLine1: "Timeless Grace",
      titleLine2: "Pure Elegance",
      sub: "Enjoy monthly bonus benefits and guaranteed festive deliveries",
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Default featured scheme matching reference image if DB schemes aren't loaded yet
  const defaultFeatured = {
    id: schemes[0]?.id || 'scheme-200-11',
    name: schemes[0]?.name || '200 Rs 11 Months',
    duration: schemes[0]?.duration || 11,
    monthlyAmount: schemes[0]?.monthlyAmount || 200,
    tagline: schemes[0]?.tagline || 'Save small. Celebrate big.',
    gifts: schemes[0]?.gifts || 'GIFT',
    bonuses: schemes[0]?.bonuses || '250',
    popular: true
  };

  const featured = schemes.length > 0 ? schemes[0] : defaultFeatured;
  const featuredMonthly = featured.monthlyAmount || 200;
  const featuredDuration = featured.duration || 11;
  const featuredTotal = featuredMonthly * featuredDuration;
  const featuredGift = featured.gifts || 'GIFT';
  const featuredBonus = featured.bonuses || '250';

  // Fallback other schemes matching reference thumbnails
  const fallbackOtherSchemes = [
    {
      id: schemes[1]?.id || 'scheme-300-11',
      name: schemes[1]?.name || '300 Rs 11 Months',
      thumb: '/assets/thumb_300.png'
    },
    {
      id: schemes[2]?.id || 'scheme-500-11',
      name: schemes[2]?.name || '500 Rs 11 Months',
      thumb: '/assets/thumb_500.png'
    }
  ];

  const displayOtherSchemes = schemes.length > 1 
    ? schemes.slice(1).map((s, idx) => ({
        id: s.id,
        name: s.name,
        thumb: idx % 2 === 0 ? '/assets/thumb_300.png' : '/assets/thumb_500.png'
      }))
    : fallbackOtherSchemes;

  return (
    <div className="pb-16 select-none bg-[#FAF9F6] min-h-screen">
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

      {/* Dynamic Walkthrough for New Users */}
      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />

      {/* 1. HERO BANNER SECTION (Exact Match with Image 1) */}
      <div className="relative w-full h-[270px] sm:h-[300px] overflow-hidden bg-[#200307]">
        {/* Background Showroom & Saree Image */}
        <img
          src="/assets/hero_banner_clean.jpg"
          alt="Santhosh Silks Showroom"
          className="absolute inset-0 w-full h-full object-cover object-right"
        />

        {/* Dark Gradient Overlay on the Left for crystal-clear readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#200307]/95 via-[#200307]/75 to-transparent" />

        {/* Content on the Left */}
        <div className="relative h-full flex flex-col justify-center px-6 sm:px-8 z-10 max-w-[290px] sm:max-w-[340px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="space-y-1"
            >
              <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#EAB308] uppercase">
                {slides[currentSlide].eyebrow}
              </p>

              <h1 className="font-serif text-[32px] sm:text-[38px] font-bold text-white leading-[1.08] tracking-tight">
                {slides[currentSlide].titleLine1} <br />
                {slides[currentSlide].titleLine2}
              </h1>

              <p className="text-xs sm:text-[13px] text-white/90 font-normal leading-relaxed pt-1">
                {slides[currentSlide].sub}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Hero Carousel Dots (Pill + 2 Dots) */}
          <div className="flex items-center gap-1.5 pt-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  currentSlide === idx ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="px-4 sm:px-5 pt-6 space-y-6">
        
        {/* 2. FEATURED SCHEME SECTION */}
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight font-sans">
              Featured Scheme
            </h2>
            <button
              onClick={() => navigate('/schemes-list')}
              className="text-xs font-bold text-[#86162c] hover:text-[#6e0e22] flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={13} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Featured Scheme Card */}
          <div className="relative rounded-3xl bg-[#FFFDF9] border border-[#F0EAE1] p-5 sm:p-6 overflow-hidden shadow-[0_4px_24px_rgba(46,5,13,0.04)]">
            {/* Top Right Saree Stack Artwork */}
            <div className="absolute top-0 right-0 w-[48%] max-w-[210px] h-[175px] pointer-events-none overflow-hidden rounded-tr-3xl">
              <img
                src="/assets/card_saree_exact.png"
                alt="Silk Saree Stack"
                className="w-full h-full object-cover object-left"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 28%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28%)',
                }}
              />
            </div>

            {/* Card Content */}
            <div className="relative z-10 space-y-3.5">
              {/* Badges Row */}
              <div className="flex items-center gap-2">
                <span className="bg-[#86162c] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                  Most Popular
                </span>
                <span className="bg-[#FFF9F2] border border-[#F3E3D3] text-zinc-700 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <Calendar size={12} className="text-zinc-600" />
                  <span>{featuredDuration} Months</span>
                </span>
              </div>

              {/* Title & Tagline */}
              <div>
                <h3 className="font-serif text-[24px] sm:text-[26px] font-bold text-zinc-900 leading-tight">
                  {featured.name || `${featuredMonthly} Rs ${featuredDuration} Months`}
                </h3>
                <p className="text-zinc-500 text-xs sm:text-[13px] font-normal mt-0.5">
                  {featured.tagline || 'Save small. Celebrate big.'}
                </p>
              </div>

              {/* Pricing 2-Column Row */}
              <div className="flex items-center py-1">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Monthly Amount
                  </p>
                  <p className="text-[22px] sm:text-[24px] font-black text-zinc-900 tracking-tight leading-snug">
                    {formatCurrency(featuredMonthly)}
                  </p>
                </div>

                <div className="w-px h-10 bg-zinc-200 mx-4" />

                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Total Amount
                  </p>
                  <p className="text-[22px] sm:text-[24px] font-black text-[#86162c] tracking-tight leading-snug">
                    {formatCurrency(featuredTotal)}
                  </p>
                </div>
              </div>

              {/* Soft Pink Benefit Box */}
              <div className="rounded-2xl bg-[#FCF3F2] border border-[#F7DFDD] p-3 flex items-center justify-around">
                {/* Gift */}
                <div className="flex items-center gap-2.5 flex-1 pl-1">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#86162c] shadow-xs shrink-0">
                    <Gift size={18} className="stroke-[2]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                      Gift
                    </p>
                    <p className="text-xs sm:text-[13px] font-bold text-zinc-900">
                      {featuredGift}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-[#F0D0CE]" />

                {/* Bonus */}
                <div className="flex items-center gap-2.5 flex-1 pl-4">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#86162c] shadow-xs shrink-0">
                    <Percent size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                      Bonus
                    </p>
                    <p className="text-xs sm:text-[13px] font-bold text-zinc-900">
                      {featuredBonus}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => navigate('/scheme-info', { state: { scheme: featured } })}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#86162c] bg-white text-[#86162c] font-bold text-xs sm:text-sm text-center hover:bg-[#FFF5F6] active:scale-98 transition-all shadow-xs"
                >
                  View Details
                </button>

                <button
                  onClick={() => navigate('/scheme-join', { state: { scheme: featured } })}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#86162c] text-white font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#6e0e22] active:scale-98 transition-all"
                >
                  <span>Join Now</span>
                  <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Dots below Featured Scheme Card */}
          <div className="flex justify-center items-center gap-1.5 pt-2">
            <span className="w-6 h-1.5 bg-[#86162c] rounded-full" />
            <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
            <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
            <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
          </div>
        </div>

        {/* 3. OTHER SCHEMES SECTION (Exact Match with Image 1) */}
        <div className="space-y-3 pt-2">
          {/* Header Row */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight font-sans">
              Other Schemes
            </h2>
            <button
              onClick={() => navigate('/schemes-list')}
              className="text-xs font-bold text-[#86162c] hover:text-[#6e0e22] flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={13} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Horizontal Scheme Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {displayOtherSchemes.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('/scheme-info', { state: { schemeId: item.id } })}
                className="bg-white rounded-2xl border border-zinc-200/90 p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-xs hover:border-zinc-300 active:scale-98 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={item.thumb}
                    alt={item.name}
                    className="w-12 h-11 sm:w-14 sm:h-12 rounded-xl object-cover shrink-0 shadow-xs"
                  />
                  <p className="text-xs sm:text-[13px] font-bold text-zinc-900 truncate">
                    {item.name}
                  </p>
                </div>
                <ChevronRight size={16} className="text-zinc-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
