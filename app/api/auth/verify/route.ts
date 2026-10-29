import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmail, isAllowed } from "@/lib/allowlist";
import { CHALLENGE_COOKIE, verifyChallenge } from "@/lib/otp-challenge";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { findUser, toSessionUser, createUser, isApprovedLecturer, promoteToLecturer, dbWritable } from "@/lib/users";

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
  let mode: "signin" | "signup" = "signin";
  let name = "";
  let wantedRole: "Lecturer" | "Student" = "Student";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim();
    code = String(body?.code ?? "").trim();
    mode = body?.mode === "signup" ? "signup" : "signin";
    name = String(body?.name ?? "").trim().slice(0, 80);
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
  const clear = (r: NextResponse) => {
    r.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
    return r;
  };

  let user;
  let lecturerDenied = false;
  if (mode === "signup") {
    if (known) {
      return clear(
        NextResponse.json(
          { error: "An account with this email already exists. Sign in instead." },
          { status: 409 }
        )
      );
    }
    const approved = wantedRole === "Lecturer" && (await isApprovedLecturer(email));
    lecturerDenied = wantedRole === "Lecturer" && !approved;
    const role = approved ? "Lecturer" : "Student";
    try {
      user = await createUser(email, name, role);
    } catch (err) {
      // Read-only host (no DATABASE_URL): sign the user in without persisting.
      console.warn("createUser skipped (read-only DB):", (err as Error)?.message);
      user = { email: email.toLowerCase(), name: name || email.split("@")[0], role };
    }
  } else {
    if (!known) {
      if (await dbWritable()) {
        return clear(
          NextResponse.json(
            { error: "No account found for that email. Create an account first." },
            { status: 404 }
          )
        );
      }
      // Read-only host: accounts cannot be stored, so a verified email signs in directly.
      const role = (await isApprovedLecturer(email)) ? "Lecturer" : "Student";
      user = { email: email.toLowerCase(), name: email.split("@")[0], role };
    } else {
      user = toSessionUser(known);
    }

    if (user.role !== "Lecturer" && (await isApprovedLecturer(email))) {
      try {
        await promoteToLecturer(email);
      } catch (err) {
        console.warn(
          "Lecturer role promotion skipped:",
          err instanceof Error ? err.message : err
        );
      }
      user = { ...user, role: "Lecturer" };
    }
  }

  const session = await createSessionToken({ email: user.email, name: user.name, role: user.role });
  const res = NextResponse.json({ ok: true, lecturerDenied });
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  res.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
