import nodemailer from "nodemailer";

const FROM =
  process.env.EMAIL_FROM ?? "Capstone Portal <no-reply@example.com>";

/**
 * Sends the one-time code by email over SMTP (Nodemailer).
 *
 * Works with any SMTP provider — Gmail, SendGrid, Brevo, Mailgun, etc. —
 * so NO custom domain is required (use Gmail with an App Password, or a
 * provider's "single sender" address). Configure via env vars:
 *
 *   SMTP_HOST   e.g. smtp.gmail.com  |  smtp.sendgrid.net  |  smtp-relay.brevo.com
 *   SMTP_PORT   587 (STARTTLS) or 465 (SSL). Default 587.
 *   SMTP_USER   your SMTP username (Gmail address, or "apikey" for SendGrid)
 *   SMTP_PASS   your SMTP password / app password / API key
 *   EMAIL_FROM  the From address (for Gmail, use your Gmail address)
 *
 * If SMTP is not configured, the code is logged to the server console so the
 * flow can be exercised without sending mail (dev only).
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  // Resend over HTTPS (works on Cloudflare Workers and Vercel; no SMTP needed).
  // Without a verified domain, Resend only delivers to your own account email
  // and EMAIL_FROM must be onboarding@resend.dev.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `Your Capstone Portal sign-in code: ${code}`,
        text: `Your one-time sign-in code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log(
      `\n[dev] SMTP not configured — one-time code for ${email}: ${code}\n`
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Your Capstone Portal sign-in code: ${code}`,
    text: `Your one-time sign-in code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px;color:#0f172a">Capstone Portal</h2>
        <p style="color:#475569;margin:0 0 20px">Use this one-time code to sign in. It expires in 10 minutes.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center">${code}</div>
        <p style="color:#94a3b8;font-size:13px;margin:20px 0 0">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
