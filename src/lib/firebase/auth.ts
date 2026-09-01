import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./client";

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const REDIRECT_FALLBACK_CODES = [
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
];

/**
 * Start Google sign-in. On desktop we use a popup; on mobile (where popups are
 * routinely blocked) we redirect. A popup failure also falls back to redirect.
 * Returns the credential for the popup path, or null when a redirect was started
 * (the result is then picked up by completeRedirectSignIn on page load).
 */
export async function signInWithGoogle(): Promise<UserCredential | null> {
  const provider = googleProvider();

  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "";
    if (REDIRECT_FALLBACK_CODES.includes(code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

/** Resolve a pending redirect sign-in after the browser returns to the app. */
export async function completeRedirectSignIn(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}

export async function signOutClient() {
  return auth.signOut();
}
