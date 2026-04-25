import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    MapPin,
    Phone,
    Clock,
    ExternalLink
} from 'lucide-react';
import { Card } from '../components/UI/Card';

const OurStores = () => {
    const navigate = useNavigate();

    const branches = [
        { name: 'Santosh Instyle', address: 'Nethaji Road, Hosur, Tamil Nadu 635109', phone: '098400 77747' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="page-transition-wrapper p-6 pb-24 space-y-8"
        >
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Our Stores</h1>
            </div>

            <div className="space-y-6">
                <p className="text-sm text-text-secondary leading-relaxed px-2">
                    Visit any of our physical stores to explore our exclusive collections and speak with our experts.
                </p>

                <div className="grid gap-6">
                    {branches.map((branch, i) => (
                        <Card key={i} className="p-6 border-none shadow-card overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors duration-300">
                                    <MapPin size={24} />
                                </div>
                                <button
                                    className="text-text-muted hover:text-accent transition-colors"
                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.name + ' ' + branch.address)}`, '_blank')}
                                >
                                    <ExternalLink size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-display font-bold text-primary">{branch.name}</h3>
                                    <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                                        {branch.address}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-border flex flex-col gap-3">
                                    <div className="flex items-center gap-3 text-sm font-bold text-primary">
                                        <Phone size={16} className="text-accent" />
                                        {branch.phone}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-bold text-success">
                                        <Clock size={16} />
                                        Open: 10:00 AM - 8:30 PM
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Map Placeholder or Visual */}
            <Card
                className="p-4 bg-surface-alt border-none h-48 flex items-center justify-center relative overflow-hidden cursor-pointer group"
                onClick={() => window.open('https://www.google.com/maps/search/?api=1&query=Santhosh+Instyle+Nethaji+Road+Hosur+Tamil+Nadu+635109', '_blank')}
            >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 text-center">
                    <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">View on Google Maps</p>
                </div>
            </Card>
        </motion.div>
    );
};

export default OurStores;
