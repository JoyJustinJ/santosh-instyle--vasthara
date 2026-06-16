import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { Card } from '../components/UI/Card';

const ProgramRules = () => {
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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Program Rules</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <HelpCircle size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">Rules & Guidelines</h2>
                    </div>

                    <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-primary">
                            Welcome to the Vasthara Loyalty Membership Program. Please review the program rules below:
                        </p>

                        <p>
                            1. <span className="font-semibold text-primary">Membership Tiers:</span> We offer several membership tiers (e.g. ₹500, ₹1000, ₹2000, or ₹5000 per month). You can select a tier when subscribing.
                        </p>

                        <p>
                            2. <span className="font-semibold text-primary">Subscription Term:</span> Subscriptions operate on a defined term (typically 11 months). Members pay their subscription fee monthly to keep their membership active.
                        </p>

                        <p>
                            3. <span className="font-semibold text-primary">Promotional Reward / Gift:</span> Upon successfully completing the subscription term, members become eligible for promotional gifts, purchase bonuses, or special discounts equivalent to one month's subscription value or specific reward gifts, redeemable exclusively for products at Santosh Instyle.
                        </p>

                        <p>
                            4. <span className="font-semibold text-primary">Redemption Code:</span> Rewards must be redeemed at the physical store in Hosur within 30 days of program completion. No cash refunds or money returns are provided.
                        </p>

                        <p>
                            5. <span className="font-semibold text-primary">Late Payments:</span> Membership subscription dues should be paid on or before the due date. A delay of more than 15 days may postpone the completion milestone.
                        </p>
                    </div>
                </Card>

                {/* Compliance Disclaimer */}
                <Card className="p-6 border-2 border-accent/20 bg-accent/5 rounded-2xl space-y-3">
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest">Important Disclaimers</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        We do not accept deposits, investments, or public funds. The Vasthara Program is solely a promotional customer loyalty membership and subscription service. This is not a chit fund, recurring deposit, lending, EMI financing, or investment scheme. Payments made are subscription fees towards loyalty program membership and are redeemable only for products and promotional benefits as detailed in our program rules.
                    </p>
                </Card>
            </div>
        </motion.div>
    );
};

export default ProgramRules;
