// src/config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase configuration for project: xone-ed61d
 * Project Number: 163852944967
 * Package: com.anonymous.attendanceapp
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCefQDAEKilTMVWeBRFy8qruUzr-vG95Ho',
  authDomain: 'xone-ed61d.firebaseapp.com',
  projectId: 'xone-ed61d',
  storageBucket: 'xone-ed61d.firebasestorage.app',
  messagingSenderId: '163852944967',
  appId: '1:163852944967:web:9f2ba3fd1a04378e74d362',
};

// Prevent duplicate initialization during React Native hot-reload cycles
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
