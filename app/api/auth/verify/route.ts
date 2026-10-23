import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmail, isAllowed } from "@/lib/allowlist";
import { CHALLENGE_COOKIE, verifyChallenge } from "@/lib/otp-challenge";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { findUser, toSessionUser } from "@/lib/users";

export const runtime = "nodejs";

const challengeCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 10 * 60,
};

export async function POST(req: Request) {
  let email = "";
  let code = "";
  let wantedRole: "Lecturer" | "Student" = "Student";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim();
    code = String(body?.code ?? "").trim();
    wantedRole = body?.role === "Lecturer" ? "Lecturer" : "Student";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter your email and the 6-digit code." },
      { status: 400 }
    );
  }

  if (!isAllowed(email)) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  const result = await verifyChallenge(token, email, code);

  if (!result.ok) {
    const res = NextResponse.json(
      { error: result.error ?? "Incorrect code." },
      { status: 401 }
    );
    if (result.clear) {
      res.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
    } else if (result.nextToken) {
      res.cookies.set(CHALLENGE_COOKIE, result.nextToken, challengeCookieOptions);
    }
    return res;
  }

  const known = await findUser(email);

  // Lecturer sign-in is only for accounts registered as lecturers in data/users.json.
  if (wantedRole === "Lecturer" && known?.role !== "Lecturer") {
    const denied = NextResponse.json(
      {
        error:
          "This email is not registered as a lecturer. Sign in as a student, or ask the portal owner to add you as a lecturer.",
      },
      { status: 403 }
    );
    denied.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
    return denied;
  }

  // The role chosen on the login screen decides what this session can do.
  const base = known ? toSessionUser(known) : { email };
  const session = await createSessionToken({ ...base, role: wantedRole });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  res.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
