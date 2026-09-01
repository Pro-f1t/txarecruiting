import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./client";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser so a wrong / non-UT account can switch,
  // instead of Google silently reusing the last-used account.
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function signOutClient() {
  return auth.signOut();
}
