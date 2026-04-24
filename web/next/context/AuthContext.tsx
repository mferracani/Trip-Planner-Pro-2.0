"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "@/lib/auth";
import { getFirebaseConfigError } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configError: string | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, configError: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
      const unsubscribe = onAuthChange((u) => {
        setUser(u);
        setLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Firebase no esta configurado.");
      setLoading(false);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, configError }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
