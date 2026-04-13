import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, ArrowRight, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { SCHEMES } from '../constants';
import { formatCurrency } from '../utils';

const SchemesList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-6 pb-12 space-y-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-xs font-medium text-text-secondary">
            Select a savings plan that fits your budget
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {SCHEMES.map((scheme, i) => (
          <motion.div
            key={scheme.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-0 overflow-hidden border-none shadow-card relative group">
              {scheme.category === 'Popular' && (
                <div className="absolute top-0 right-0">
                  <div className="bg-accent text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm">
                    Popular
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Badge variant="default">{scheme.duration} MONTHS</Badge>
                      <Badge variant="warning" className="bg-amber-50 text-amber-600 border-amber-100">GIFT BOX</Badge>
                    </div>
                    <h3 className="text-xl font-display font-bold text-primary mt-2">
                      {scheme.name}
                    </h3>
                  </div>
                </div>

                <div className="bg-surface rounded-2xl p-4 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly Payable</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(scheme.monthlyAmount)}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Value</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(scheme.maturityValue)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {scheme.description}
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => navigate(`/scheme-join?plan=${scheme.id}`)}
                      className="h-14"
                    >
                      JOIN THIS PLAN
                    </Button>
                    <button
                      onClick={() => navigate('/scheme-info')}
                      className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                    >
                      <Info size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="bg-accent-light rounded-2xl p-6 flex items-center gap-4 border border-accent/10">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-accent shrink-0 shadow-subtle">
          <Sparkles size={24} />
        </div>
        <div>
          <h4 className="font-bold text-primary text-sm">Need a custom plan?</h4>
          <p className="text-xs text-text-secondary mt-0.5">Visit our branch for personalized savings schemes.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SchemesList;
