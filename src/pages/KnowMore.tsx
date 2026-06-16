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
      q: 'How does the membership program work?',
      a: 'Pay a fixed monthly subscription fee for the program term. Upon completion, you receive your membership benefits.'
    },
    {
      q: 'What do I receive when my subscription completes?',
      a: 'Upon completing all subscription terms, you receive your membership rewards and loyalty gifts (subject to discretion) — redeemable at the Santosh Instyle store in Hosur.'
    },
    {
      q: 'Can I pay early or skip a month?',
      a: 'Yes! There is no fixed due date — you can pay your monthly subscription fee any time during the month at your convenience. However, skipping a month is not recommended as it may delay your loyalty rewards.'
    },
    {
      q: 'Where can I redeem my membership rewards?',
      a: 'Visit the Santosh Instyle store at Nethaji Road, Hosur, Tamil Nadu. Bring your Account ID (from the app) and a valid photo ID. Our staff will process your membership rewards and promotional gifts in person.'
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
            Vasthara Membership Program
          </h1>
          <p className="text-white/70 text-sm font-medium mt-1">
            Flexible subscription tiers. Great value. Exclusive rewards.
          </p>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {/* About */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
            About the Program
          </h2>
          <p className="text-text-secondary leading-relaxed text-sm">
            The Vasthara Membership Program lets you subscribe to a tier and pay a monthly subscription fee.
            At the completion of your membership term, you receive your membership rewards. Eligible tiers also come with special loyalty gifts.
          </p>

          <div className="grid grid-cols-1 gap-4 mt-6">
            {[
              { title: 'Zero Hidden Charges', desc: 'No deductions or hidden fees. You receive the full value of your membership rewards upon completion.', icon: ShieldCheck },
              { title: 'Gifts and Rewards', desc: 'Complete your subscription terms and receive special loyalty gifts on redemption day.', icon: Gift },
              { title: 'Pay Any Day, Any Time', desc: 'No fixed due date. Pay your subscription fee whenever it suits you during the month.', icon: TrendingUp },
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
                title: 'Choose a Tier',
                desc: 'Select a monthly subscription fee that suits your budget — ₹1,000, ₹2,000, or ₹3,000 per month.',
              },
              {
                step: '02',
                title: 'Pay Monthly Subscription',
                desc: 'Pay your subscription fee any day during the month — there is no fixed due date. Stay active for your program term.',
              },
              {
                step: '03',
                title: 'Get Loyalty Rewards',
                desc: 'After completing your membership term, collect your full rewards plus special gifts at our Hosur branch.',
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

        {/* Compliance Disclaimer */}
        <Card className="p-6 border-2 border-accent/20 bg-accent/5 rounded-2xl space-y-3">
          <h3 className="text-xs font-black text-accent uppercase tracking-widest">Important Disclaimers</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            We do not accept deposits, investments, or public funds. The Vasthara Program is solely a promotional customer loyalty membership and subscription service. This is not a chit fund, recurring deposit, lending, EMI financing, or investment scheme. Payments made are subscription fees towards loyalty program membership and are redeemable only for products and promotional benefits as detailed in our program rules.
          </p>
        </Card>

        <div className="pt-4">
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/schemes-list')}
            className="shadow-card h-16 text-base"
          >
            Ready to Join? → View Subscriptions
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
