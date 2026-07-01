import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { Card } from '../components/UI/Card';

const ProgramRules = () => {
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
                <h1 className="text-2xl font-display font-bold text-primary tracking-tight">{t('rules.title')}</h1>
            </div>

            <div className="space-y-6">
                <Card className="p-6 border-none shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                            <HelpCircle size={20} />
                        </div>
                        <h2 className="text-lg font-display font-bold text-primary">{t('rules.guidelines')}</h2>
                    </div>

                    <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                        <p className="font-bold text-primary">
                            {t('rules.intro')}
                        </p>

                        <p>
                            1. <span className="font-semibold text-primary">{t('rules.rule1_title')}</span> {t('rules.rule1_desc')}
                        </p>

                        <p>
                            2. <span className="font-semibold text-primary">{t('rules.rule2_title')}</span> {t('rules.rule2_desc')}
                        </p>

                        <p>
                            3. <span className="font-semibold text-primary">{t('rules.rule3_title')}</span> {t('rules.rule3_desc')}
                        </p>

                        <p>
                            4. <span className="font-semibold text-primary">{t('rules.rule4_title')}</span> {t('rules.rule4_desc')}
                        </p>

                        <p>
                            5. <span className="font-semibold text-primary">{t('rules.rule5_title')}</span> {t('rules.rule5_desc')}
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

export default ProgramRules;
