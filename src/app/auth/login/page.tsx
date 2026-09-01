"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signInWithGoogle, signOutClient } from "@/lib/firebase/auth";

// In-app browsers (Instagram, TikTok, Snapchat, Facebook…) partition storage,
// which breaks Google/Firebase sign-in. Detect them so we can tell the user to
// open the page in Safari/Chrome instead.
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|GSA\//i.test(ua);
}

function LoginForm() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithGoogle();
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await res.json();
      if (!res.ok) {
        await signOutClient();
        setError(body.error || "Sign-in failed.");
        return;
      }
      const staff = ["admin"].includes(body.role);
      const next = params.get("next");
      // Hard navigation (not router.push) so the just-set session cookie is sent
      // with the request — a client nav can race the cookie and bounce a brand-new
      // user back to sign-in until they refresh.
      window.location.assign(next || (staff ? "/admin" : "/dashboard"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="shell flex min-h-svh items-center justify-center py-20">
      <div className="card w-full max-w-md p-8">
        <p className="t-eyebrow">Texas Accelerate</p>
        <h1 className="t-card-title mt-3">Sign in</h1>
        <p className="t-body mt-2 text-muted">
          Access your dashboard or start an application.
        </p>

        {inApp && (
          <div
            className="mt-5 rounded-2xl p-4 text-[13px]"
            style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.35)" }}
          >
            <p className="font-semibold text-white">Open in your browser to sign in</p>
            <p className="mt-1 text-muted">
              You&apos;re in an in-app browser (Instagram/TikTok), where Google sign-in is blocked. Tap the{" "}
              <span className="text-white">{isIOS ? "••• menu at the top-right" : "⋮ menu at the top-right"}</span>{" "}
              and choose <span className="text-white">{isIOS ? "“Open in Safari”" : "“Open in Chrome” / “Open in browser”"}</span>, then sign in there.
            </p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="pill pill-ghost mt-6 w-full justify-center disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-[13px]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        <p className="mt-6 text-[13px] text-muted">
          Sign in with your Google account. New applicants are registered automatically.
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="shell flex min-h-svh items-center justify-center py-20">
          <div className="card w-full max-w-md p-8">
            <p className="t-eyebrow">Texas Accelerate</p>
            <h1 className="t-card-title mt-3">Sign in</h1>
            <p className="t-body mt-2 text-muted">Loading…</p>
          </div>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
