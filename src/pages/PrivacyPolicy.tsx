import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Shield } from 'lucide-react';
import { Card } from '../components/UI/Card';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">{t('privacy.title')}</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">{t('privacy.protection')}</h2>
                    </div>

                    <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-primary">
                            {t('privacy.intro')}
                        </p>

                        <p>
                            1. <span className="font-semibold text-primary">{t('privacy.policy1_title')}</span> {t('privacy.policy1_desc')}
                            <span className="block mt-1 font-medium">• {t('privacy.policy1_point1')}</span>
                            <span className="block font-medium">• {t('privacy.policy1_point2')}</span>
                            <span className="block font-medium">• {t('privacy.policy1_point3')}</span>
                        </p>

                        <p>
                            2. <span className="font-semibold text-primary">{t('privacy.policy2_title')}</span> {t('privacy.policy2_desc')}
                            <span className="block mt-1 font-medium">• {t('privacy.policy2_point1')}</span>
                            <span className="block font-medium">• {t('privacy.policy2_point2')}</span>
                            <span className="block font-medium">• {t('privacy.policy2_point3')}</span>
                            <span className="block font-medium">• {t('privacy.policy2_point4')}</span>
                        </p>

                        <p>
                            3. <span className="font-semibold text-primary">{t('privacy.policy3_title')}</span> {t('privacy.policy3_desc')}
                        </p>

                        <p>
                            4. <span className="block font-semibold text-primary">{t('privacy.policy4_title')}</span> {t('privacy.policy4_desc')}
                        </p>

                        <p>
                            5. <span className="font-semibold text-primary">{t('privacy.policy5_title')}</span> {t('privacy.policy5_desc')}
                        </p>
                    </div>
                </Card>

                {/* Compliance Disclaimer */}
                <Card className="p-6 border-2 border-accent/20 bg-accent/5 rounded-2xl space-y-3">
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest">{t('privacy.important_disclaimer')}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        {t('privacy.disclaimer_desc')}
                    </p>
                </Card>
            </div>
        </motion.div>
    );
};

export default PrivacyPolicy;
