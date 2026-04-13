import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                    >
                        <div className="p-8 space-y-6">
                            <div className="flex justify-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${type === 'danger' ? 'bg-danger/10 text-danger' :
                                        type === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                                    }`}>
                                    <AlertTriangle size={32} />
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-display font-bold text-primary">{title}</h3>
                                <p className="text-sm text-text-secondary leading-relaxed font-medium">
                                    {message}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button
                                    fullWidth
                                    onClick={() => {
                                        onConfirm();
                                        onCancel();
                                    }}
                                    className={type === 'danger' ? 'bg-danger text-white' : ''}
                                >
                                    {confirmText}
                                </Button>
                                <button
                                    onClick={onCancel}
                                    className="w-full py-3 text-sm font-bold text-text-muted hover:text-primary transition-colors"
                                >
                                    {cancelText}
                                </button>
                            </div>
                        </div>

                        {/* Top close button */}
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 p-2 text-text-muted hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
