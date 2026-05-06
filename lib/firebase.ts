import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let initialized = false;

function ensureInit() {
  if (initialized) return;
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);

  if (useEmulator && typeof window !== 'undefined') {
    // ブラウザでのみ接続(SSRは未使用 / 多重接続の警告を回避)
    type EmulatorFlag = { __emulatorConnected?: boolean };
    const w = window as unknown as EmulatorFlag;
    if (!w.__emulatorConnected) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
      connectStorageEmulator(storageInstance, '127.0.0.1', 9199);
      w.__emulatorConnected = true;
    }
  }
  initialized = true;
}

export function firebaseApp() { ensureInit(); return app; }
export function auth() { ensureInit(); return authInstance; }
export function db() { ensureInit(); return dbInstance; }
export function storage() { ensureInit(); return storageInstance; }
