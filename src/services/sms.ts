/// <reference types="vite/client" />
/**
 * SMS Service for handling OTP via Vercel Backend Proxy
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Use relative path on Web to avoid Safari CORS/Preflight issues, and absolute URL on Capacitor
const API_BASE = Capacitor.isNativePlatform() 
  ? (import.meta.env.VITE_API_BASE_URL || 'https://www.mysanthosh.com')
  : '';

/**
 * Normalize phone to Indian format for Pay4SMS: digits only, with 91 prefix.
 * Accepts: 9876543210 | +919876543210 | 919876543210
 */
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/[^\d]/g, ''); // strip +, spaces, dashes
  if (digits.length === 10) return `91${digits}`; // add country code
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
};

export const sendOTP = async (phone: string): Promise<{ success: boolean; error?: string; otp?: string }> => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await setDoc(doc(db, 'otps', normalizedPhone), {
      otp,
      expiresAt,
      used: false
    });

    const TOKEN = '46d542f630d189a6717c2d4d5107a746';
    const SENDER_ID = 'SANIN';
    const TEMPLATE_ID = '1707163500034310127'; 
    const MESSAGE = `Dear Customer, OTP for mysanthosh app is ${otp} - Santhosh Lifestyle`;
    const pay4smsUrl = `https://pay4sms.in/sendsms/?token=${TOKEN}&sender=${SENDER_ID}&number=${normalizedPhone}&message=${encodeURIComponent(MESSAGE)}&templateid=${TEMPLATE_ID}&credit=2`;

    let ok = false;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({ url: pay4smsUrl });
      ok = response.status >= 200 && response.status < 300;
    } else {
      await fetch(pay4smsUrl, { mode: 'no-cors' });
      ok = true; // no-cors doesn't give us status, but throws on network error
    }

    if (ok) {
      return { success: true, otp };
    } else {
      return { success: false, error: 'Failed to send OTP. Please try again.' };
    }
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    return { success: false, error: 'Unable to connect to our servers. Please check your internet connection and try again.' };
  }
};

export const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const otpRef = doc(db, 'otps', normalizedPhone);
    const otpDoc = await getDoc(otpRef);

    if (!otpDoc.exists()) {
      return { success: false, error: 'Invalid OTP' };
    }

    const data = otpDoc.data();

    if (data?.used) {
      return { success: false, error: 'OTP already used' };
    }

    if (Date.now() > data?.expiresAt) {
      return { success: false, error: 'OTP expired' };
    }

    if (data?.otp !== String(otp)) {
      return { success: false, error: 'Invalid OTP' };
    }

    await updateDoc(otpRef, { used: true });

    return { success: true };
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    return { success: false, error: 'Unable to connect to our servers. Please check your internet connection and try again.' };
  }
};
export const updateUserViaAPI = async (userId: string, updates: any): Promise<{ success: boolean; error?: string }> => {
  try {
    let ok = false;
    let data;
    let status = 0;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: `${API_BASE}/api/update-user`,
        headers: { 'Content-Type': 'application/json' },
        data: { userId, updates }
      });
      data = response.data;
      status = response.status;
      ok = status >= 200 && status < 300;
    } else {
      const response = await fetch(`${API_BASE}/api/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      status = response.status;
      ok = response.ok;
      data = await response.json();
    }

    if (ok) {
      return { success: true };
    } else {
      return { success: false, error: data?.error || 'Failed to update user.' };
    }
  } catch (error: any) {
    console.error('Update User via API Error:', error);
    return { success: false, error: 'Unable to connect to our servers.' };
  }
};
