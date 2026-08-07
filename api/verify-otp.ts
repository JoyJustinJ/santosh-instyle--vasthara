import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { checkRateLimit, buildRateLimitResponse } from './rate-limiter.js';

// Initialize Firebase Admin SDK (for rate limiter and OTPs)
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
    console.error('Firebase Admin init error in verify-otp:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getAdminFirestore();
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

  const { phone: rawPhone, otp } = req.body;

  if (!rawPhone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  // Normalize phone to match the key used when OTP was stored
  const digits = rawPhone.replace(/[^\d]/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;

  // ── Rate Limiting ────────────────────────────────────────────────────────
  // Per-phone: max 5 OTP verification attempts per 10 minutes
  // Prevents brute-force guessing of 6-digit OTPs
  const phoneLimit = await checkRateLimit({
    action: 'verify-otp:phone',
    identifier: phone,
    maxRequests: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
  });

  if (!phoneLimit.allowed) {
    const body = buildRateLimitResponse(phoneLimit);
    res.setHeader('Retry-After', body.retryAfter.toString());
    res.setHeader('X-RateLimit-Limit', '5');
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json(body);
  }

  // Set rate limit headers on successful requests
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', phoneLimit.remaining.toString());
  // ────────────────────────────────────────────────────────────────────────

  try {
    const otpRef = db.collection('otps').doc(phone);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const data = otpDoc.data();

    if (data?.used) {
      return res.status(400).json({ error: 'OTP already used' });
    }

    if (Date.now() > data?.expiresAt) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (data?.otp !== String(otp)) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as used
    await otpRef.update({ used: true });

    return res.status(200).json({ message: 'OTP verified successfully' });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

