import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.santoshinstyle.vasthara',
  appName: 'My Santhosh App',
  webDir: 'dist',
  server: {
    allowNavigation: [
      "checkout.razorpay.com",
      "api.razorpay.com",
      "*.razorpay.com",
      "santosh-instyle-vastra.vercel.app"
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com", "phone"]
    }
  }
};

export default config;
