"use client";

import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseMessaging, getFirebaseDb } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** Register the service worker, request permission and save the FCM token. */
export async function registerPushNotifications(uid: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  // Send Firebase config to service worker so it can initialize Firebase.
  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  swReg.active?.postMessage({
    type: "FIREBASE_CONFIG",
    config: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
  });

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return;

  const db = getFirebaseDb();
  await setDoc(doc(db, `users/${uid}/fcm_tokens/${token}`), {
    token,
    platform: "web",
    created_at: serverTimestamp(),
  }, { merge: true });
}

/** Remove the current FCM token from Firestore (call on sign-out). */
export async function unregisterPushNotifications(uid: string): Promise<void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, `users/${uid}/fcm_tokens/${token}`));
    }
  } catch { /* token may not exist */ }
}

/** Listen for foreground messages and show a browser notification. */
export async function listenForegroundMessages(): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "Trip Planner Pro";
    const body = payload.notification?.body ?? "";
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  });
}
