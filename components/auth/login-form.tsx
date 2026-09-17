"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "request" | "code";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";

  const [step, setStep] = React.useState<Step>("request");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Could not send the code.");
      setStep("code");
      setCode("");
      if (data.devCode) {
        toast.message(`Dev code: ${data.devCode}`, {
          description: "Shown because AUTH_DEV_ECHO=1 (dev only).",
        });
      } else {
        toast.success("If that email has access, a code is on its way.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(value: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCode("");
        return toast.error(data.error ?? "Incorrect code.");
      }
      toast.success("Signed in.");
      router.replace(from);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <BrandLogo size={44} />
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            Curtin ISAD 3000 Project Portal
          </h1>
          <p className="text-sm text-muted-foreground">Secure access to the project directory</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-surface/70 p-6 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium text-foreground">
          <Mail className="size-4 text-primary" />
          Sign in with an email code
        </div>

        {step === "request" ? (
          <form onSubmit={requestCode} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="otp-email">Email</Label>
              <Input
                id="otp-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading && <Loader2 className="animate-spin" />}
              Email me a code
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll send a 6-digit code that expires in 10 minutes.
            </p>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-digit code sent to <span className="text-foreground">{email}</span>.
            </p>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) verifyCode(v);
              }}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <div className="flex w-full items-center justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => { setStep("request"); setCode(""); }}
                disabled={loading}
              >
                Change email
              </button>
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => requestCode()}
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Access is restricted to approved accounts.
      </p>
    </div>
  );
}
