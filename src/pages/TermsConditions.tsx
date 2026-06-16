import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import { Card } from '../components/UI/Card';

const TermsConditions = () => {
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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Terms & Conditions</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">Program Agreement</h2>
                    </div>

                    <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-primary">
                            Please read these Terms & Conditions carefully before enrolling in the Vasthara Membership Program. By registering and paying subscription fees, you agree to be bound by these terms.
                        </p>

                        <p>
                            1. <span className="font-semibold text-primary">Membership Program Overview:</span> Customers subscribe to our membership program by paying a monthly membership fee. Members become eligible for promotional gifts, rewards, and product discounts based on program terms. Payments are membership charges and not investments, deposits, savings products, or financial instruments.
                        </p>

                        <p>
                            2. <span className="font-semibold text-primary">Eligibility & Registration:</span> Enrollment is open to individuals aged 18 and above. Members must provide accurate registration details (First Name, Last Name, Mobile Number, and Address). Only one active membership subscription is permitted per user profile.
                        </p>

                        <p>
                            3. <span className="font-semibold text-primary">Subscription Fees & Payment:</span> Subscription fees are payable monthly on or before the due date. The subscription amount and duration depend on the tier chosen at checkout. Payment collection is carried out securely via integrated payment gateways.
                        </p>

                        <p>
                            4. <span className="font-semibold text-primary">Redemption & Rewards:</span> Accumulation of subscription terms unlocks rewards or promotional gifts as detailed in the Program Rules. Benefits must be redeemed in-store for physical apparel/clothing products. No cash substitution or conversion is permitted.
                        </p>

                        <p>
                            5. <span className="font-semibold text-primary">Cancellation & Default:</span> If a member fails to pay consecutive monthly subscription dues, the membership status may be suspended. Defaulted accounts do not accrue additional rewards, and any stored loyalty balance will remain subject to the validation and settlement policies of the store.
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

export default TermsConditions;
