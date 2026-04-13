import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBIWE1x1nk_7x65dWCgFL6L7gupLL9VBnA",
    authDomain: "web-app-8cfa3.firebaseapp.com",
    projectId: "web-app-8cfa3",
    storageBucket: "web-app-8cfa3.firebasestorage.app",
    messagingSenderId: "526064185396",
    appId: "1:526064185396:web:3159692e72c7b0447b1a61",
    measurementId: "G-YX102SH303"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
