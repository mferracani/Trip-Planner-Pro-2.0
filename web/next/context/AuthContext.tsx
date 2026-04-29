"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { onAuthChange } from "@/lib/auth";
import { getFirebaseConfigError, getFirebaseDb } from "@/lib/firebase";
import { registerPushNotifications, listenForegroundMessages } from "@/lib/pushNotifications";

interface AuthContextValue {
  user: User | null;
  ownerUid: string | null;
  loading: boolean;
  configError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ownerUid: null,
  loading: true,
  configError: null,
});

async function resolveOwnerUid(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), "households", "main"));
    if (!snap.exists()) return uid;
    const members = snap.data().memberUids as string[];
    if (!members.includes(uid)) return uid;
    return members[0]; // owner is always index 0
  } catch {
    return uid; // fallback if fetch fails
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const envError = getFirebaseConfigError();
    if (envError) {
      setConfigError(envError);
      setLoading(false);
      return;
    }

    try {
      let unlistenForeground: (() => void) | undefined;

      const unsubscribe = onAuthChange(async (u) => {
        setUser(u);
        if (u) {
          const resolved = await resolveOwnerUid(u.uid);
          setOwnerUid(resolved);
          // Register push notifications (best-effort, never blocks login)
          registerPushNotifications(u.uid).catch(() => null);
          listenForegroundMessages().then((unsub) => { unlistenForeground = unsub; }).catch(() => null);
        } else {
          setOwnerUid(null);
          unlistenForeground?.();
        }
        setLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Firebase no esta configurado.");
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, ownerUid, loading, configError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
