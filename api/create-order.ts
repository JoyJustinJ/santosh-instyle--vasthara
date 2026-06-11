import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(401).json({ error: 'Razorpay credentials are not configured' });
  }

  const amount = Number(req.body?.amount);
  const currency = req.body?.currency || 'INR';
  const receipt = req.body?.receipt || `receipt_${Date.now()}`;
  const notes = req.body?.notes || {};

  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes,
    });

    return res.status(200).json({
      key_id: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay create order error:', error);

    if (error?.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed' });
    }

    return res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
}
