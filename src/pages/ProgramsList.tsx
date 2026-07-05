import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Info, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { getSchemesFromDB } from '../services/db';
import { Scheme } from '../types';
import { formatCurrency } from '../utils';

const ProgramsList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [schemes, setSchemes] = React.useState<Scheme[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedScheme, setSelectedScheme] = React.useState<Scheme | null>(null);

  React.useEffect(() => {
    getSchemesFromDB().then(data => {
      setSchemes(data.filter((s: any) => s.status === 'active') as any[]);
      setLoading(false);
    });
  }, []);

  return (
    <>
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
            Choose Your Subscription
          </h1>
          <p className="text-xs font-medium text-text-secondary">
            Select a membership level that fits your preferences
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12 text-text-muted font-bold">Loading plans...</div>
        ) : schemes.map((scheme, i) => (
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
              
              {(() => {
                  const bonusAmount = parseInt(scheme.bonuses?.match(/\d+/)?.[0] || '0', 10);
                  const totalReturn = (scheme.monthlyAmount * scheme.duration) + bonusAmount;
                  return (
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Badge variant="default">{scheme.duration} MONTHS</Badge>
                    </div>
                    <h3 className="text-xl font-display font-bold text-primary mt-2">
                      {scheme.name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-surface rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Monthly</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(scheme.monthlyAmount)}</p>
                  </div>
                  <div className="bg-surface rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{scheme.duration} Months</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(scheme.monthlyAmount * scheme.duration)}</p>
                  </div>
                  <div className="col-span-2 bg-success-light/30 rounded-xl p-3 border border-success/30 text-center">
                    <p className="text-[10px] font-black text-success uppercase tracking-widest mb-1">Total Return + Bonus</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(totalReturn)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {scheme.description && scheme.description !== 'New custom scheme' && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {scheme.description}
                    </p>
                  )}
                  {(scheme.gifts || scheme.bonuses) && (
                    <div className="flex flex-col gap-2 mt-2">
                      {scheme.gifts && (
                        <div className="bg-emerald-50/50 border border-emerald-100 text-emerald-700 text-xs px-3 py-2 rounded-xl flex items-center font-medium">
                          <span className="font-bold mr-1">Gift:</span> <span>{scheme.gifts}</span>
                        </div>
                      )}
                      {scheme.bonuses && (
                        <div className="bg-amber-50/50 border border-amber-100 text-amber-700 text-xs px-3 py-2 rounded-xl flex items-center font-medium">
                          <span className="font-bold mr-1">Bonus:</span> <span>{scheme.bonuses}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => navigate(`/scheme-join?plan=${scheme.id}`)}
                      className="h-14"
                    >
                      SUBSCRIBE NOW
                    </Button>
                    <button
                      onClick={() => setSelectedScheme(scheme)}
                      className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                    >
                      <Info size={20} />
                    </button>
                  </div>
                </div>
              </div>
              );
              })()}
            </Card>
          </motion.div>
        ))}
      </div>


    </motion.div>

      {/* Scheme Info Modal */}
      <AnimatePresence>
        {selectedScheme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-primary p-6 relative">
                <button 
                  onClick={() => setSelectedScheme(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition"
                >
                  <X size={18} />
                </button>
                <Badge variant="warning" className="bg-accent text-white border-none mb-2">{selectedScheme.duration} MONTHS</Badge>
                <h2 className="text-2xl font-display font-bold text-white">{selectedScheme.name}</h2>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const bonusAmount = parseInt(selectedScheme.bonuses?.match(/\d+/)?.[0] || '0', 10);
                    const totalAmount = selectedScheme.monthlyAmount * selectedScheme.duration;
                    const totalReturn = totalAmount + bonusAmount;
                    return (
                      <>
                        <div className="bg-surface rounded-xl p-3 border border-border/50 text-center">
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Monthly</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(selectedScheme.monthlyAmount)}</p>
                        </div>
                        <div className="bg-surface rounded-xl p-3 border border-border/50 text-center">
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{selectedScheme.duration} Months</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</p>
                        </div>
                        <div className="col-span-2 bg-success-light/30 rounded-xl p-3 border border-success/30 text-center">
                          <p className="text-[10px] font-black text-success uppercase tracking-widest mb-1">Total Return + Bonus</p>
                          <p className="text-xl font-bold text-success">{formatCurrency(totalReturn)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest">About this plan</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {selectedScheme.description || 'Subscribe to this plan by paying the monthly subscription amount.'}
                  </p>
                </div>

                {(selectedScheme.gifts || selectedScheme.bonuses) && (
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest">Rewards & Benefits</h4>
                    {selectedScheme.gifts && (
                      <div className="flex gap-3 items-start bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">🎁</div>
                        <div>
                          <p className="text-xs font-bold text-emerald-800">Assured Gift</p>
                          <p className="text-xs text-emerald-700 mt-0.5">{selectedScheme.gifts}</p>
                        </div>
                      </div>
                    )}
                    {selectedScheme.bonuses && (
                      <div className="flex gap-3 items-start bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">✨</div>
                        <div>
                          <p className="text-xs font-bold text-amber-800">Bonus Reward</p>
                          <p className="text-xs text-amber-700 mt-0.5">{selectedScheme.bonuses}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-black text-primary uppercase tracking-widest">Rules & Guidelines</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-xs text-text-secondary leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></div>
                      <p><strong className="text-primary font-bold block mb-0.5">Flexible Payments</strong> Pay your monthly subscription fee any day of the month. There is no strict due date.</p>
                    </li>
                    <li className="flex gap-3 text-xs text-text-secondary leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></div>
                      <p><strong className="text-primary font-bold block mb-0.5">Missed Installments (Duration Extension)</strong> If you miss a month's payment, your scheme's maturity duration will automatically extend. You must complete all {selectedScheme.duration} installments to be eligible for redemption.</p>
                    </li>
                    <li className="flex gap-3 text-xs text-text-secondary leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0"></div>
                      <p><strong className="text-primary font-bold block mb-0.5">Redemption</strong> Upon completing all {selectedScheme.duration} installments, receive your full membership value plus eligible gifts at our Hosur store.</p>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="p-4 bg-surface border-t border-border/50">
                <Button 
                  fullWidth 
                  onClick={() => navigate(`/scheme-join?plan=${selectedScheme.id}`)}
                  className="h-14 shadow-card"
                >
                  SUBSCRIBE TO THIS PLAN
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProgramsList;
