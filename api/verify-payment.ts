import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.VERCEL_FIREBASE_SERVICE_ACCOUNT || '{}');
  if (serviceAccount.project_id) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
}
const db = getFirestore();

const setCorsHeaders = (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

const safeCompare = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return res.status(401).json({ error: 'Razorpay credentials are not configured' });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing Razorpay payment verification fields' });
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  if (!safeCompare(expectedSignature, razorpay_signature)) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const razorpay = new Razorpay({
      key_id: keyId!,
      key_secret: keySecret!,
    });

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const purpose = order.notes?.purpose as string;
    const userId = order.notes?.userId as string;

    const batch = db.batch();

    if (purpose === 'emi' || purpose === 'subscription') {
      const accountIds = (order.notes?.accountIds as string || '').split(',');
      let expectedTotalAmount = 0;
      const validAccounts = [];

      // First pass: validate all accounts and calculate expected total
      for (const accountId of accountIds) {
        if (!accountId) continue;
        const schemeRef = db.collection('user_schemes').doc(accountId);
        const schemeSnap = await schemeRef.get();
        if (schemeSnap.exists) {
          const current = schemeSnap.data() as any;
          expectedTotalAmount += (current.monthlyAmount || 0);
          validAccounts.push({ ref: schemeRef, current, accountId });
        }
      }

      // Verify the amount paid in Razorpay matches or exceeds expected amount
      // order.amount is in paise, so divide by 100
      if ((Number(order.amount) / 100) < expectedTotalAmount) {
        throw new Error(`Underpayment detected. Expected ${expectedTotalAmount}, paid ${Number(order.amount) / 100}`);
      }

      // Second pass: apply updates
      for (const { ref: schemeRef, current, accountId } of validAccounts) {
        const nextMonthsPaid = (current.monthsPaid || 0) + 1;
        const isCompleted = nextMonthsPaid >= (current.duration || 0);
        
        batch.update(schemeRef, {
          monthsPaid: nextMonthsPaid,
          totalPaid: (current.totalPaid || 0) + current.monthlyAmount,
          status: isCompleted ? 'completed' : (current.status || 'active'),
          completedAt: isCompleted ? new Date().toISOString() : current.completedAt,
        });

        const txRef = db.collection('transactions').doc();
        batch.set(txRef, {
          userId,
          schemeName: current.name || current.schemeName || 'Purchase Plan',
          accountId: accountId,
          amount: current.monthlyAmount,
          type: 'deposit',
          status: 'Success',
          method: 'Razorpay',
          paymentGateway: 'razorpay',
          referenceId: `${razorpay_payment_id}-${accountId}`,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          timestamp: FieldValue.serverTimestamp(),
        });
      }
    } else if (purpose === 'scheme_join' || purpose === 'subscription_join') {
      const planId = order.notes?.planId as string;
      const schemeName = order.notes?.schemeName as string;
      const schemeRef = db.collection('schemes').doc(planId);
      const schemeSnap = await schemeRef.get();
      
      if (schemeSnap.exists) {
        const scheme = schemeSnap.data() as any;

        // Verify the amount paid in Razorpay matches or exceeds the required monthly amount
        if ((Number(order.amount) / 100) < scheme.monthlyAmount) {
          throw new Error(`Underpayment detected for joining scheme. Expected ${scheme.monthlyAmount}, paid ${Number(order.amount) / 100}`);
        }

        const accountId = order.notes?.accountId as string || `ACC-2024-${Math.floor(1000 + Math.random() * 9000)}`;
        const userSchemeRef = db.collection('user_schemes').doc(accountId);
        
        batch.set(userSchemeRef, {
          ...scheme,
          userId,
          accountId,
          enrollmentDate: new Date().toISOString(),
          monthsPaid: 1,
          totalPaid: scheme.monthlyAmount,
          status: 'active',
          branch: 'Hosur',
          group: 'Batch-A'
        });

        const txRef = db.collection('transactions').doc();
        batch.set(txRef, {
          userId,
          schemeName: scheme.name,
          accountId,
          amount: scheme.monthlyAmount,
          type: 'deposit',
          status: 'Success',
          method: 'Razorpay',
          paymentGateway: 'razorpay',
          planId,
          referenceId: razorpay_payment_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          timestamp: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    return res.status(200).json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (error) {
    console.error('Error verifying payment or updating db:', error);
    return res.status(500).json({ error: 'Failed to process verified payment' });
  }
}
