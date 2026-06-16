import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { Card } from '../components/UI/Card';

const RefundPolicy = () => {
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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Refund Policy</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <RefreshCw size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">Subscription Refunds</h2>
                    </div>

                    <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-primary">
                            Please review our refund and redemption terms before confirming any subscription fee payments.
                        </p>

                        <p>
                            1. <span className="font-semibold text-primary">Non-Refundable Subscription Fees:</span> Payments made towards the Vasthara Membership Program represent subscription charges for promotional benefits, store loyalty access, and rewards. These fees are non-refundable in cash once paid.
                        </p>

                        <p>
                            2. <span className="font-semibold text-primary">Redemption for Store Products:</span> In lieu of cash refunds, all accumulated subscription value can be redeemed towards purchasing clothing, textiles, and apparel products from our physical Santosh Instyle store.
                        </p>

                        <p>
                            3. <span className="font-semibold text-primary">Promotional Gifts & Bonuses:</span> Any complimentary gift, reward points, or promotional benefits allocated during the membership lifecycle cannot be exchanged, returned, or converted to cash or credit.
                        </p>

                        <p>
                            4. <span className="font-semibold text-primary">Redemption Process:</span> To redeem your subscription rewards, visit our physical branch in Hosur. Present your active member ID/profile from the Vasthara mobile application at the billing counter to apply your benefits.
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

export default RefundPolicy;
