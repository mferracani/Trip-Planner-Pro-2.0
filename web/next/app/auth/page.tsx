"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signInWithApple, signInWithGoogle } from "@/lib/auth";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleSignIn(provider: "apple" | "google") {
    setSigningIn(provider);
    setError(null);
    try {
      if (provider === "apple") await signInWithApple();
      else await signInWithGoogle();
      router.replace("/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión";
      setError(msg);
    } finally {
      setSigningIn(null);
    }
  }

  if (loading) return <LoadingScreen />;

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
          onClick={() => handleSignIn("apple")}
          disabled={signingIn !== null}
          className="flex items-center justify-center gap-3 w-full bg-white text-black rounded-[12px] py-[14px] px-6 text-[17px] font-semibold transition-opacity disabled:opacity-60 hover:opacity-90"
        >
          <AppleLogo />
          {signingIn === "apple" ? "Iniciando sesión..." : "Continuar con Apple"}
        </button>

        <button
          onClick={() => handleSignIn("google")}
          disabled={signingIn !== null}
          className="flex items-center justify-center gap-3 w-full bg-[#1A1A1A] border border-[#333] text-white rounded-[12px] py-[14px] px-6 text-[17px] font-semibold transition-opacity disabled:opacity-60 hover:opacity-80"
        >
          <GoogleLogo />
          {signingIn === "google" ? "Iniciando sesión..." : "Continuar con Google"}
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

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
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
