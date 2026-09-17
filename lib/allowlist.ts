const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Emails permitted to sign in. Set ALLOWED_EMAILS in .env.local as a
 * comma-separated list to restrict access. If it is empty, any valid
 * email is allowed (useful for local development only).
 */
export function getAllowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: string): boolean {
  const list = getAllowlist();
  if (list.length === 0) return true;
  return list.includes(email.toLowerCase());
}
