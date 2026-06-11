<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Santosh Instyle - Vasthara App

A mobile-first financial scheme management app.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Android APK Build

This project is configured with Capacitor for Android.

1. Install Android Studio and the Android SDK.
2. Open Android Studio once and install the recommended SDK/build tools.
3. Build and sync the Capacitor Android app:
   `npm run cap:sync`
4. Build a debug APK:
   `npm run android:debug`

The debug APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

For Play Store upload, create a release signing config in Android Studio and run:
`npm run android:release`

## Razorpay Payments

Vasthara uses Razorpay Standard Checkout for installment payments.

Required environment variables:

```bash
RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=razorpay_key_secret
VITE_RAZORPAY_KEY_ID=rzp_test_or_live_key_id
```

For Android/Capacitor builds, also set `VITE_API_BASE_URL` to the deployed backend URL so the APK can call the API routes:

```bash
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
```

Test keys start with `rzp_test_`. For production payments, replace them with live keys from the Razorpay dashboard, which start with `rzp_live_`.
