"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { useOnlineStatus } from "@/lib/hooks";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  const online = useOnlineStatus();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {!online && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-900/80 backdrop-blur-sm border-b border-yellow-700/50 px-4 py-2 text-center text-sm text-yellow-200">
            Sin conexión — mostrando datos guardados
          </div>
        )}
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
