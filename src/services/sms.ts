/// <reference types="vite/client" />
/**
 * SMS Service for handling OTP via Vercel Backend Proxy
 */

import { Capacitor } from '@capacitor/core';

// Use relative path on Web to avoid Safari CORS/Preflight issues, and absolute URL on Capacitor
const API_BASE = Capacitor.isNativePlatform() 
  ? (import.meta.env.VITE_API_BASE_URL || 'https://santosh-instyle-vasthara.vercel.app')
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

export const sendOTP = async (phone: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedPhone = normalizePhone(phone);
    const response = await fetch(`${API_BASE}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizedPhone }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      if (response.status >= 500) return { success: false, error: 'Our server is experiencing issues. Please try again later.' };
      if (response.status === 404) return { success: false, error: 'The OTP service is currently unavailable.' };
      return { success: false, error: 'We received an unexpected response from the server. Please try again.' };
    }

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: data?.error || 'Failed to send OTP. Please try again.' };
    }
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    if (/(failed to fetch|networkerror|load failed)/i.test(error.message || '')) {
      return { success: false, error: 'Unable to connect to our servers. Please check your internet connection and try again.' };
    }
    return { success: false, error: `Oops! We encountered an unexpected error (${error.message}). Please try again later.` };
  }
};

export const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      if (response.status >= 500) return { success: false, error: 'Our server is experiencing issues. Please try again later.' };
      if (response.status === 404) return { success: false, error: 'The OTP verification service is currently unavailable.' };
      return { success: false, error: 'We received an unexpected response from the server. Please try again.' };
    }

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: data?.error || 'Invalid OTP entered. Please try again.' };
    }
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    if (/(failed to fetch|networkerror|load failed)/i.test(error.message || '')) {
      return { success: false, error: 'Unable to connect to our servers. Please check your internet connection and try again.' };
    }
    return { success: false, error: `Oops! We encountered an unexpected error (${error.message}). Please try again later.` };
  }
};
