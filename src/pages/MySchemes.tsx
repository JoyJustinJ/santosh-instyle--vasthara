import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Sparkles, ChevronRight, TrendingUp } from 'lucide-react';
import { useSchemes } from '../context/SchemeContext';
import { Card, Badge, ProgressBar } from '../components/UI';
import { Button } from '../components/UI/Button';
import { formatCurrency } from '../utils';

const MySchemes = () => {
  const navigate = useNavigate();
  const { userSchemes } = useSchemes();

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
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">My Plans</h1>
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
            <Sparkles size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-primary">No Active Plans</h3>
            <p className="text-sm text-text-secondary max-w-[240px]">
              You haven't joined any savings schemes yet. Start saving for your future today!
            </p>
          </div>
          <Button onClick={() => navigate('/schemes-list')} size="lg" className="shadow-card">
            Explore Plans
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {userSchemes.map((plan, i) => (
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
                      <div className="flex gap-2">
                        <Badge variant="success">ACTIVE</Badge>
                        <Badge variant="default">{plan.monthsPaid}/{plan.duration} PAID</Badge>
                      </div>
                      <h3 className="text-xl font-display font-bold text-primary mt-2">
                        {plan.name}
                      </h3>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                        ID: {plan.accountId}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-muted group-hover:bg-accent-light group-hover:text-accent transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Saved Amount</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(plan.totalPaid)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Payments Due</p>
                        <p className="text-lg font-bold text-accent">{plan.monthsPaid}/{plan.duration}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-text-muted">Progress</span>
                        <span className="text-accent">{Math.round((plan.monthsPaid / plan.duration) * 100)}%</span>
                      </div>
                      <ProgressBar current={plan.monthsPaid} total={plan.duration} />
                    </div>
                  </div>
                </div>

                <div className="bg-surface px-6 py-3 flex justify-between items-center border-t border-border/50">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    <TrendingUp size={14} /> Next Due: 10th May
                  </div>
                  <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">
                    Pay Now
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
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
              <h4 className="font-display font-bold text-lg">Total Savings Value</h4>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Combined Balance</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(userSchemes.reduce((acc, curr) => acc + (curr.totalPaid || (curr.monthsPaid * curr.monthlyAmount) || 0), 0))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Active Plans</p>
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

export default MySchemes;
