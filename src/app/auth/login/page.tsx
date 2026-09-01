"use client";

import type { UserCredential } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { signInWithGoogle, completeRedirectSignIn, signOutClient } from "@/lib/firebase/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exchange a Google credential for a server session cookie, then route on.
  const establishSession = useCallback(
    async (cred: UserCredential) => {
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
      router.push(next || (staff ? "/admin" : "/dashboard"));
    },
    [params, router]
  );

  // On load, complete any pending mobile redirect sign-in.
  useEffect(() => {
    let active = true;
    completeRedirectSignIn()
      .then((cred) => {
        if (!active || !cred) return;
        setLoading(true); // returning from a mobile redirect — finish the sign-in
        establishSession(cred);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      });
    return () => {
      active = false;
    };
  }, [establishSession]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithGoogle();
      if (cred) {
        await establishSession(cred); // popup path
      }
      // redirect path (cred === null): the browser navigates away; leave loading on
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
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
          Sign in with your UT Google account (@utexas.edu). New applicants are registered
          automatically.
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
