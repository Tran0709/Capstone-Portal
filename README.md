# Capstone Project Portal

A secured Next.js portal for a directory of 2,500 capstone projects — with search,
category filters, and project detail views — behind a **modern dark dashboard UI**.

Built with Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui.

## Security / sign-in

Two server-enforced sign-in methods (choose either):

1. **Password** (`/api/auth/login`) — email + password, verified against
   **scrypt-hashed** passwords stored in `data/users.json`. No plaintext
   passwords are stored. This path needs no external services, so it always works.
2. **Email one-time code** (`/api/auth/request` + `/api/auth/verify`) — a 6-digit
   code emailed via **SMTP** (Nodemailer — works with Gmail, SendGrid, Brevo,
   etc.; no custom domain required). The code is hashed into a
   short-lived signed **httpOnly** cookie (stateless — works on serverless), with
   10-minute expiry, single use, max 5 attempts, and a resend cooldown.

On success the server issues a signed httpOnly session cookie (JWT via `jose`).
`proxy.ts` redirects any unauthenticated request to `/login`.

### Demo accounts (password login)

| Email | Password | Role |
| --- | --- | --- |
| `admin@portal.com` | `admin123` | Admin |
| `student@portal.com` | `student123` | Student |
| `mentor@portal.com` | `mentor123` | Mentor |
| `tranphucdang0709@gmail.com` | `capstone2026` | Admin |

These demo passwords are documented for grading convenience; only their scrypt
hashes are stored. To add or change users, edit `data/users.json` — generate a
salt+hash with:

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(JSON.stringify({salt:s,hash:c.scryptSync('YOUR_PASSWORD',s,64).toString('hex')}))"
```

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `SESSION_SECRET` — required. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` — only
  needed for the email-code login. For a free, no-domain option use **Gmail**
  with an App Password (see `.env.example` for exact values). Delivers OTP to
  any address — no custom domain needed.
- `ALLOWED_EMAILS` — optional comma-separated allowlist for the email-code path.

## Run

```bash
npm run dev
```

Open http://localhost:3000 → redirected to `/login`. Use a demo account above.

To test the email-code flow without sending mail, set `AUTH_DEV_ECHO=1` in
`.env.local` (dev only) — the code is returned to the page instead of emailed.

## Deployment

See **DEPLOY.md**. Deploys to Vercel with no extra config; **only `SESSION_SECRET`
is required** for password login to work (the email-code method additionally needs
SMTP variables).

## Project layout

```
app/
  page.tsx                    protected dark dashboard (server component)
  login/page.tsx              dark login (Password / Email-code tabs)
  api/auth/login/route.ts     password sign-in
  api/auth/request|verify     email one-time-code sign-in
  api/auth/logout/route.ts    clear session
lib/
  users.ts + data/users.json  scrypt-hashed user store
  auth.ts                     JWT session
  otp-challenge.ts            stateless OTP challenge cookie
  email.ts / allowlist.ts     SMTP (Nodemailer) + email validation
components/
  auth/login-form.tsx         tabbed login UI
  directory/                  dark project directory (search/filter/modal)
  ui/                         shadcn components
proxy.ts                      route protection
public/projects.json          project data
```
