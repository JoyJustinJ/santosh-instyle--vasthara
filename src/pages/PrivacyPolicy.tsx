import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';
import { Card } from '../components/UI/Card';

const PrivacyPolicy = () => {
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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Privacy Policy</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">Data Protection</h2>
                    </div>

                    <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-primary">
                            We value your privacy and are committed to safeguarding your personal data. This Privacy Policy details how we collect, process, and protect your information.
                        </p>

                        <p>
                            1. <span className="font-semibold text-primary">Information We Collect:</span> We collect personal information you provide when registering, including:
                            <span className="block mt-1 font-medium">• Contact details (Name, Address, Mobile number, Email)</span>
                            <span className="block font-medium">• Transaction data (Payments, receipts, and subscriptions)</span>
                            <span className="block font-medium">• Device data (IP address, operating system, app statistics)</span>
                        </p>

                        <p>
                            2. <span className="font-semibold text-primary">How We Use Information:</span> Your data is used strictly to:
                            <span className="block mt-1 font-medium">• Authenticate your identity and secure access</span>
                            <span className="block font-medium">• Process monthly membership subscription dues</span>
                            <span className="block font-medium">• Coordinate and award promotional gifts and rewards</span>
                            <span className="block font-medium">• Deliver customer support and respond to queries</span>
                        </p>

                        <p>
                            3. <span className="font-semibold text-primary">Data Security:</span> We implement state-of-the-art security measures, including database rules, end-to-end HTTPS transmission, and industry-standard payment processors (Razorpay) to encrypt and secure transaction coordinates.
                        </p>

                        <p>
                            4. <span className="block font-semibold text-primary">Cookies & Tracking:</span> The app does not utilize intrusive third-party trackers. Standard session variables and localized secure key/value storage are used exclusively for keeping you logged in.
                        </p>

                        <p>
                            5. <span className="font-semibold text-primary">Third-Party Disclosures:</span> We do not sell, trade, or transfer your personal data to outside parties. This excludes trusted third parties assisting us in operating the platform or executing payments (such as payment gateways), so long as those parties agree to keep this information strictly confidential.
                        </p>
                    </div>
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

export default PrivacyPolicy;
