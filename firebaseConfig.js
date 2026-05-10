import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Read Firebase configuration from environment variables when available.
// Keep the existing values as fallbacks for development convenience.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDTDv6iWDXwEnS4mEPVP6EtmCq452Ertr0",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "viewer-51105.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "viewer-51105",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "viewer-51105.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "119356793370",
  appId: process.env.FIREBASE_APP_ID || "1:119356793370:web:2ea66e1ffd88d1a025e7a3",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-EX8J3VHRG9",
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const firestoreDb = initializeFirestore(app, {
  localCache:
    Platform.OS === 'web'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
});

// Notes for maintainers:
// - Add environment variables (for example via Expo app.config or CI) to avoid
//   committing production credentials directly into source control.
// - For local development you can create a `.env` file and configure your bundler
//   or use `expo-constants` / `app.json` extra fields to inject values.
