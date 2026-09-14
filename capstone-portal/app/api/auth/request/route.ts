import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmail, isAllowed } from "@/lib/allowlist";
import {
  CHALLENGE_COOKIE,
  cooldownRemaining,
  generateCode,
  signChallenge,
} from "@/lib/otp-challenge";
import { sendOtpEmail } from "@/lib/email";

export const runtime = "nodejs";

const challengeCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 10 * 60,
};

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    // Surface the real reason on-screen (e.g. missing SESSION_SECRET) instead
    // of an opaque 500, so configuration problems are obvious.
    console.error(err);
    const detail = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: `Server error: ${detail}` }, { status: 500 });
  }
}

async function handle(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // Same response whether or not the email is allowed — no account enumeration.
  if (!isAllowed(email)) {
    return NextResponse.json({ ok: true });
  }

  // Resend cooldown, read from the existing challenge cookie.
  const existing = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  const wait = await cooldownRemaining(existing);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Please wait ${wait}s before requesting another code.` },
      { status: 429 }
    );
  }

  const code = generateCode();
  const token = await signChallenge(email, code);

  // DEV ONLY: return the code and skip email when AUTH_DEV_ECHO=1. Never in prod.
  const devEcho =
    process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_ECHO === "1";

  if (!devEcho) {
    try {
      await sendOtpEmail(email, code);
    } catch (err) {
      console.error(err);
      // Surface the underlying Resend reason so misconfiguration is obvious.
      // This is an operational error message, not a secret.
      const detail = err instanceof Error ? err.message : "Unknown email error";
      return NextResponse.json(
        { error: `Email could not be sent. ${detail}` },
        { status: 502 }
      );
    }
  } else {
    console.log(`[dev] one-time code for ${email}: ${code}`);
  }

  const res = NextResponse.json(devEcho ? { ok: true, devCode: code } : { ok: true });
  res.cookies.set(CHALLENGE_COOKIE, token, challengeCookieOptions);
  return res;
}
