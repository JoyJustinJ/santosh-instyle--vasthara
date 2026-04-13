import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, HelpCircle, ArrowRight, ShieldCheck, TrendingUp, Gift } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';

const KnowMore = () => {
  const navigate = useNavigate();

  const faqs = [
    { q: "How do I join the scheme?", a: "You can join by selecting a plan and paying your first installment through the app or at any of our branches." },
    { q: "What happens if I miss a payment?", a: "You can pay the missed installment in the next month. However, consistent payments are recommended for maximum benefits." },
    { q: "Can I redeem before 11 months?", a: "Early closure is possible after 6 months, but gift benefits and wastage waivers may not apply." },
    { q: "Is my money safe?", a: "Yes, Vasthara is a trusted name with over 20 years of excellence in the jewelry industry." }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper pb-12"
    >
      {/* Hero */}
      <div className="relative h-64 bg-primary overflow-hidden">
        <img 
          src="https://picsum.photos/seed/jewelry/800/600" 
          alt="Jewelry" 
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="absolute bottom-8 left-8 right-8">
          <Badge variant="warning" className="bg-[#D4AF37] text-white border-none mb-2">FEATURED</Badge>
          <h1 className="text-3xl font-display font-bold text-white leading-tight">
            Swarna Dharaa Plus
          </h1>
          <p className="text-white/70 text-sm font-medium mt-1">
            The smartest way to save for your dream jewelry.
          </p>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {/* About */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
            About the Scheme
          </h2>
          <p className="text-text-secondary leading-relaxed text-sm">
            Swarna Dharaa Plus is a unique 11-month savings plan designed to help you accumulate wealth for your jewelry purchases. By contributing a fixed amount every month, you not only save money but also earn exclusive rewards and waivers on making charges.
          </p>
          
          <div className="grid grid-cols-1 gap-4 mt-6">
            {[
              { title: "100% Wastage Waiver", desc: "No making charges on selected jewelry items at maturity.", icon: ShieldCheck },
              { title: "Surprise Gift Box", desc: "Receive a premium gift box upon successful completion.", icon: Gift },
              { title: "Flexible Redemption", desc: "Redeem your savings at any Vasthara branch across India.", icon: TrendingUp }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-4 bg-surface rounded-2xl border border-border/50">
                <div className="w-10 h-10 rounded-xl bg-white shadow-subtle flex items-center justify-center text-accent shrink-0">
                  <item.icon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-primary text-sm">{item.title}</h4>
                  <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
            How it Works
          </h2>
          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {[
              { step: "01", title: "Choose a Plan", desc: "Select a monthly installment amount that suits your budget (₹1000, ₹2000, or ₹3000)." },
              { step: "02", title: "Pay Monthly", desc: "Pay your installments consistently for 11 months through our secure app." },
              { step: "03", title: "Redeem Jewelry", desc: "After 11 months, visit our store to purchase your favorite jewelry with exclusive benefits." }
            ].map((item, i) => (
              <div key={i} className="flex gap-6 relative">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-accent flex items-center justify-center text-accent font-black text-xs shrink-0 z-10">
                  {item.step}
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-primary">{item.title}</h4>
                  <p className="text-sm text-text-secondary mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-accent" size={24} />
            <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
              Common Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-5 border-none bg-surface/50">
                <h4 className="font-bold text-primary text-sm">{faq.q}</h4>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="pt-4">
          <Button 
            fullWidth 
            size="lg" 
            onClick={() => navigate('/schemes-list')}
            className="shadow-card h-16 text-base"
          >
            Ready to Join? → View Plans
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-accent-light text-accent',
    success: 'bg-success-light text-success',
    danger: 'bg-danger-light text-danger',
    warning: 'bg-amber-50 text-warning',
    primary: 'bg-primary text-white',
  };

  return (
    <span className={cn(
      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block border border-transparent',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

const cn = (...inputs) => inputs.filter(Boolean).join(' ');

export default KnowMore;
