import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  LockKeyhole,
  Smartphone,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import vastraIcon from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────────
   Slide data
───────────────────────────────────────────── */
interface SlideData {
  id: string;
  badge?: string;
  title: string;
  titleHighlight?: string;
  description: string;
  illustration: React.ReactNode;
  blobColor1: string;
  blobColor2: string;
}

const StartPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading, isUnlocked } = useAuth()!;

  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  /* ── Auth redirect (unchanged) ── */
  React.useEffect(() => {
    if (!loading && user) {
      const userHasPin = !!user.pin || !!localStorage.getItem('vastra_pin');
      if (!userHasPin) {
        navigate('/set-pin', { replace: true });
      } else if (!isUnlocked) {
        navigate('/pin-login', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [user, loading, isUnlocked, navigate]);

  /* ── Loading splash (unchanged) ── */
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-full flex items-center justify-center"
        >
          <div className="w-40 mx-auto">
            <img
              src={vastraIcon}
              alt="Vastra"
              className="w-full h-auto object-contain rounded-2xl bg-white p-2"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Slides ── */
  const slides: SlideData[] = [
    {
      id: 'welcome',
      badge: t('start_page.secure_platform'),
      title: t('start_page.elevate_your'),
      titleHighlight: t('start_page.loyalty_journey'),
      description: t('start_page.hero_desc'),
      illustration: (
        <div className="slide-icon-ring" style={{ width: 128, height: 128, borderRadius: 40 }}>
          <img
            src={vastraIcon}
            alt="Vastra Logo"
            className="w-full h-full object-contain rounded-[36px]"
          />
          {/* Pulsing glow ring */}
          <motion.div
            className="absolute inset-0 rounded-[36px]"
            style={{ border: '2px solid var(--accent)' }}
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          />
        </div>
      ),
      blobColor1: 'rgba(234,179,8,0.18)',
      blobColor2: 'rgba(234,179,8,0.08)',
    },
    {
      id: 'schemes',
      badge: 'Smart Schemes',
      title: 'Loyalty Plans',
      titleHighlight: 'Built For You',
      description:
        'Join exclusive schemes designed to reward your trust — flexible subscription options, transparent tracking, and premium customer benefits at every step.',
      illustration: (
        <div className="slide-icon-ring">
          <ShieldCheck
            size={52}
            strokeWidth={1.5}
            style={{ color: 'var(--accent)' }}
          />
        </div>
      ),
      blobColor1: 'rgba(234,179,8,0.14)',
      blobColor2: 'rgba(16,185,129,0.10)',
    },
    {
      id: 'secure',
      badge: 'Trusted & Safe',
      title: 'Your Data,',
      titleHighlight: 'Always Secure',
      description:
        'Bank-grade OTP authentication, PIN-protected login, and end-to-end encrypted transactions give you complete peace of mind on every visit.',
      illustration: (
        <div className="slide-icon-ring">
          <LockKeyhole
            size={52}
            strokeWidth={1.5}
            style={{ color: 'var(--accent)' }}
          />
        </div>
      ),
      blobColor1: 'rgba(16,185,129,0.14)',
      blobColor2: 'rgba(234,179,8,0.10)',
    },
    {
      id: 'getstarted',
      badge: 'Ready to begin?',
      title: 'Join Vastra',
      titleHighlight: 'Today',
      description:
        'Create your account in seconds and start your premium loyalty journey with Vasthara.',
      illustration: (
        <div className="slide-icon-ring" style={{ width: 128, height: 128, borderRadius: 40 }}>
          <img
            src={vastraIcon}
            alt="Vastra Logo"
            className="w-full h-full object-contain rounded-[36px]"
          />
          <motion.div
            className="absolute inset-0 rounded-[36px]"
            style={{ border: '2px solid var(--accent)' }}
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        </div>
      ),
      blobColor1: 'rgba(234,179,8,0.20)',
      blobColor2: 'rgba(234,179,8,0.08)',
    },
  ];

  const total = slides.length;
  const isFirst = current === 0;
  const isLast = current === total - 1;

  /* ── Navigation ── */
  const goTo = (index: number) => {
    if (index >= 0 && index < total) setCurrent(index);
  };
  const goNext = () => {
    if (isLast) {
      navigate('/signup');
    } else {
      goTo(current + 1);
    }
  };
  const goPrev = () => {
    if (!isFirst) goTo(current - 1);
  };
  const handleSkip = () => goTo(total - 1);

  /* ── Touch / swipe ── */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slide = slides[current];

  return (
    <div
      className="carousel-wrapper"
      role="main"
      aria-label="Onboarding carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Top Floating Actions ── */}
      {!Capacitor.isNativePlatform() && (
        <a 
          href="https://github.com/JoyJustinJ/santosh-instyle--vasthara/raw/main/public/vastra.apk" 
          download 
          className="absolute top-6 right-6 z-50 flex items-center gap-1.5 font-semibold text-accent hover:text-accent/80 transition-colors bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-sm text-sm"
        >
          <Download size={16} />
          App
        </a>
      )}

      {/* ── Slides Track ── */}
      <div
        className="slides-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
        aria-live="polite"
        aria-atomic="true"
      >
        {slides.map((s, idx) => (
          <section
            key={s.id}
            className="carousel-slide"
            aria-hidden={idx !== current}
            aria-label={`Slide ${idx + 1} of ${total}: ${s.title}`}
          >
            {/* Decorative blobs */}
            <div
              className="slide-blob"
              style={{
                width: 320,
                height: 320,
                background: s.blobColor1,
                top: '-80px',
                right: '-80px',
              }}
            />
            <div
              className="slide-blob"
              style={{
                width: 240,
                height: 240,
                background: s.blobColor2,
                bottom: '-40px',
                left: '-60px',
              }}
            />

            {/* Slide content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${s.id}`}
                className="slide-content"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.38, ease: 'easeOut' }}
              >
                {/* Illustration */}
                <motion.div
                  initial={{ scale: 0.82, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 160, delay: 0.05 }}
                  style={{ position: 'relative', zIndex: 1 }}
                >
                  {s.illustration}
                </motion.div>

                {/* Badge */}
                {s.badge && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 999,
                      background: 'var(--accent-light)',
                      border: '1px solid rgba(234,179,8,0.25)',
                      padding: '6px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <CheckCircle2
                      size={13}
                      strokeWidth={2.5}
                      style={{ color: 'var(--accent)' }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--accent)',
                      }}
                    >
                      {s.badge}
                    </span>
                  </motion.div>
                )}

                {/* Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    color: 'var(--primary)',
                    marginBottom: 8,
                    padding: '0 8px',
                  }}
                >
                  {s.title}{' '}
                  {s.titleHighlight && (
                    <span
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {s.titleHighlight}
                    </span>
                  )}
                </motion.h1>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    maxWidth: 320,
                    margin: '0 auto',
                    padding: '0 8px',
                  }}
                >
                  {s.description}
                </motion.p>

                {/* CTA buttons — only on last slide */}
                {isLast && idx === current && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      marginTop: 32,
                      padding: '0 8px',
                    }}
                  >
                    <button
                      id="btn-create-account"
                      onClick={() => navigate('/signup')}
                      style={{
                        width: '100%',
                        height: 56,
                        borderRadius: 16,
                        background: 'var(--accent)',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: 15,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(234,179,8,0.35)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {t('start_page.create_account')}
                      <ArrowRight size={20} />
                    </button>
                    <button
                      id="btn-sign-in"
                      onClick={() => navigate('/login')}
                      style={{
                        width: '100%',
                        height: 56,
                        borderRadius: 16,
                        background: 'transparent',
                        border: '2px solid var(--border)',
                        color: 'var(--primary)',
                        fontSize: 15,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {t('start_page.sign_in')}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        ))}
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="carousel-bottom" aria-label="Carousel navigation">
        {/* Left: Skip (first slide) or Prev */}
        {isFirst ? (
          <button
            id="btn-skip"
            className="carousel-nav-btn"
            onClick={handleSkip}
            aria-label="Skip to last slide"
          >
            Skip
          </button>
        ) : (
          <button
            id="btn-prev"
            className={`carousel-nav-btn${isFirst ? ' invisible' : ''}`}
            onClick={goPrev}
            aria-label="Previous slide"
            aria-disabled={isFirst}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}

        {/* Center: Dot Indicators */}
        <div className="carousel-dots" role="tablist" aria-label="Slides">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              id={`dot-${idx}`}
              role="tab"
              aria-selected={idx === current}
              aria-label={`Go to slide ${idx + 1}`}
              className={`carousel-dot${idx === current ? ' active' : ''}`}
              onClick={() => goTo(idx)}
            />
          ))}
        </div>

        {/* Right: Next / Get Started */}
        <button
          id={isLast ? 'btn-get-started' : 'btn-next'}
          className="carousel-nav-btn primary"
          onClick={goNext}
          aria-label={isLast ? 'Get started' : 'Next slide'}
        >
          {isLast ? (
            <>
              Start
            </>
          ) : (
            <>
              Next
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </nav>

      {/* ── Quick Links Footer ── */}
      <div className="absolute bottom-3 left-0 w-full flex flex-col items-center justify-center gap-3 text-xs text-text-secondary z-30">
        <div className="flex items-center justify-center gap-4">
          <Link to="/about" className="hover:text-primary transition-colors">
            About Us
          </Link>
          <span className="w-1 h-1 rounded-full bg-border"></span>
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms & Conditions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StartPage;
