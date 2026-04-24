"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, configError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !configError) router.replace("/auth");
  }, [user, loading, configError, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-[#A0A0A0] text-[15px]">Cargando...</div>
      </div>
    );
  }

  if (configError) {
    return <FirebaseSetupScreen error={configError} />;
  }

  if (!user) return null;

  return <>{children}</>;
}

function FirebaseSetupScreen({ error }: { error: string }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(circle at 12% 0%, rgba(113,211,166,0.12), transparent 34%), radial-gradient(circle at 90% 100%, rgba(168,145,232,0.11), transparent 30%), #090806",
      }}
    >
      <section className="w-full max-w-xl rounded-[24px] border border-[#332E25] bg-[#171512] p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#FFD16A] mb-3">
          Firebase pendiente
        </p>
        <h1 className="text-white text-[28px] md:text-[34px] font-bold tracking-tight mb-3">
          Faltan credenciales para abrir la app real.
        </h1>
        <p className="text-[#C6BDAE] text-[15px] leading-relaxed mb-5">
          El rediseño ya está aplicado, pero esta ruta necesita variables `NEXT_PUBLIC_FIREBASE_*`
          válidas. Mientras tanto podés revisar el mock visual sin Firebase.
        </p>
        <code className="block rounded-[14px] bg-[#090806] border border-[#252119] px-4 py-3 text-[#E98A9A] text-[12px] leading-relaxed mb-6">
          {error}
        </code>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dev"
            className="h-11 px-5 rounded-full bg-[#FFD16A] text-black font-bold text-[14px] flex items-center justify-center"
          >
            Ver mock visual
          </Link>
          <Link
            href="/auth"
            className="h-11 px-5 rounded-full bg-[#242018] text-[#C6BDAE] font-semibold text-[14px] flex items-center justify-center border border-[#332E25]"
          >
            Ir a login
          </Link>
        </div>
      </section>
    </main>
  );
}
