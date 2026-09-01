import type { NextConfig } from "next";

// Proxy Firebase Auth's handler through our own origin so signInWithRedirect /
// signInWithPopup work on mobile. Browsers block the cross-domain storage that
// the default authDomain (*.firebaseapp.com) relies on; serving /__/auth/** from
// our domain (with authDomain set to our host) makes it same-origin.
// See: https://firebase.google.com/docs/auth/web/redirect-best-practices
const FIREBASE_AUTH_HOST = "txarecruiting.firebaseapp.com";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `https://${FIREBASE_AUTH_HOST}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${FIREBASE_AUTH_HOST}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
