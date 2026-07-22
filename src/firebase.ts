import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCYrpQj3QfEw9n7H5dzAyIeAY-SFbj4qiE",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vasthara-8f0cf.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vasthara-8f0cf",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vasthara-8f0cf.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "909051366907",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:909051366907:web:c2d36286f7e05177ec8f5e",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RB2F15SFLP"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
