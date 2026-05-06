import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    const otpDoc = await db.collection('otps').doc(phone).get();

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

    if (data?.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as used
    await db.collection('otps').doc(phone).update({ used: true });

    return res.status(200).json({ message: 'OTP verified successfully' });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
