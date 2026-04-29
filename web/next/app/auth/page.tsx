"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signInWithApple } from "@/lib/auth";

export default function AuthPage() {
  const { user, loading, configError } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleSignIn() {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithApple();
      router.replace("/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión";
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (configError) return <FirebaseSetupScreen error={configError} />;

  return (
    <main className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-8">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="text-5xl mb-4">✈️</div>
        <h1 className="text-[34px] font-bold text-white leading-tight">Trip Planner Pro 2</h1>
        <p className="text-[#A0A0A0] text-[17px] mt-2">Organizá tus viajes sin tipear.</p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-col gap-3 mb-12 w-full max-w-sm">
        <FeatureRow emoji="💬" text="Pegá el email de tu booking" />
        <FeatureRow emoji="📄" text="O subí el PDF del boarding pass" />
        <FeatureRow emoji="✨" text="La IA arma tu viaje automáticamente" />
      </div>

      {/* Sign in button */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex items-center justify-center gap-3 w-full bg-white text-black rounded-[12px] py-[14px] px-6 text-[17px] font-semibold transition-opacity disabled:opacity-60 hover:opacity-90"
        >
          <AppleLogo />
          {signingIn ? "Iniciando sesión..." : "Continuar con Apple"}
        </button>

        {error && (
          <p className="text-[#FF453A] text-[13px] text-center">{error}</p>
        )}

        <p className="text-[#707070] text-[11px] text-center">
          Al continuar, aceptás nuestra{" "}
          <span className="text-[#0A84FF]">Política de privacidad</span>
        </p>
      </div>
    </main>
  );
}

function FirebaseSetupScreen({ error }: { error: string }) {
  return (
    <main className="min-h-screen bg-[#090806] flex items-center justify-center px-8">
      <section className="w-full max-w-md rounded-[24px] bg-[#171512] border border-[#332E25] p-6">
        <p className="text-[#FFD16A] text-[11px] font-bold uppercase tracking-[0.18em] mb-3">
          Firebase pendiente
        </p>
        <h1 className="text-white text-[26px] font-bold leading-tight mb-3">
          Configurá Firebase para iniciar sesión.
        </h1>
        <p className="text-[#C6BDAE] text-[14px] leading-relaxed mb-4">
          Para ver el rediseño sin credenciales, usá el mock visual.
        </p>
        <code className="block text-[#E98A9A] text-[12px] bg-[#090806] border border-[#252119] rounded-[12px] p-3 mb-5">
          {error}
        </code>
        <a
          href="/dev"
          className="h-11 rounded-full bg-[#FFD16A] text-black font-bold text-[14px] flex items-center justify-center"
        >
          Ver mock visual
        </a>
      </section>
    </main>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-[12px] px-4 py-3">
      <span className="text-xl">{emoji}</span>
      <span className="text-[15px] text-[#A0A0A0]">{text}</span>
    </div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 814 1000" className="w-5 h-5 fill-black" xmlns="http://www.w3.org/2000/svg">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.6-165.9-109.2c-86.6-103.3-156.1-268.4-156.1-424.5 0-215.7 140.8-329.2 279.5-329.2 73.5 0 134.9 48.4 181 48.4 43.8 0 112.9-51.4 200.9-51.4 32.4-.1 127.9 2.6 198.1 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <div className="text-[#A0A0A0] text-[15px]">Cargando...</div>
    </div>
  );
}
