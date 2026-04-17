import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, HandCoins, UserCheck, Award, ChevronLeft, Search, Edit2, Smartphone } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { formatCurrency } from '../utils';
import { useAuth } from '../context/AuthContext';
import {
    getSchemesFromDB, getAdminSettings,
    updateAdminSettings,
    getUserPlansFromDB,
    recordTransactionInDB,
    getUserFromDB,
    createUserProfile
} from '../services/db';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth()!;

    // Protection: Only staff can access
    useEffect(() => {
        if (!user || user.role !== 'staff') {
            navigate('/home');
        }
    }, [user, navigate]);

    const [activeView, setActiveView] = useState<'overview' | 'deposit' | 'referrals' | 'customer_lookup'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<any>(null);
    const [newPhone, setNewPhone] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [depositCustomer, setDepositCustomer] = useState('');
    const [selectedSchemeForDeposit, setSelectedSchemeForDeposit] = useState('');
    const [customerActiveSchemes, setCustomerActiveSchemes] = useState<any[]>([]);
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
            customerAccount: depositCustomer
        });
        alert("Receipt recorded & customer's plan updated.");
        setSelectedSchemeForDeposit('');
        setDepositAmount('');
        setDepositCustomer('');
        setCustomerActiveSchemes([]);
        setActiveView('overview');
    };

    const handleCustomerLookup = async (id: string) => {
        setDepositCustomer(id);
        if (id.length >= 4) {
            const plans = await getUserPlansFromDB(id);
            const activeJoinedSchemes = schemesList.filter(s => plans.some((p: any) => p.schemeId === s.id));
            setCustomerActiveSchemes(activeJoinedSchemes);
        } else {
            setCustomerActiveSchemes([]);
        }
    };

    const handleCustomerSearch = async () => {
        if (!searchQuery) return;
        const res: any = await getUserFromDB(searchQuery);
        if (res) {
            setFoundCustomer(res);
            setNewPhone(res.phone);
        } else {
            alert("Customer not found");
        }
    };

    const handleUpdatePhone = async () => {
        if (!newPhone) return;
        try {
            const updated = { ...foundCustomer, phone: newPhone };
            await createUserProfile(updated);
            alert("Phone number updated successfully!");
            setFoundCustomer(null);
            setSearchQuery('');
        } catch (err) {
            alert("Update failed");
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
                            label="Customer ID"
                            placeholder="e.g. V-88291"
                            required
                            value={depositCustomer}
                            onChange={(e) => handleCustomerLookup(e.target.value)}
                        />

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Target Scheme</label>
                            <select
                                required
                                className="px-4 py-3 bg-surface border border-border/50 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all w-full text-base font-medium"
                                value={selectedSchemeForDeposit}
                                onChange={(e) => setSelectedSchemeForDeposit(e.target.value)}
                            >
                                <option value="" disabled>Select a scheme</option>
                                {customerActiveSchemes.length > 0 ? (
                                    customerActiveSchemes.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.monthlyAmount)}/mo</option>
                                    ))
                                ) : (
                                    <option disabled>No joined schemes found</option>
                                )}
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
                                <p className="text-xs text-text-muted">Customer ID: {foundCustomer.id}</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border">
                                <Input
                                    label="Update Phone Number"
                                    icon={Smartphone}
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                />
                                <Button fullWidth onClick={handleUpdatePhone}>Update Mobile Number</Button>
                            </div>
                        </Card>
                    )}
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
                        <p className="text-xs font-bold text-primary">Search & Update Customer Phone</p>
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
