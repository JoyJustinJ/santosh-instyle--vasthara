import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, HandCoins, UserCheck, Award, ChevronLeft, Search, Smartphone, CheckCircle2, LogOut } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { formatCurrency, cn } from '../utils';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
    getSchemesFromDB,
    getUserPlansFromDB,
    recordTransactionInDB,
    getUserFromDB
} from '../services/db';
import { useNotification } from '../context/NotificationContext';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth()!;
    const { showNotification } = useNotification();

    // Protection: Only staff can access
    useEffect(() => {
        if (!user || user.role !== 'staff') {
            navigate('/home');
        }
    }, [user, navigate]);

    const [activeView, setActiveView] = useState<'overview' | 'deposit' | 'referrals' | 'customer_lookup'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<any>(null);

    const [depositAmount, setDepositAmount] = useState('');
    const [depositCustomer, setDepositCustomer] = useState('');
    const [depositCustomerProfile, setDepositCustomerProfile] = useState<any>(null);
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [customerActiveSchemes, setCustomerActiveSchemes] = useState<any[]>([]);
    const [schemesList, setSchemesList] = useState<any[]>([]);

    useEffect(() => {
        getSchemesFromDB().then(data => setSchemesList(data));
    }, []);

    const handleReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlans.length === 0) {
            showNotification("Please select at least one scheme", "error");
            return;
        }

        const amt = parseFloat(depositAmount);
        const expectedTotal = customerActiveSchemes
            .filter(s => selectedPlans.includes(s.accountId))
            .reduce((acc, s) => acc + s.monthlyAmount, 0);

        if (amt < expectedTotal) {
            const ok = window.confirm(`You entered ₹${amt} but selected schemes require ₹${expectedTotal}. Continue anyway?`);
            if (!ok) return;
        }

        try {
            const userId = depositCustomerProfile?.id || depositCustomer;
            for (const accountId of selectedPlans) {
                const s = customerActiveSchemes.find(p => p.accountId === accountId);
                if (!s) continue;

                const paid = s.monthlyAmount;
                const schemeRef = doc(db, "user_schemes", accountId);
                await updateDoc(schemeRef, {
                    monthsPaid: (s.monthsPaid || 0) + 1,
                    totalPaid: (s.totalPaid || 0) + paid,
                });

                await recordTransactionInDB({
                    userId: userId,
                    userName: `${depositCustomerProfile?.firstName || ''} ${depositCustomerProfile?.lastName || ''}`,
                    schemeName: s.name || s.schemeName || 'Purchase Plan',
                    accountId: accountId,
                    amount: paid,
                    type: 'deposit',
                    status: 'Success',
                    method: 'CASH',
                    recordedBy: user?.id || 'staff'
                });
            }

            showNotification("Receipt recorded & customer's plan(s) updated.", "success");
            setSelectedPlans([]);
            setDepositAmount('');
            setDepositCustomer('');
            setDepositCustomerProfile(null);
            setCustomerActiveSchemes([]);
            setActiveView('overview');
        } catch (error) {
            console.error(error);
            showNotification("Failed to record receipt.", "error");
        }
    };

    const handleCustomerLookup = async (id: string) => {
        setDepositCustomer(id);
        if (id.length >= 10) {
            try {
                // Try to find the user by phone
                const userProfile = await getUserFromDB(id);
                if (userProfile) {
                    setDepositCustomerProfile(userProfile);
                    const plansById = await getUserPlansFromDB(userProfile.id);
                    let plansByPhone: any[] = [];
                    if (userProfile.phone && userProfile.phone !== userProfile.id) {
                        plansByPhone = await getUserPlansFromDB(userProfile.phone);
                    }
                    const combinedPlans = [...plansById, ...plansByPhone];
                    const uniquePlans = combinedPlans.filter((v, i, a) => a.findIndex(t => t.accountId === v.accountId) === i);
                    
                    setCustomerActiveSchemes(uniquePlans.filter((p: any) => p.status !== 'completed'));
                } else {
                    setDepositCustomerProfile(null);
                    const plans = await getUserPlansFromDB(id);
                    setCustomerActiveSchemes(plans.filter((p: any) => p.status !== 'completed'));
                }
            } catch (err) {
                console.error("Error fetching customer info:", err);
            }
            setSelectedPlans([]);
            setDepositAmount('');
        } else {
            setDepositCustomerProfile(null);
            setCustomerActiveSchemes([]);
            setSelectedPlans([]);
            setDepositAmount('');
        }
    };

    const togglePlan = (accountId: string) => {
        let newSelection = [];
        if (selectedPlans.includes(accountId)) {
            newSelection = selectedPlans.filter(id => id !== accountId);
        } else {
            newSelection = [...selectedPlans, accountId];
        }
        setSelectedPlans(newSelection);

        const sum = customerActiveSchemes
            .filter(s => newSelection.includes(s.accountId))
            .reduce((acc, s) => acc + s.monthlyAmount, 0);
        setDepositAmount(sum > 0 ? sum.toString() : '');
    };

    const handleCustomerSearch = async () => {
        if (!searchQuery) return;
        const res: any = await getUserFromDB(searchQuery);
        if (res) {
            setFoundCustomer(res);
        } else {
            alert("Customer not found");
        }
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
                        <Input
                            label="Customer Phone"
                            placeholder="e.g. 9876543210"
                            required
                            value={depositCustomer}
                            onChange={(e) => handleCustomerLookup(e.target.value)}
                        />

                        {depositCustomerProfile && (
                            <div className="bg-success-light/20 border border-success/30 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                                    <UserCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-success uppercase tracking-widest">Verified Customer</p>
                                    <p className="font-bold text-primary">{depositCustomerProfile.firstName} {depositCustomerProfile.lastName}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Target Schemes</label>
                            {customerActiveSchemes.length > 0 ? (
                                customerActiveSchemes.map((s: any) => (
                                    <Card
                                        key={s.accountId}
                                        onClick={() => togglePlan(s.accountId)}
                                        className={cn(
                                            "p-4 border-2 transition-all cursor-pointer",
                                            selectedPlans.includes(s.accountId) ? "border-accent bg-accent-light/30" : "border-border/50"
                                        )}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                    selectedPlans.includes(s.accountId) ? "border-accent bg-accent" : "border-border"
                                                )}>
                                                    {selectedPlans.includes(s.accountId) && <CheckCircle2 size={14} className="text-white" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-primary text-sm">{s.name}</h4>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-primary">{formatCurrency(s.monthlyAmount)}</p>
                                                <p className="text-[9px] font-black text-accent uppercase tracking-widest">Due</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : depositCustomer.length >= 4 ? (
                                <p className="text-sm text-text-muted px-4 py-6 border border-border/50 bg-white rounded-xl text-center">No active schemes found for this customer.</p>
                            ) : null}
                        </div>

                        <Input label="Total Cash Collected (₹)" type="number" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
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

        if (activeView === 'customer_lookup') {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                        <button onClick={() => setActiveView('overview')} className="text-primary">
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-display font-bold text-primary">Customer Profile Update</h2>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter Customer Phone"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <button
                            onClick={handleCustomerSearch}
                            className="bg-primary text-white p-3 rounded-xl"
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    {foundCustomer && (
                        <Card className="p-6 space-y-6 border-none shadow-card">
                            <div className="space-y-1">
                                <h3 className="font-bold text-primary">{foundCustomer.firstName} {foundCustomer.lastName}</h3>
                            </div>

                            <div className="pt-4 border-t border-border space-y-1">
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Mobile Number</p>
                                <p className="text-sm font-bold text-primary flex items-center gap-2">
                                    <Smartphone size={14} /> {foundCustomer.phone}
                                </p>
                                <p className="text-[10px] text-text-muted mt-1">Contact admin to change phone number.</p>
                            </div>
                        </Card>
                    )}
                </motion.div>
            );
        }

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                    <button onClick={async () => {
                        await logout();
                        navigate('/login');
                    }} className="p-2 -ml-2 text-primary">
                        <LogOut size={24} />
                    </button>
                    <UserCheck className="text-accent" size={28} />
                    <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Staff Console</h1>
                </div>

                {/* Staff Stats */}
                <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden shadow-card">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Award size={20} className="text-[#D4AF37]" />
                                <h4 className="font-display font-bold text-lg">Hello, {user?.firstName || 'Staff'}</h4>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Incentives Earned</p>
                                <p className="text-3xl font-bold">₹0</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Referrals</p>
                            <p className="text-xl font-bold">0 Customers</p>
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
                    <Card onClick={() => setActiveView('customer_lookup')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface col-span-2">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Search size={24} />
                        </div>
                        <p className="text-xs font-bold text-primary">Customer Lookup</p>
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
