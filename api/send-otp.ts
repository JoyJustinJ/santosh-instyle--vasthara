import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { checkRateLimit, getClientIp, buildRateLimitResponse } from './rate-limiter.js';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "vasthara-8f0cf",
};

// Initialize Firebase client SDK (for OTP writes)
if (!getClientApps().length) {
  initClientApp(firebaseConfig);
}

// Initialize Firebase Admin SDK (for rate limiter Firestore writes)
if (!getApps().length) {
  try {
    let serviceAccount;
    if (process.env.VERCEL_FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.VERCEL_FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    }
    if (serviceAccount?.project_id) {
      initializeApp({ credential: cert(serviceAccount) });
    }
  } catch (err) {
    console.error('Firebase Admin init error in send-otp:', err);
  }
}

const getDb = () => getClientFirestore();

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

  // ── Rate Limiting ────────────────────────────────────────────────────────
  // 1. Per-phone: max 3 OTP sends per 10 minutes (prevents OTP bombing)
  const phoneLimit = await checkRateLimit({
    action: 'send-otp:phone',
    identifier: phone,
    maxRequests: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
  });

  if (!phoneLimit.allowed) {
    const body = buildRateLimitResponse(phoneLimit);
    res.setHeader('Retry-After', body.retryAfter.toString());
    res.setHeader('X-RateLimit-Limit', '3');
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json(body);
  }

  // 2. Per-IP: max 10 OTP requests per hour (prevents distributed abuse)
  const clientIp = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  const ipLimit = await checkRateLimit({
    action: 'send-otp:ip',
    identifier: clientIp,
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!ipLimit.allowed) {
    const body = buildRateLimitResponse(ipLimit);
    res.setHeader('Retry-After', body.retryAfter.toString());
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json(body);
  }

  // Set rate limit headers on successful requests
  res.setHeader('X-RateLimit-Limit', '3');
  res.setHeader('X-RateLimit-Remaining', phoneLimit.remaining.toString());
  // ────────────────────────────────────────────────────────────────────────

  // 1. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  try {
    // 2. Save OTP to Firestore using Admin SDK (bypasses security rules)
    const adminDb = getAdminFirestore();
    await adminDb.collection('otps').doc(phone).set({
      otp,
      expiresAt,
      used: false,
    });

    // 3. Send SMS via Pay4SMS
    const TOKEN = '46d542f630d189a6717c2d4d5107a746';
    const SENDER_ID = 'SANIN';
    const TEMPLATE_ID = '1707163500034310127';
    const MESSAGE = `Dear Customer, OTP for mysanthosh app is ${otp} - Santhosh Lifestyle`;

    // Pay4SMS API call
    const pay4smsUrl = `https://pay4sms.in/sendsms/?token=${TOKEN}&sender=${SENDER_ID}&number=${phone}&message=${encodeURIComponent(MESSAGE)}&templateid=${TEMPLATE_ID}&credit=2`;

    const response = await fetch(pay4smsUrl);
    const resultText = await response.text();

    // Pay4SMS often returns a simple string or ID, check if it looks successful
    if (response.ok) {
      return res.status(200).json({ message: 'OTP sent successfully', reference: resultText });
    } else {
      console.error('Pay4SMS Error:', resultText);
      return res.status(500).json({ error: 'Failed to send SMS' });
    }

  } catch (error: any) {
    console.error('OTP Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message, stack: error.stack });
  }
}
