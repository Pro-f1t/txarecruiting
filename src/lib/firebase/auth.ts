import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./client";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutClient() {
  return auth.signOut();
}
