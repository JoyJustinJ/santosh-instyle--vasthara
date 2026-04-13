import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, HandCoins, UserCheck, Award, ChevronLeft } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { formatCurrency } from '../utils';
import { getSchemesFromDB, recordTransactionInDB } from '../services/db';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<'overview' | 'deposit' | 'referrals'>('overview');
    const [selectedSchemeForDeposit, setSelectedSchemeForDeposit] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [schemesList, setSchemesList] = useState<any[]>([]);

    useEffect(() => {
        getSchemesFromDB().then(data => setSchemesList(data));
    }, []);

    const handleReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchemeForDeposit) {
            alert("Please select a scheme");
            return;
        }
        await recordTransactionInDB({
            type: 'receipt',
            amount: parseFloat(depositAmount),
            schemeId: selectedSchemeForDeposit,
            customerAccount: 'Manual Collection'
        });
        alert("Receipt recorded & customer's plan updated.");
        setSelectedSchemeForDeposit('');
        setDepositAmount('');
        setActiveView('overview');
    };

    const renderView = () => {
        if (activeView === 'deposit') {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Manual Cash Receipt</h2>
                    </div>
                    <form onSubmit={handleReceipt} className="space-y-4">
                        <Input label="Customer ID" placeholder="e.g. V-88291" required />

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Target Scheme</label>
                            <select
                                required
                                className="px-4 py-3 bg-surface border border-border/50 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all w-full text-base font-medium"
                                value={selectedSchemeForDeposit}
                                onChange={(e) => setSelectedSchemeForDeposit(e.target.value)}
                            >
                                <option value="" disabled>Select a scheme</option>
                                {schemesList.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.monthlyAmount)}/mo</option>
                                ))}
                            </select>
                        </div>

                        <Input label="Cash Amount (₹)" type="number" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                        <Button fullWidth className="mt-4 bg-success text-white" type="submit">Submit Cash Collection</Button>
                    </form>
                </motion.div>
            );
        }

        if (activeView === 'referrals') {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">My Referrals</h2>
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm text-text-muted py-4 text-center">Referrals will appear here as you add new customers.</p>
                    </div>
                </motion.div>
            );
        }

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                    <button onClick={() => navigate('/login')} className="p-2 -ml-2 text-primary">
                        <ChevronLeft size={24} />
                    </button>
                    <UserCheck className="text-accent" size={28} />
                    <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Staff Console</h1>
                </div>

                {/* Staff Stats */}
                <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden shadow-card">
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <Award size={20} className="text-[#D4AF37]" />
                            <h4 className="font-display font-bold text-lg">My Performance</h4>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Incentives Earned</p>
                                <p className="text-3xl font-bold">₹0</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Referrals</p>
                                <p className="text-xl font-bold">0 Customers</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <Card onClick={() => setActiveView('deposit')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                            <HandCoins size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Manual Cash Receipt</p>
                    </Card>
                    <Card onClick={() => setActiveView('referrals')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                        <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">View Referrals</p>
                    </Card>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="page-transition-wrapper p-6 pb-24">
            <AnimatePresence mode="wait">
                {renderView()}
            </AnimatePresence>
        </div>
    );
};

export default StaffDashboard;
