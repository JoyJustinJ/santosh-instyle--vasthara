import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronLeft, Plus, ChevronRight, TrendingUp, MapPin, FolderOpen } from 'lucide-react';
import { usePrograms } from '../context/ProgramContext';
import { Card, Badge, ProgressBar } from '../components/UI';
import { Button } from '../components/UI/Button';
import { formatCurrency } from '../utils';

const MyPrograms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userSchemes, loading } = usePrograms() as any;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="page-transition-wrapper p-6 pb-24 space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">{t('my_schemes.title')}</h1>
        </div>
        <button
          onClick={() => navigate('/schemes-list')}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-card active:scale-90 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      {userSchemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center text-text-muted">
            <FolderOpen size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-primary">{t('my_schemes.no_active')}</h3>
            <p className="text-sm text-text-secondary max-w-[240px]">
              {t('my_schemes.no_active_desc')}
            </p>
          </div>
          <Button onClick={() => navigate('/schemes-list')} size="lg" className="shadow-card">
            {t('my_schemes.explore_programs')}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {userSchemes.map((plan: any, i: number) => {
            const duration = plan.duration || 0;
            const paidMonths = duration > 0 ? Math.min(plan.monthsPaid || 0, duration) : (plan.monthsPaid || 0);
            const progressPercent = duration > 0 ? Math.round((paidMonths / duration) * 100) : 0;
            const isCompleted = plan.status === 'completed' || (duration > 0 && paidMonths >= duration);

            return (
              <motion.div
                key={plan.accountId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  onClick={() => navigate(`/plan-detail/${plan.accountId}`)}
                  className="p-0 overflow-hidden border-none shadow-card group"
                >
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={isCompleted ? 'primary' : 'success'}>
                            {isCompleted ? t('my_schemes.completed') : t('my_schemes.active')}
                          </Badge>
                          <Badge variant="default">{paidMonths}/{duration} {t('my_schemes.paid')}</Badge>
                        </div>
                        <h3 className="text-xl font-display font-bold text-primary mt-2">
                          {plan.name}
                        </h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-muted group-hover:bg-accent-light group-hover:text-accent transition-colors">
                        <ChevronRight size={20} />
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="rounded-2xl border border-success/30 bg-success-light/40 p-4 flex gap-3">
                        <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-success">{t('my_schemes.completed_msg')}</p>
                          <p className="text-xs leading-5 text-text-secondary">
                            {t('my_schemes.redemption_desc')}
                          </p>
                        </div>
                      </div>
                    )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('my_schemes.total_paid')}</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(plan.totalPaid)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('my_schemes.payments_due')}</p>
                        <p className="text-lg font-bold text-accent">{paidMonths}/{duration}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-text-muted">{t('my_schemes.progress')}</span>
                        <span className="text-accent">{progressPercent}%</span>
                      </div>
                      <ProgressBar current={paidMonths} total={duration} />
                    </div>

                    <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Return</span>
                      {(() => {
                        const baseScheme = plan;
                        const bonusAmount = plan.isPreClosed ? 0 : parseInt(baseScheme.bonuses?.match(/\d+/)?.[0] || '0', 10);
                        const totalReturn = (plan.monthlyAmount * duration) + bonusAmount;
                        return <span className="text-lg font-bold text-success">{formatCurrency(totalReturn)}</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-surface px-6 py-3 flex justify-between items-center border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    {isCompleted ? (
                      <>
                        <MapPin size={14} /> Redemption: Main Branch
                      </>
                    ) : (
                      <>
                        <TrendingUp size={14} /> Next Due: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleString('default', { month: 'long' })}
                      </>
                    )}
                  </div>
                  {!isCompleted && (
                    <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">
                      Pay Now
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
            );
          })}
        </div>
      )}

      {userSchemes.length > 0 && (
        <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden shadow-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <h4 className="font-display font-bold text-lg">Total Program Value</h4>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Total Paid</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(userSchemes.reduce((acc, curr) => acc + (curr.totalPaid || (curr.monthsPaid * curr.monthlyAmount) || 0), 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Active Subscriptions</p>
                <p className="text-xl font-bold">
                  {userSchemes.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MyPrograms;
