/// <reference types="vite/client" />
import type { User } from '../context/AuthContext';

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

export type RazorpayPaymentResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  amount: number;
  currency: string;
  receipt: string;
};

type RazorpayCheckoutInput = {
  amount: number;
  receipt: string;
  description: string;
  user?: User | null;
  notes?: Record<string, string | number | boolean | undefined>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const getApiErrorMessage = (error: unknown) => {
  if (error instanceof TypeError && /(failed to fetch|networkerror|load failed)/i.test(error.message)) {
    return 'Payment server is unreachable. Please check your internet connection and try again.';
  }

  return error instanceof Error ? error.message : 'Payment failed. Please try again.';
};

export const payWithRazorpay = async ({
  amount,
  receipt,
  description,
  user,
  notes = {},
}: RazorpayCheckoutInput): Promise<RazorpayPaymentResult> => {
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout could not load. Please try again.');
  }

  const amountInPaise = Math.round(amount * 100);
  if (amountInPaise < 100) {
    throw new Error('Minimum payment amount is ₹1.');
  }

  try {
    const orderResponse = await fetch(`${API_BASE_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes,
      }),
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(order?.error || 'Unable to create payment order');
    }

    const razorpayKeyId = RAZORPAY_KEY_ID || order.key_id;
    if (!razorpayKeyId) {
      throw new Error('Razorpay key is not configured');
    }

    return await new Promise<RazorpayPaymentResult>((resolve, reject) => {
      let settled = false;

      const razorpay = new window.Razorpay!({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Vasthara',
        description,
        order_id: order.order_id,
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          contact: user?.phone || '',
          email: user?.email || '',
        },
        notes,
        theme: {
          color: '#0F2247',
        },
        modal: {
          ondismiss: () => {
            if (!settled) {
              settled = true;
              reject(new Error('Payment cancelled.'));
            }
          },
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verification = await verifyResponse.json();
            if (!verifyResponse.ok || !verification.success) {
              throw new Error(verification?.error || 'Payment verification failed');
            }

            settled = true;
            resolve({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amount,
              currency: order.currency,
              receipt,
            });
          } catch (error) {
            settled = true;
            reject(error);
          }
        },
      });

      razorpay.on('payment.failed', (response: any) => {
        if (!settled) {
          settled = true;
          reject(new Error(response?.error?.description || 'Payment failed. Please try again.'));
        }
      });

      razorpay.open();
    });
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
};
