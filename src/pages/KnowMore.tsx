import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle, ArrowRight, ShieldCheck, TrendingUp, Gift } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';

const KnowMore = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      q: 'How does the scheme work?',
      a: 'Pay a fixed monthly installment for the scheme duration. Upon maturity, you receive your full saved value.'
    },
    {
      q: 'What do I receive when my scheme completes?',
      a: 'Upon completing all installments, you receive your full maturity amount and some gifts at maturity (subject to discretion) — redeemable at the Santosh Instyle store in Hosur.'
    },
    {
      q: 'Can I pay early or skip a month?',
      a: 'Yes! There is no fixed due date — you can pay your monthly installment any time during the month at your convenience. However, skipping a month is not recommended as it may delay your maturity benefits.'
    },
    {
      q: 'Where can I redeem my savings?',
      a: 'Visit the Santosh Instyle store at Nethaji Road, Hosur, Tamil Nadu. Bring your Account ID (from the app) and a valid photo ID. Our staff will process your maturity amount and gift in person.'
    },
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
          src="https://picsum.photos/seed/savings/800/600"
          alt="Savings Plans"
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
          <Badge variant="warning" className="bg-accent text-white border-none mb-2">FEATURED</Badge>
          <h1 className="text-3xl font-display font-bold text-white leading-tight">
            Vasthara Savings Plan
          </h1>
          <p className="text-white/70 text-sm font-medium mt-1">
            Flexible installments. Great value. Secured savings.
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
            The Vasthara Savings Plan lets you save a fixed amount each month for your plan duration.
            At the end of your plan, you receive the full saved value. Eligible plans also come with some gifts at maturity.
          </p>

          <div className="grid grid-cols-1 gap-4 mt-6">
            {[
              { title: 'Zero Hidden Charges', desc: 'No deductions or hidden fees. You get back exactly what you earn at maturity.', icon: ShieldCheck },
              { title: 'Gifts at Maturity', desc: 'Complete your installments and receive some gifts at maturity on redemption day.', icon: Gift },
              { title: 'Pay Any Day, Any Time', desc: 'No fixed due date. Pay your installment whenever it suits you during the month.', icon: TrendingUp },
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
              {
                step: '01',
                title: 'Choose a Plan',
                desc: 'Select a monthly installment amount that suits your budget — ₹1,000, ₹2,000, or ₹3,000 per month.',
              },
              {
                step: '02',
                title: 'Pay for Scheme Duration',
                desc: 'Pay your installment any day during the month — there is no fixed due date. Stay consistent for your scheme duration.',
              },
              {
                step: '03',
                title: 'Get Maturity Benefits',
                desc: 'After completing your scheme, collect your full maturity value plus some gifts at maturity at our Hosur branch.',
              },
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

const Badge = ({ children, variant = 'default', className }: any) => {
  const variants: Record<string, string> = {
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

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export default KnowMore;
