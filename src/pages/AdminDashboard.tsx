import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Trash2, Plus, Users, Landmark, FileText,
    ChevronLeft, HandCoins, CheckCircle, XCircle, Edit2, Save, X, Search, Smartphone
} from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Notification, NotificationType } from '../components/UI/Notification';
import { ConfirmModal } from '../components/UI/ConfirmModal';
import { formatCurrency, cn } from '../utils';
import {
    getSchemesFromDB,
    getStaffRequestsFromDB,
    saveSchemeToDB,
    deleteSchemeFromDB,
    deleteStaffRequestFromDB,
    recordTransactionInDB,
    getAdminSettings,
    updateAdminSettings,
    getUserPlansFromDB,
    getTransactionsFromDB,
    getAllUsersFromDB,
    createUserProfile,
    getUserFromDB,
    getAllAdminsFromDB,
    deleteAdminFromDB
} from '../services/db';

type ViewState = 'overview' | 'create_scheme' | 'manage_schemes' | 'deposit' | 'incentives' | 'transactions' | 'staff' | 'staff_mgmt' | 'customer_update' | 'settings';

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
    const [depositCustomer, setDepositCustomer] = useState('');
    const [customerActiveSchemes, setCustomerActiveSchemes] = useState<any[]>([]);
    const [incentiveRange, setIncentiveRange] = useState({ start: '', end: '' });
    const [filteredIncentives, setFilteredIncentives] = useState<any[]>([]);
    const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [adminSettings, setAdminSettings] = useState({ adminId: '', password: '', securityPin: '' });
    const [newAdmin, setNewAdmin] = useState({ adminId: '', password: '', securityPin: '' });
    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<any>(null);
    const [newPhone, setNewPhone] = useState('');
    const [isPrimaryAdmin] = useState(() => localStorage.getItem('is_primary_admin') === 'true');
    const [adminsList, setAdminsList] = useState<any[]>([]);

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
                await loadStaffList();
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
            category: 'Custom',
            status: 'active'
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

    const handleToggleStatus = async (id: string) => {
        const updatedList = await Promise.all(schemesList.map(async s => {
            if (String(s.id) === String(id)) {
                const newStatus = s.status === 'active' ? 'inactive' : 'active';
                const updated = { ...s, status: newStatus };
                await saveSchemeToDB(updated);
                return updated;
            }
            return s;
        }));
        setSchemesList(updatedList);
        showNotif("Scheme status updated!");
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
            customerAccount: depositCustomer
        });
        showNotif("Cash deposit recorded successfully!");
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

    const handleStaffAction = async (id: string, action: 'approve' | 'reject') => {
        if (action === 'approve') {
            const request = pendingStaff.find(s => s.id === id);
            if (request) {
                // Create user profile for the approved staff
                await createUserProfile({
                    phone: request.phone,
                    firstName: request.name.split(' ')[0] || request.name,
                    lastName: request.name.split(' ').slice(1).join(' ') || '',
                    branch: request.branch,
                    role: 'staff',
                    password: 'password123', // Default password for new staff
                    pin: '1234',            // Default PIN for new staff
                    status: 'active'
                });
                showNotif(`Staff account created for ${request.name}. Password: password123`, 'success');
            }
        }
        await deleteStaffRequestFromDB(id.toString());
        setPendingStaff(pendingStaff.filter(staff => staff.id !== id));
        if (action === 'reject') {
            showNotif(`Staff request rejected.`, 'info');
        }
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

    const handleAddAdmin = async () => {
        if (!newAdmin.adminId || !newAdmin.password || !newAdmin.securityPin) {
            showNotif("Please fill all fields", 'error');
            return;
        }
        setLoadingData(true);
        try {
            // We use a different ID for extra admins
            const adminDocId = `admin_${newAdmin.adminId}`;
            const { db } = await import('../firebase');
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, "admins", adminDocId), newAdmin);
            showNotif("New Admin added successfully!");
            setNewAdmin({ adminId: '', password: '', securityPin: '' });
            setShowAddAdmin(false);
            // Refresh the admins list so the new admin appears immediately
            const updated = await getAllAdminsFromDB();
            setAdminsList(updated);
        } catch (err) {
            showNotif("Failed to add admin", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const loadStaffList = async () => {
        setLoadingData(true);
        const users = await getAllUsersFromDB();
        setStaffList(users.filter((u: any) => u.role === 'staff'));
        setLoadingData(false);
    };

    const handleUpdateStaffAuthority = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingData(true);
        try {
            await createUserProfile(editingStaff); // Re-saves the user with new data
            showNotif("Staff authority updated!");
            setEditingStaff(null);
            loadStaffList();
        } catch (err) {
            showNotif("Update failed", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleCustomerSearch = async () => {
        if (!searchQuery) return;
        setLoadingData(true);
        const res: any = await getUserFromDB(searchQuery);
        if (res) {
            setFoundCustomer(res);
            setNewPhone(res.phone);
        } else {
            showNotif("Customer not found", 'error');
        }
        setLoadingData(false);
    };

    const handleUpdatePhone = async () => {
        if (!newPhone) return;
        setLoadingData(true);
        try {
            const updated = { ...foundCustomer, phone: newPhone };
            await createUserProfile(updated);
            showNotif("Phone number updated successfully!");
            setFoundCustomer(null);
            setSearchQuery('');
            setActiveView('overview');
        } catch (err) {
            showNotif("Update failed", 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const handleFilterIncentives = async () => {
        if (!incentiveRange.start || !incentiveRange.end) {
            showNotif("Please select both start and end dates", 'error');
            return;
        }
        setLoadingData(true);
        try {
            const allTx = await getTransactionsFromDB();
            const start = new Date(incentiveRange.start).getTime();
            const end = new Date(incentiveRange.end).getTime();

            const filtered = allTx.filter((tx: any) => {
                const txTime = new Date(tx.timestamp).getTime();
                return txTime >= start && txTime <= end;
            });
            setFilteredIncentives(filtered);
        } catch (err) {
            showNotif("Error fetching reports", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleDownloadCSV = async () => {
        if (filteredIncentives.length === 0) return;

        // Fetch all users once and build a lookup map by phone (which is the user doc ID)
        const allUsers = await getAllUsersFromDB();
        const userMap: Record<string, any> = {};
        allUsers.forEach((u: any) => {
            userMap[u.id] = u;
            if (u.phone) userMap[u.phone] = u;
        });

        // Build a scheme name lookup from already-loaded schemesList
        const schemeMap: Record<string, string> = {};
        schemesList.forEach((s: any) => {
            schemeMap[s.id] = s.name;
        });

        const headers = ["Transaction ID", "Customer Name", "Phone Number", "Amount (₹)", "Date", "Transaction Type", "Scheme Name"];

        const rows = filteredIncentives.map(tx => {
            const accountKey = tx.customerAccount || tx.userPhone || tx.accountId || '';
            const user = userMap[accountKey];
            const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : accountKey;
            const phone = user?.phone || accountKey;
            const schemeName = schemeMap[tx.schemeId] || tx.schemeId || 'N/A';

            return [
                tx.id || 'N/A',
                `"${customerName}"`,
                phone,
                tx.amount || 0,
                tx.date || new Date(tx.timestamp).toLocaleDateString(),
                (tx.type || 'unknown').toUpperCase(),
                `"${schemeName}"`
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Transactions_${incentiveRange.start}_to_${incentiveRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                                                <button
                                                    onClick={() => handleToggleStatus(s.id)}
                                                    className={cn(
                                                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                        s.status === 'active'
                                                            ? "bg-success/10 text-success border border-success/20"
                                                            : "bg-danger/10 text-danger border border-danger/20"
                                                    )}
                                                >
                                                    {s.status}
                                                </button>
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
                            <Input
                                label="Customer ID / Phone"
                                placeholder="e.g. 9876543210"
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
                                        customerActiveSchemes.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.monthlyAmount)}/mo</option>
                                        ))
                                    ) : (
                                        <option disabled>No joined schemes found for this customer</option>
                                    )}
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={incentiveRange.start}
                                    onChange={(e) => setIncentiveRange({ ...incentiveRange, start: e.target.value })}
                                />
                                <Input
                                    label="End Date"
                                    type="date"
                                    value={incentiveRange.end}
                                    onChange={(e) => setIncentiveRange({ ...incentiveRange, end: e.target.value })}
                                />
                            </div>
                            <Button fullWidth onClick={handleFilterIncentives} loading={loadingData}>Generate Report</Button>

                            <div className="pt-4 space-y-3">
                                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Transaction History</h3>
                                {filteredIncentives.length === 0 ? (
                                    <p className="text-sm text-text-muted py-4 text-center">No transactions found for this period.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                        {filteredIncentives.map((tx) => (
                                            <Card key={tx.id} className="p-3 border-none shadow-subtle flex justify-between items-center bg-white">
                                                <div>
                                                    <p className="text-xs font-bold text-primary">{tx.customerAccount}</p>
                                                    <p className="text-[10px] text-text-muted">{tx.date} • {tx.type.toUpperCase()}</p>
                                                </div>
                                                <p className="text-sm font-bold text-success">{formatCurrency(tx.amount)}</p>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button fullWidth variant="outline" className="mt-4" disabled={filteredIncentives.length === 0} onClick={handleDownloadCSV}>
                                Download Full CSV Report
                            </Button>
                        </div>
                    </motion.div>
                );

            case 'customer_update':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Customer Phone Update</h2>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Phone / ID"
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
                                    <p className="text-xs text-text-muted">Account ID: {foundCustomer.id}</p>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <Input
                                        label="New Phone Number"
                                        icon={Smartphone}
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                    />
                                    <Button fullWidth onClick={handleUpdatePhone} loading={loadingData}>Update Mobile</Button>
                                </div>
                            </Card>
                        )}
                    </motion.div>
                );

            case 'staff_mgmt':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Staff Authority Management</h2>
                        </div>

                        {editingStaff ? (
                            <form onSubmit={handleUpdateStaffAuthority} className="space-y-4">
                                <h3 className="text-sm font-bold text-primary">Editing: {editingStaff.firstName} {editingStaff.lastName}</h3>
                                <Input label="Mobile" value={editingStaff.phone} readOnly className="opacity-60 bg-surface" />
                                <Input label="Assigned Branch" value={editingStaff.branch || ''} onChange={e => setEditingStaff({ ...editingStaff, branch: e.target.value })} />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Access Level</label>
                                    <select
                                        className="w-full h-12 bg-white border border-border rounded-xl px-4 text-sm font-bold"
                                        value={editingStaff.accessLevel || 'standard'}
                                        onChange={e => setEditingStaff({ ...editingStaff, accessLevel: e.target.value })}
                                    >
                                        <option value="standard">Standard Field Staff</option>
                                        <option value="manager">Branch Manager</option>
                                        <option value="super">Super Staff</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <Button fullWidth variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
                                    <Button fullWidth type="submit" loading={loadingData}>Save Changes</Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-3">
                                {staffList.map(staff => (
                                    <Card key={staff.id} className="p-4 border-none shadow-subtle flex justify-between items-center bg-white">
                                        <div>
                                            <p className="text-sm font-bold text-primary">{staff.firstName} {staff.lastName}</p>
                                            <p className="text-[10px] text-text-muted uppercase tracking-widest">{staff.branch || 'No Branch'} • {staff.accessLevel || 'standard'}</p>
                                        </div>
                                        <button onClick={() => setEditingStaff(staff)} className="p-2 text-accent bg-accent/10 rounded-xl hover:bg-accent/20 transition-all">
                                            <Edit2 size={18} />
                                        </button>
                                    </Card>
                                ))}
                            </div>
                        )}
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
                            <Button fullWidth type="submit" loading={loadingData}>
                                <Save size={16} className="mr-2" /> Save Changes
                            </Button>

                            <div className="pt-8 border-t border-border/50 space-y-4">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Add New Administrator</h3>
                                {!showAddAdmin ? (
                                    <Button variant="outline" fullWidth onClick={async () => {
                                        setShowAddAdmin(true);
                                        const list = await getAllAdminsFromDB();
                                        setAdminsList(list);
                                    }}>
                                        <Plus size={18} className="mr-2" /> ADD ANOTHER ADMIN
                                    </Button>
                                ) : (
                                    <div className="p-4 bg-surface rounded-2xl border border-border/50 space-y-4">
                                        <Input
                                            label="New Admin ID"
                                            value={newAdmin.adminId}
                                            onChange={e => setNewAdmin({ ...newAdmin, adminId: e.target.value })}
                                        />
                                        <Input
                                            label="Password"
                                            type="password"
                                            value={newAdmin.password}
                                            onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                        />
                                        <Input
                                            label="Security PIN"
                                            type="password"
                                            maxLength={4}
                                            value={newAdmin.securityPin}
                                            onChange={e => setNewAdmin({ ...newAdmin, securityPin: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <Button fullWidth variant="outline" type="button" onClick={() => setShowAddAdmin(false)}>Cancel</Button>
                                            <Button fullWidth type="button" loading={loadingData} onClick={handleAddAdmin}>Create Admin</Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Admins list with Delete button — only shown to primary admin */}
                            {isPrimaryAdmin && (
                                <div className="pt-6 border-t border-border/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-danger uppercase tracking-[0.2em]">Manage Administrators</h3>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const list = await getAllAdminsFromDB();
                                                setAdminsList(list);
                                                showNotif(`Loaded ${list.length} admin(s)`);
                                            }}
                                            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>
                                    {adminsList.length === 0 ? (
                                        <p className="text-xs text-text-muted py-2">No admins found. Click ↻ Refresh to reload.</p>
                                    ) : (
                                        adminsList
                                            .sort((a, b) => a.docId === 'main_admin' ? -1 : 1) // Keep primary at top
                                            .map((a: any) => (
                                                <div key={a.docId} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/50">
                                                    <div>
                                                        <p className="text-sm font-bold text-primary">{a.adminId}</p>
                                                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", a.docId === 'main_admin' ? "text-accent" : "text-text-muted")}>
                                                            {a.docId === 'main_admin' ? "Primary Admin" : "Secondary Admin"}
                                                        </p>
                                                    </div>
                                                    {a.docId !== 'main_admin' && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                await deleteAdminFromDB(a.docId);
                                                                const updated = await getAllAdminsFromDB();
                                                                setAdminsList(updated);
                                                                showNotif('Admin deleted successfully');
                                                            }}
                                                            className="p-2 bg-danger/10 text-danger rounded-xl hover:bg-danger/20 transition-colors"
                                                            title="Delete Admin"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </form>
                    </motion.div>
                );

            case 'transactions':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                            <button onClick={() => setActiveView('overview')} className="text-primary">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-xl font-display font-bold text-primary">Download Transactions</h2>
                        </div>
                        <div className="space-y-6">
                            <p className="text-sm border-l-4 border-accent pl-3 text-text-secondary">
                                Select a custom date range to generate and download a full CSV report of all customer transactions.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Start Date"
                                    type="date"
                                    value={incentiveRange.start}
                                    onChange={(e) => setIncentiveRange({ ...incentiveRange, start: e.target.value })}
                                />
                                <Input
                                    label="End Date"
                                    type="date"
                                    value={incentiveRange.end}
                                    onChange={(e) => setIncentiveRange({ ...incentiveRange, end: e.target.value })}
                                />
                            </div>
                            <Button fullWidth onClick={handleFilterIncentives} loading={loadingData}>
                                Fetch Transactions
                            </Button>
                            {filteredIncentives.length > 0 && (
                                <>
                                    <p className="text-xs text-center text-success font-bold">
                                        ✓ {filteredIncentives.length} transactions found for selected period.
                                    </p>
                                    <Button
                                        fullWidth
                                        variant="outline"
                                        className="border-accent text-accent"
                                        onClick={handleDownloadCSV}
                                    >
                                        <FileText size={18} className="mr-2 inline" /> Download CSV Report
                                    </Button>
                                </>
                            )}
                            {filteredIncentives.length === 0 && !loadingData && incentiveRange.start && incentiveRange.end && (
                                <p className="text-sm text-center text-text-muted py-4">No transactions found for this period.</p>
                            )}
                        </div>
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
                            <Card onClick={() => setActiveView('transactions')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                                    <FileText size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Transactions</p>
                            </Card>
                            <Card onClick={() => setActiveView('incentives')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
                                    <Landmark size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Incentives & Reports</p>
                            </Card>
                            <Card onClick={() => { loadStaffList(); setActiveView('staff_mgmt'); }} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Shield size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Staff Authority</p>
                            </Card>
                            <Card onClick={() => setActiveView('staff')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface">
                                <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Staff Approvals</p>
                            </Card>
                            <Card onClick={() => setActiveView('customer_update')} className="p-4 flex flex-col items-center text-center space-y-2 border-none shadow-subtle cursor-pointer hover:bg-surface col-span-2">
                                <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center">
                                    <Smartphone size={24} />
                                </div>
                                <p className="text-xs font-bold text-primary">Customer Phone Update Tool</p>
                            </Card>
                        </div>

                        {isPrimaryAdmin && (
                            <div className="mt-8 pt-8 border-t border-border/50">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Account Security</h3>
                                <Button
                                    variant="outline"
                                    fullWidth
                                    className="border-primary/20 text-primary py-6"
                                    onClick={async () => {
                                        const list = await getAllAdminsFromDB();
                                        setAdminsList(list);
                                        setActiveView('settings');
                                    }}
                                >
                                    <Shield size={18} className="mr-2" /> MANAGE PASSWORD & PIN
                                </Button>
                            </div>
                        )}
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
