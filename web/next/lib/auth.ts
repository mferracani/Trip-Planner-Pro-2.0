"use client";

import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getAppleProvider, getGoogleProvider } from "./firebase";

export async function signInWithApple() {
  const result = await signInWithPopup(getFirebaseAuth(), getAppleProvider());
  return result.user;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(getFirebaseAuth());
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
