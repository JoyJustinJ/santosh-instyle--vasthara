import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { checkRateLimit, buildRateLimitResponse } from './rate-limiter.js';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.VERCEL_FIREBASE_SERVICE_ACCOUNT || '{}');
  if (serviceAccount.project_id) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
}

const db = getFirestore();

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

  const { userId, updates } = req.body;

  if (!userId || !updates) {
    return res.status(400).json({ error: 'userId and updates are required' });
  }

  // ── Rate Limiting ────────────────────────────────────────────────────────
  // Per-user: max 20 profile updates per hour
  const userLimit = await checkRateLimit({
    action: 'update-user:user',
    identifier: userId,
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!userLimit.allowed) {
    const body = buildRateLimitResponse(userLimit);
    res.setHeader('Retry-After', body.retryAfter.toString());
    res.setHeader('X-RateLimit-Limit', '20');
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json(body);
  }

  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', userLimit.remaining.toString());
  // ────────────────────────────────────────────────────────────────────────

  try {
    // Update the user document directly bypassing client security rules
    await db.collection('users').doc(userId).set(updates, { merge: true });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Update User Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
