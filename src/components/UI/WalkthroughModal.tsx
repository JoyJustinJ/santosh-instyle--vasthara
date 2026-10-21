import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  CreditCard, 
  Gift, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      badge: "STEP 1 OF 3",
      title: "Curated Silk Schemes",
      subtitle: "Save Small, Celebrate Big",
      description: "Explore our flexible 11-month savings plans tailored for your festive shopping and family weddings. Start saving from as little as ₹200/month.",
      icon: Sparkles,
      iconBg: "bg-amber-100 text-amber-700",
      accentColor: "#D4AF37",
      highlight: "₹200 to ₹1,000+ Plans Available"
    },
    {
      badge: "STEP 2 OF 3",
      title: "Seamless Monthly Payments",
      subtitle: "100% Safe & Instant Receipts",
      description: "Pay your monthly installments with UPI, debit/credit cards, or in cash at store counters. Download official digital receipts and view transaction history anytime.",
      icon: CreditCard,
      iconBg: "bg-emerald-100 text-emerald-700",
      accentColor: "#10B981",
      highlight: "Instant SMS & Downloadable Receipts"
    },
    {
      badge: "STEP 3 OF 3",
      title: "Royal Silk & Bonus Rewards",
      subtitle: "Authentic Kanchipuram Heritage",
      description: "Redeem your matured plan for pure silk sarees and exquisite wedding collections at Santhosh Silks showrooms with exclusive member bonuses & festive gifts.",
      icon: Gift,
      iconBg: "bg-rose-100 text-[#86162C]",
      accentColor: "#86162C",
      highlight: "Guaranteed Member Bonus & Gifts"
    }
  ];

  const handleFinish = () => {
    localStorage.setItem('vastra_walkthrough_seen', 'true');
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const current = steps[currentStep];
  const StepIcon = current.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-w-[430px] mx-auto select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleFinish}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm max-w-[430px] mx-auto"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative w-full bg-[#FFFDF9] rounded-3xl border border-[#F0EAE1] shadow-2xl p-6 overflow-hidden z-10"
        >
          {/* Top Bar with Step Badge and Skip Button */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
              {current.badge}
            </span>
            <button
              onClick={handleFinish}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 flex items-center gap-1"
            >
              <span>Skip Tour</span>
              <X size={14} />
            </button>
          </div>

          {/* Slide Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center space-y-4 py-2"
            >
              {/* Illustration / Icon Box */}
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-3xl ${current.iconBg} flex items-center justify-center shadow-sm`}>
                  <StepIcon size={40} className="stroke-[1.8]" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h3 className="font-serif text-2xl font-bold text-zinc-900 leading-tight">
                  {current.title}
                </h3>
                <p className="text-xs font-semibold text-[#86162C] mt-1">
                  {current.subtitle}
                </p>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed max-w-[280px] mx-auto">
                {current.description}
              </p>

              {/* Highlight Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100/80 border border-zinc-200/60 text-[11px] font-semibold text-zinc-700">
                <CheckCircle2 size={13} className="text-[#86162C]" />
                <span>{current.highlight}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-1.5 py-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStep === i ? "w-7 bg-[#86162C]" : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                }`}
              />
            ))}
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="py-3 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-semibold text-xs sm:text-sm hover:bg-zinc-50 active:scale-98 transition-all flex items-center justify-center gap-1"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 rounded-xl bg-[#86162C] text-white font-bold text-xs sm:text-sm hover:bg-[#6E0E22] active:scale-98 transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>{currentStep === steps.length - 1 ? "Get Started" : "Continue"}</span>
              <ArrowRight size={15} className="stroke-[2.5]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
