import { initializeApp, getApps } from "firebase/app";
import { getAuth, OAuthProvider, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredFirebaseEnv = [
  ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
] as const;

export function getFirebaseConfigError() {
  const missing = requiredFirebaseEnv
    .filter(([, value]) => !value || value.includes("your_") || value.includes("xxx"))
    .map(([key]) => key);

  if (missing.length === 0) return null;
  return `Faltan variables Firebase validas: ${missing.join(", ")}`;
}

export function isFirebaseConfigured() {
  return getFirebaseConfigError() === null;
}

// Lazy singleton — only runs on client, never during SSR/static build
function getFirebaseApp() {
  const configError = getFirebaseConfigError();
  if (configError) {
    throw new Error(configError);
  }
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

export function getAppleProvider() {
  return new OAuthProvider("apple.com");
}

export function getGoogleProvider() {
  return new GoogleAuthProvider();
}
