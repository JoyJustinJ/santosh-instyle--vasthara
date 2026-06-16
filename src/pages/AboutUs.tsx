import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { Card } from '../components/UI/Card';

const AboutUs = () => {
    const navigate = useNavigate();

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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">About Us</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <Info size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">Who We Are</h2>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        Santosh Instyle is a premier fashion and retail destination located in Hosur, Tamil Nadu. We specialize in offering a curated collection of high-quality clothing, textiles, and lifestyle products designed to meet the diverse tastes of our customers.
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        Our brand is dedicated to delivering excellence in product design, customer support, and value. We constantly innovate to provide a modern, seamless shopping experience through our physical stores and our digital membership platform, Vasthara.
                    </p>
                </Card>

                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <HelpCircle size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">Vasthara Membership Program</h2>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        The Vasthara app is a digital portal for our exclusive customer loyalty and membership program. By subscribing to our monthly membership tiers, members gain access to special discounts, customized reward points, and seasonal promotional gifts.
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        This program is designed solely to enhance customer loyalty, engagement, and satisfaction. It allows members to easily track their subscription status, redeem rewards, and stay informed about our latest collections and store offerings.
                    </p>
                </Card>

                {/* Compliance Disclaimer */}
                <Card className="p-6 border-2 border-accent/20 bg-accent/5 rounded-2xl space-y-3">
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest">Important Disclaimer</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        We do not accept deposits, investments, or public funds. The Vasthara Program is solely a promotional customer loyalty membership and subscription service. This is not a chit fund, recurring deposit, lending, EMI financing, or investment scheme. Payments made are subscription fees towards loyalty program membership and are redeemable only for products and promotional benefits as detailed in our program rules.
                    </p>
                </Card>
            </div>
        </motion.div>
    );
};

export default AboutUs;
