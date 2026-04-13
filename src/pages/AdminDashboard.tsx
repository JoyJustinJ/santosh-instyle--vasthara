import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Trash2, Plus, Users, Landmark, FileText,
    ChevronLeft, HandCoins, CheckCircle, XCircle, Edit2, Save, X
} from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Notification, NotificationType } from '../components/UI/Notification';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { formatCurrency } from '../utils';
import {
    getSchemesFromDB,
    getStaffRequestsFromDB,
    saveSchemeToDB,
    deleteSchemeFromDB,
    deleteStaffRequestFromDB,
    recordTransactionInDB,
    getAdminSettings,
    updateAdminSettings
} from '../services/db';

type ViewState = 'overview' | 'create_scheme' | 'manage_schemes' | 'deposit' | 'incentives' | 'staff' | 'settings';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<ViewState>('overview');

    // DB State
    const [schemesList, setSchemesList] = useState<any[]>([]);
    const [pendingStaff, setPendingStaff] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [newScheme, setNewScheme] = useState({ name: '', duration: '', amount: '' });
    const [selectedSchemeForDeposit, setSelectedSchemeForDeposit] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [adminSettings, setAdminSettings] = useState({ adminId: '', password: '', securityPin: '' });

    const showNotif = (message: string, type: NotificationType = 'success') => {
        setNotification({ message, type });
        // Auto close after 4 seconds
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const fetchDB = async () => {
            try {
                const s = await getSchemesFromDB();
                setSchemesList(s);
                const r = await getStaffRequestsFromDB();
                setPendingStaff(r);
                const settings = await getAdminSettings();
                setAdminSettings(settings);
            } catch (err) {
                console.error("Failed to load Firebase data:", err);
            } finally {
                setLoadingData(false);
            }
        };
        fetchDB();
    }, []);

    // Edit state
    const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', duration: '', amount: '' });

    // Handlers
    const handleCreateScheme = async (e: React.FormEvent) => {
        e.preventDefault();

        const duration = parseInt(newScheme.duration);
        const amount = parseInt(newScheme.amount);

        if (isNaN(duration) || isNaN(amount) || !newScheme.name) {
            showNotif("Please enter valid name, duration and amount.", 'error');
            return;
        }

        const created = {
            id: 'scheme_' + Date.now(), // More robust ID
            name: newScheme.name,
            duration: duration,
            monthlyAmount: amount,
            maturityValue: amount * duration + 500,
            members: 0,
            description: 'New custom scheme',
            category: 'Custom'
        };
        await saveSchemeToDB(created);
        setSchemesList([...schemesList, created]);
        showNotif("Scheme Created Successfully!");
        setNewScheme({ name: '', duration: '', amount: '' });
        setActiveView('overview');
    };

    const handleDeleteScheme = async (id: string) => {
        if (!id) {
            showNotif("Error: Scheme has no ID", 'error');
            return;
        }
        setIdToDelete(id);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;

        try {
            await deleteSchemeFromDB(idToDelete.toString());
            setSchemesList(schemesList.filter(s => String(s.id) !== String(idToDelete)));
            showNotif("Scheme deleted successfully!");
        } catch (err: any) {
            console.error("Delete failed:", err);
            showNotif(`Delete Failed: ${err.message}`, 'error');
        } finally {
            setIdToDelete(null);
        }
    };

    const handleEditScheme = (scheme: any) => {
        setEditingSchemeId(scheme.id);
        setEditForm({ name: scheme.name, duration: scheme.duration.toString(), amount: scheme.monthlyAmount.toString() });
    };

    const handleSaveEdit = async (id: string) => {
        const duration = parseInt(editForm.duration);
        const amount = parseInt(editForm.amount);

        if (isNaN(duration) || isNaN(amount) || !editForm.name) {
            showNotif("Invalid input values", 'error');
            return;
        }

        const updatedList = await Promise.all(schemesList.map(async s => {
            if (String(s.id) === String(id)) {
                const newParams = {
                    ...s,
                    name: editForm.name,
                    duration: duration,
                    monthlyAmount: amount,
                    maturityValue: amount * duration + 500
                };
                await saveSchemeToDB(newParams);
                return newParams;
            }
            return s;
        }));
        setSchemesList(updatedList);
        setEditingSchemeId(null);
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchemeForDeposit) {
            showNotif("Please select a scheme", 'error');
            return;
        }
        await recordTransactionInDB({
            type: 'deposit',
            amount: parseFloat(depositAmount),
            schemeId: selectedSchemeForDeposit,
            customerAccount: 'Manual'
        });
        showNotif("Cash deposit recorded successfully!");
        setSelectedSchemeForDeposit('');
        setDepositAmount('');
        setActiveView('overview');
    };

    const handleStaffAction = async (id: string, action: 'approve' | 'reject') => {
        await deleteStaffRequestFromDB(id.toString());
        setPendingStaff(pendingStaff.filter(staff => staff.id !== id));
        showNotif(`Staff request ${action}d successfully.`, 'info');
    };

    const handleUpdateSecurity = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingData(true);
        try {
            await updateAdminSettings(adminSettings);
            showNotif("Admin Security Settings Updated!");
            setActiveView('overview');
        } catch (err) {
            showNotif("Failed to update security", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const renderView = () => {
        switch (activeView) {
            case 'create_scheme':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Create Scheme</h2>
                        </div>
                        <form onSubmit={handleCreateScheme} className="space-y-4">
                            <Input label="Scheme Name" required value={newScheme.name} onChange={e => setNewScheme({ ...newScheme, name: e.target.value })} />
                            <Input label="Duration (Months)" type="number" required value={newScheme.duration} onChange={e => setNewScheme({ ...newScheme, duration: e.target.value })} />
                            <Input label="Monthly Installment (₹)" type="number" required value={newScheme.amount} onChange={e => setNewScheme({ ...newScheme, amount: e.target.value })} />
                            <Button fullWidth className="mt-4" type="submit">Publish Scheme</Button>
                        </form>
                    </motion.div>
                );

            case 'manage_schemes':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Manage Schemes</h2>
                        </div>
                        <div className="space-y-4">
                            {schemesList.map(s => (
                                <Card key={s.id} className="p-4 border-none shadow-subtle flex flex-col gap-3 bg-surface">
                                    {editingSchemeId === s.id ? (
                                        <div className="space-y-3">
                                            <Input label="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                            <div className="flex gap-2">
                                                <Input label="Duration" type="number" value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} />
                                                <Input label="Amount" type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
                                            </div>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingSchemeId(null)} className="p-2 border rounded-xl flex items-center justify-center text-text-muted">
                                                    <X size={16} />
                                                </button>
                                                <button onClick={() => handleSaveEdit(s.id)} className="p-2 bg-success text-white rounded-xl flex items-center justify-center px-4 gap-2 font-bold text-sm">
                                                    <Save size={16} /> Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-primary text-sm">{s.name}</h3>
                                                <p className="text-xs text-text-muted">{s.duration} Months • {formatCurrency(s.monthlyAmount)}/mo</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditScheme(s)} className="p-2 text-accent bg-accent/10 rounded-xl">
                                                    <Edit2 size={16} />
                                                </button>
                                                <motion.button
                                                    whileTap={{ scale: 0.8 }}
                                                    onClick={() => handleDeleteScheme(s.id)}
                                                    className="p-3 text-white bg-danger rounded-xl shadow-lg flex items-center justify-center"
                                                >
                                                    <Trash2 size={24} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'deposit':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Manual Cash Deposit</h2>
                        </div>
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <Input label="Customer ID / Phone" placeholder="e.g. 9876543210" required />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Target Scheme</label>
                                <select
                                    required
                                    className="px-4 py-3 bg-surface border border-border/50 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all w-full text-base font-medium"
                                    value={selectedSchemeForDeposit}
                                    onChange={(e) => setSelectedSchemeForDeposit(e.target.value)}
                                >
                                    <option value="" disabled>Select a scheme</option>
                                    {schemesList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.monthlyAmount)}/mo</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Amount Received (₹)" type="number" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                            <Input label="Reference Notes" placeholder="Receipt number, etc (optional)" />
                            <Button fullWidth className="mt-4 bg-success text-white" type="submit">Confirm Deposit</Button>
                        </form>
                    </motion.div>
                );

            case 'incentives':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Incentives & Reports</h2>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm text-text-muted py-4">Real-time referrals and incentive reports are being calculated from the database.</p>
                            <Button fullWidth variant="outline" className="mt-4">Download Full CSV Report</Button>
                        </div>
                    </motion.div>
                );

            case 'staff':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Staff Approvals & Rights</h2>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Pending Requests</h3>
                            {pendingStaff.length === 0 ? (
                                <p className="text-sm text-text-muted py-4">No pending requests.</p>
                            ) : (
                                pendingStaff.map((staff) => (
                                    <Card key={staff.id} className="p-4 border-none shadow-subtle flex justify-between items-center bg-white">
                                        <div>
                                            <p className="text-sm font-bold text-primary">{staff.name}</p>
                                            <p className="text-[10px] text-text-muted">Requested Branch: {staff.branch}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleStaffAction(staff.id, 'approve')} className="p-2 bg-success/10 text-success rounded-xl">
                                                <CheckCircle size={18} />
                                            </button>
                                            <button onClick={() => handleStaffAction(staff.id, 'reject')} className="p-2 bg-danger/10 text-danger rounded-xl">
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </motion.div>
                );

            case 'settings':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Security Settings</h2>
                        </div>
                        <form onSubmit={handleUpdateSecurity} className="space-y-4">
                            <Input
                                label="Admin Username"
                                value={adminSettings.adminId}
                                onChange={e => setAdminSettings({ ...adminSettings, adminId: e.target.value })}
                            />
                            <Input
                                label="New Admin Password"
                                type="password"
                                value={adminSettings.password}
                                onChange={e => setAdminSettings({ ...adminSettings, password: e.target.value })}
                            />
                            <Input
                                label="Security PIN (4 Digits)"
                                type="password"
                                maxLength={4}
                                value={adminSettings.securityPin}
                                onChange={e => setAdminSettings({ ...adminSettings, securityPin: e.target.value })}
                            />
                            <div className="pt-4">
                                <Button fullWidth type="submit" loading={loadingData}>Save Security Settings</Button>
                            </div>
                        </form>
                    </motion.div>
                );

            default:
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => navigate('/login')} className="p-2 -ml-2 text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <Shield className="text-accent" size={28} />
                            <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Admin Console</h1>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card onClick={() => setActiveView('create_scheme')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                    <Plus size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Create Scheme</p>
                            </Card>
                            <Card onClick={() => setActiveView('manage_schemes')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                    <FileText size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Manage Schemes</p>
                            </Card>
                            <Card onClick={() => setActiveView('deposit')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                                    <HandCoins size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Manual Cash Deposit</p>
                            </Card>
                            <Card onClick={() => setActiveView('incentives')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                                    <Landmark size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Incentives & Reports</p>
                            </Card>
                            <Card onClick={() => setActiveView('staff')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface col-span-2">
                                <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Staff Approvals & Rights</p>
                            </Card>
                        </div>

                        <div className="mt-8 pt-8 border-t border-border/50">
                            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Account Security</h3>
                            <Button
                                variant="outline"
                                fullWidth
                                className="border-primary/20 text-primary py-6"
                                onClick={() => setActiveView('settings')}
                            >
                                <Shield size={18} className="mr-2" /> MANAGE PASSWORD & PIN
                            </Button>
                        </div>
                    </motion.div>
                );
        }
    };

    return (
        <div className="page-transition-wrapper p-6 pb-24">
            <AnimatePresence>
                <Notification
                    isVisible={!!notification}
                    message={notification?.message || ''}
                    type={notification?.type || 'success'}
                    onClose={() => setNotification(null)}
                />
                <ConfirmModal
                    isOpen={!!idToDelete}
                    title="Delete Scheme?"
                    message="Are you sure you want to remove this scheme? This action cannot be undone."
                    confirmText="Delete Now"
                    type="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setIdToDelete(null)}
                />
            </AnimatePresence>
            <AnimatePresence mode="wait">
                {renderView()}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
