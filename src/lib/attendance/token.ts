import crypto from "crypto";

// Rotating check-in tokens. Derived, not stored - any instance can verify one.
//   bucket = floor(now / 10000)
//   token  = `${bucket}.${HMAC(secret, `${eventId}:${bucket}`).slice(0,16)}`
// Verification accepts the current bucket ±1, so a code is valid ~10–20s.

const BUCKET_MS = 10000;
const TOKEN_SIG_LEN = 16;
const PASS_SIG_LEN = 24;
const PASS_TTL_MS = 10 * 60 * 1000; // 10 min, scoped to one event

function secret(): string {
  return process.env.CHECKIN_SECRET || "";
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function currentBucket(now = Date.now()): number {
  return Math.floor(now / BUCKET_MS);
}

export function mintToken(eventId: string, bucket: number): string {
  return `${bucket}.${hmac(`${eventId}:${bucket}`).slice(0, TOKEN_SIG_LEN)}`;
}

/** A batch of tokens covering the next `count` buckets, plus the server clock. */
export function mintTokenBatch(eventId: string, count: number, now = Date.now()) {
  const b0 = currentBucket(now);
  const tokens = Array.from({ length: count }, (_, i) => mintToken(eventId, b0 + i));
  return { now, bucketMs: BUCKET_MS, tokens };
}

export function verifyToken(eventId: string, token: string, now = Date.now()): boolean {
  if (!secret()) return false;
  const [bucketStr, sig] = String(token).split(".");
  const bucket = Number(bucketStr);
  if (!Number.isInteger(bucket) || !sig) return false;
  if (Math.abs(bucket - currentBucket(now)) > 1) return false; // ±1 bucket
  return safeEqual(sig, mintToken(eventId, bucket).split(".")[1]);
}

// A pass proves presence was verified in the 10s window; it survives the login
// detour so the token doesn't have to. Format: `${eventId}.${exp}.${sig}`.
export function mintPass(eventId: string, now = Date.now()): string {
  const exp = now + PASS_TTL_MS;
  return `${eventId}.${exp}.${hmac(`pass:${eventId}.${exp}`).slice(0, PASS_SIG_LEN)}`;
}

export function verifyPass(eventId: string, pass: string | undefined, now = Date.now()): boolean {
  if (!secret() || !pass) return false;
  const parts = String(pass).split(".");
  if (parts.length !== 3) return false;
  const [ev, expStr, sig] = parts;
  const exp = Number(expStr);
  if (ev !== eventId || !Number.isFinite(exp) || now > exp) return false;
  return safeEqual(sig, hmac(`pass:${ev}.${exp}`).slice(0, PASS_SIG_LEN));
}

export const PASS_COOKIE = "att_pass";
export const PASS_TTL_SECONDS = Math.floor(PASS_TTL_MS / 1000);

/** Gate for the display-only surfaces (AV laptop, no session). */
export function displayKeyOk(k: string | null | undefined): boolean {
  const key = process.env.DISPLAY_KEY || "";
  return !!key && !!k && safeEqual(String(k), key);
}
