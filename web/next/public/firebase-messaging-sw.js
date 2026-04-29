// Firebase Messaging Service Worker
// Handles background push notifications when the app is not in focus.
// Firebase SDK is loaded via importScripts — do NOT import from node_modules here.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Config is injected at runtime via a message from the main thread.
// We cache it here so background handlers can use it.
let firebaseConfig = null;

self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    if (firebaseConfig) return; // already initialized
    firebaseConfig = event.data.config;
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? "Trip Planner Pro";
      const body = payload.notification?.body ?? "";
      self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    });
  }
});
