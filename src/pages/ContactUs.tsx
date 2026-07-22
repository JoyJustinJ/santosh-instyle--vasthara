import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Phone,
  MapPin,
  MessageSquare,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';

const WHATSAPP_NUMBER = '919751500007'; // +91 97515 00007

const ContactUs = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const branches = [
    { name: 'Santhosh Silks', address: 'Nethaji Road, Hosur, Tamil Nadu 635109', phone: '097515 00007' },
  ];

  const handleSendWhatsApp = () => {
    if (!message.trim()) {
      showNotification(t('contact.alert_empty_message'), 'error');
      return;
    }
    const text = subject.trim()
      ? `Subject: ${subject.trim()}\n\n${message.trim()}`
      : message.trim();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppQuickContact = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCall = () => {
    window.location.href = `tel:+${WHATSAPP_NUMBER}`;
  };

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
        <h1 className="text-2xl font-display font-bold text-primary tracking-tight">{t('contact.title')}</h1>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleCall}
          className="p-5 flex flex-col items-center text-center space-y-3 bg-accent-light/30 rounded-2xl border border-transparent hover:border-accent/30 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shadow-subtle">
            <Phone size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('contact.call_us')}</p>
            <p className="text-sm font-bold text-primary">97515 00007</p>
          </div>
        </button>

        <button
          onClick={handleWhatsAppQuickContact}
          className="p-5 flex flex-col items-center text-center space-y-3 bg-success-light/30 rounded-2xl border border-transparent hover:border-success/30 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-success text-white flex items-center justify-center shadow-subtle">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('contact.whatsapp')}</p>
            <p className="text-sm font-bold text-primary">+91 97515 00007</p>
          </div>
        </button>
      </div>

      {/* Support Form — sends via WhatsApp */}
      <Card className="p-6 space-y-6 border-none shadow-card">
        <div className="space-y-1">
          <h3 className="text-lg font-display font-bold text-primary">{t('contact.send_message')}</h3>
          <p className="text-xs text-text-secondary flex items-center gap-1">
            <MessageSquare size={12} className="text-success" />
            {t('contact.whatsapp_hint')}
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label={t('contact.subject')}
            placeholder={t('contact.subject_placeholder')}
            value={subject}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">
              {t('contact.message')}
            </label>
            <textarea
              className="w-full h-32 bg-surface border-2 border-border rounded-xl p-4 font-medium outline-none focus:border-accent resize-none"
              placeholder={t('contact.message_placeholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button fullWidth size="lg" onClick={handleSendWhatsApp}>
            <MessageSquare size={18} className="mr-2" />
            {t('contact.send_whatsapp')}
          </Button>
        </div>
      </Card>

      {/* Branches */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-2">{t('contact.our_branches')}</h3>
        <div className="space-y-4">
          {branches.map((branch, i) => (
            <Card key={i} className="p-5 border-none shadow-subtle space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-muted shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-sm">{branch.name}</h4>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{branch.address}</p>
                  </div>
                </div>
                <button
                  className="text-accent p-1"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.name + ' ' + branch.address)}`, '_blank')}
                >
                  <ExternalLink size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                  <Phone size={14} /> {branch.phone}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-success">
                  <Clock size={14} /> {t('contact.open_now')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center space-y-4 pt-8">
        <div className="flex justify-center pt-4">
          <a
            href="https://www.instagram.com/santhoshsilks/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-shine"
          >
            Instagram
          </a>
        </div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
          {t('contact.copyright')}
        </p>
      </div>
    </motion.div>
  );
};

export default ContactUs;
