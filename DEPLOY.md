# Deploying the Capstone Portal to Vercel

This app is a standard Next.js app and deploys to Vercel with no extra config.
The OTP auth is stateless (a signed cookie), so **no database is required**.

## 1. Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free Hobby plan is fine)
- For the email-code login: any SMTP provider (Gmail with an App Password is
  free and needs no domain)
  With Gmail SMTP, codes deliver to any address — no custom domain needed.

## 2. Push this folder to GitHub

From inside this folder:

```bash
git init
git add .
git commit -m "Capstone portal"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env.local` and `node_modules` are gitignored and will **not** be pushed — that
is intentional; secrets go in Vercel's dashboard (step 4).

## 3. Import the project in Vercel

1. Vercel dashboard → **Add New… → Project**.
2. Import your GitHub repo. If this app is in a subfolder of the repo, set
   **Root Directory** to that subfolder (e.g. `portal-app`).
3. Framework preset: **Next.js** (auto-detected). Leave build settings default.
4. Don't deploy yet — add the environment variables first (next step).

## 4. Set environment variables in Vercel

Project → **Settings → Environment Variables**. **Only `SESSION_SECRET` is
required** — with it, the password login works immediately. The SMTP variables
are only needed if you also want the email-code login. Add these for the
**Production** (and Preview) environment:

| Name             | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `SESSION_SECRET` | A long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SMTP_HOST`      | e.g. `smtp.gmail.com`                                        |
| `SMTP_PORT`      | `587`                                                        |
| `SMTP_USER`      | your Gmail address (or `apikey` for SendGrid)               |
| `SMTP_PASS`      | your Gmail **App Password** (or provider API key)          |
| `EMAIL_FROM`     | `Capstone Portal <youraddress@gmail.com>`                   |
| `ALLOWED_EMAILS` | Comma-separated emails allowed to sign in (optional)        |

**Do NOT set `AUTH_DEV_ECHO`** in production — it is ignored there anyway
(it only works when `NODE_ENV !== 'production'`), but leave it out entirely.

## 5. Deploy

Click **Deploy**. When it finishes, open the Vercel URL — you'll be redirected
to `/login`. Enter an allowed email, get the code by email, and sign in.

Every future `git push` to `main` redeploys automatically.

## 6. After deploy — checklist

- [ ] `SESSION_SECRET` is set (login fails with a 500 if missing).
- [ ] SMTP variables are set correctly (Gmail: App Password, not your normal
      password) if you want the email-code login.
- [ ] `ALLOWED_EMAILS` contains the accounts that should have access.
- [ ] Visiting the site while signed out redirects to `/login`.

## Deploying elsewhere (Node host: Render, Railway, a VPS, Docker)

The app also runs as a normal Node server:

```bash
npm install
npm run build
npm start          # serves on PORT (default 3000)
```

Set the same environment variables in that host's config. Nothing else is
needed — the auth has no external dependencies.

## Database (SQLite / libSQL)

Users and projects live in a **SQLite** database (via libSQL). Locally this is a
file (`data/portal.db`, seeded from the bundled JSON). On Vercel the filesystem
is read-only, so to persist **uploads** you point the app at a free hosted SQLite:

1. Create a free database at **https://turso.tech** (Turso is hosted libSQL/SQLite).
   Get its **Database URL** (`libsql://...`) and an **auth token**.
2. Vercel → your project → **Settings → Environment Variables** (Production):
   - `DATABASE_URL` = the `libsql://...` URL
   - `DATABASE_AUTH_TOKEN` = the token
3. **Redeploy.** On first use the app creates the tables and seeds them from the
   bundled data automatically.

Without those vars, the site still **reads** projects on Vercel from the bundled
`data/portal.db`, but uploads can't be saved (read-only filesystem).

### Uploading projects

Sign in with an **Admin** account, click **Upload** in the header, choose a module
tag, and upload a `.json` array or `.csv`. Rows merge by `id` (or "Replace all").
The directory and the live count update automatically. Only accounts with the
**Admin** role (in the `users` table) can upload; `/api/admin/upload` rejects
everyone else.

### Re-seeding / local database

The file DB `data/portal.db` ships seeded. To rebuild it locally, delete the file
and start the app — it re-creates and seeds on first run.

## Changing the logo

The header/login logo is `public/logo.png` (an original placeholder ships by
default). Replace that file with your own logo image and redeploy — no code
change needed.
