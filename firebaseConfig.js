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

const firebaseConfig = {
  apiKey: "AIzaSyDTDv6iWDXwEnS4mEPVP6EtmCq452Ertr0",
  authDomain: "viewer-51105.firebaseapp.com",
  projectId: "viewer-51105",
  storageBucket: "viewer-51105.firebasestorage.app",
  messagingSenderId: "119356793370",
  appId: "1:119356793370:web:2ea66e1ffd88d1a025e7a3",
  measurementId: "G-EX8J3VHRG9"
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
