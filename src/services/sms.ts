/// <reference types="vite/client" />
/**
 * SMS Service for handling OTP via Vercel Backend Proxy
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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

    const data = await response.json();
    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to send OTP' };
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
};

export const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Invalid OTP' };
    }
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return { success: false, error: 'Network error occurred' };
  }
};
