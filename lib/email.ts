import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM =
  process.env.EMAIL_FROM ?? "Capstone Portal <tranphucdang0709@gmail.com>";

/**
 * Sends the one-time code by email via the Resend API (HTTPS, not SMTP).
 *
 * This replaces the old Nodemailer/SMTP approach because:
 *  - Raw SMTP sockets (ports 587/465) are blocked on many networks
 *  - Cloudflare Workers doesn't support raw TCP sockets at all, only HTTPS
 *
 * Configure via env vars:
 *   RESEND_API_KEY   your Resend API key (https://resend.com)
 *   EMAIL_FROM       the From address (must be a verified domain on Resend,
 *                     or use the default onboarding@resend.dev for testing)
 *
 * If RESEND_API_KEY is not configured, the code is logged to the server
 * console so the flow can be exercised without sending mail (dev only).
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `\n[dev] Email not configured — one-time code for ${email}: ${code}\n`
    );
    return;
  }

  const { error } = await resend.emails.send({
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

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}