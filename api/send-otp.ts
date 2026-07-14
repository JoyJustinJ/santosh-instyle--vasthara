import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  // Service account should be stored in VERCEL_FIREBASE_SERVICE_ACCOUNT env var
  const serviceAccount = JSON.parse(process.env.VERCEL_FIREBASE_SERVICE_ACCOUNT || '{}');
  if (serviceAccount.project_id) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
}

const getDb = () => getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for APK deployments
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone: rawPhone } = req.body;

  if (!rawPhone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Normalize: strip non-digits, add 91 prefix for 10-digit Indian numbers
  const digits = rawPhone.replace(/[^\d]/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;

  // 1. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  try {
    // 2. Save OTP to Firestore
    const db = getDb();
    await db.collection('otps').doc(phone).set({
      otp,
      expiresAt,
      used: false
    });

    // 3. Send SMS via Pay4SMS
    const TOKEN = '46d542f630d189a6717c2d4d5107a746';
    const SENDER_ID = 'SANIN';
    const TEMPLATE_ID = '1707163500034310127'; 
    const MESSAGE = `Dear Customer, OTP for mysanthosh app is ${otp} - Santhosh Lifestyle`;

    // Pay4SMS API call
    const pay4smsUrl = `http://pay4sms.in/sendsms/?token=${TOKEN}&sender=${SENDER_ID}&number=${phone}&message=${encodeURIComponent(MESSAGE)}&templateid=${TEMPLATE_ID}&credit=2`;

    const response = await fetch(pay4smsUrl);
    const resultText = await response.text();

    // Pay4SMS often returns a simple string or ID, check if it looks successful
    if (response.ok) {
      return res.status(200).json({ message: 'OTP sent successfully', reference: resultText });
    } else {
      console.error('Pay4SMS Error:', resultText);
      return res.status(500).json({ error: 'Failed to send SMS' });
    }

  } catch (error) {
    console.error('OTP Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
