import { SignJWT, jwtVerify } from "jose";
import { createHash, randomInt } from "crypto";

/**
 * Stateless one-time-code challenge.
 *
 * Instead of storing codes in server memory (which does not work across
 * serverless instances), we hash the code and pack it into a short-lived,
 * signed, httpOnly cookie. Verification reads the cookie back — so any
 * instance can validate it, and nothing needs a database.
 */

export const CHALLENGE_COOKIE = "otp_challenge";
const CODE_TTL_SECONDS = 10 * 60; // 10 minutes
export const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in .env.local"
    );
  }
  return new TextEncoder().encode(secret);
}

function hashCode(email: string, code: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${secret}`)
    .digest("hex");
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

type Challenge = { email: string; h: string; att: number; iat?: number };

export async function signChallenge(
  email: string,
  code: string,
  attempts = 0
): Promise<string> {
  return new SignJWT({ email: email.toLowerCase(), h: hashCode(email, code), att: attempts })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CODE_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Re-sign an existing challenge with an incremented attempt counter,
 *  preserving the original expiry (approximately) is not required; we keep
 *  the same hash and email and just bump attempts on a fresh short window. */
async function reSignChallenge(c: Challenge): Promise<string> {
  return new SignJWT({ email: c.email, h: c.h, att: c.att })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CODE_TTL_SECONDS}s`)
    .sign(getSecret());
}

async function readChallenge(token: string | undefined): Promise<Challenge | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.email === "string" && typeof payload.h === "string") {
      return {
        email: payload.email,
        h: payload.h,
        att: typeof payload.att === "number" ? payload.att : 0,
        iat: typeof payload.iat === "number" ? payload.iat : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns seconds remaining on the resend cooldown, or 0 if allowed. */
export async function cooldownRemaining(token: string | undefined): Promise<number> {
  const c = await readChallenge(token);
  if (!c?.iat) return 0;
  const elapsed = Math.floor(Date.now() / 1000) - c.iat;
  return elapsed >= RESEND_COOLDOWN_SECONDS ? 0 : RESEND_COOLDOWN_SECONDS - elapsed;
}

type VerifyResult =
  | { ok: true }
  | { ok: false; error: string; nextToken?: string; clear?: boolean };

export async function verifyChallenge(
  token: string | undefined,
  email: string,
  code: string
): Promise<VerifyResult> {
  const c = await readChallenge(token);
  if (!c) {
    return { ok: false, error: "No code was requested, or it expired. Request a new one.", clear: true };
  }
  if (c.email !== email.toLowerCase()) {
    return { ok: false, error: "Incorrect code." };
  }
  if (c.att >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code.", clear: true };
  }

  const match = c.h === hashCode(email, code);
  if (!match) {
    const nextToken = await reSignChallenge({ ...c, att: c.att + 1 });
    return { ok: false, error: "Incorrect code. Please try again.", nextToken };
  }
  return { ok: true };
}
