"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GraduationCap, Loader2, Mail, School, UserPlus } from "lucide-react";

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
type Mode = "signin" | "signup";
type Role = "Student" | "Lecturer";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";

  const [mode, setMode] = React.useState<Mode>("signin");
  const [step, setStep] = React.useState<Step>("request");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<Role>("Student");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setStep("request");
    setCode("");
  }

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
        body: JSON.stringify({
          email,
          code: value,
          mode,
          ...(mode === "signup" ? { name, role } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCode("");
        if (res.status === 404 || res.status === 409) {
          // No account yet / account already exists: send them to the right tab.
          setStep("request");
          switchMode(res.status === 404 ? "signup" : "signin");
        }
        return toast.error(data.error ?? "Incorrect code.");
      }
      if (data.lecturerDenied) {
        toast.message("Account created as a student", {
          description:
            "Lecturer access needs approval. Ask the portal owner to add your email as a lecturer.",
        });
      } else {
        toast.success(mode === "signup" ? "Account created. Welcome!" : "Signed in.");
      }
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
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border bg-surface-2 p-1 text-sm" role="tablist">
          {([
            ["signin", "Sign in", Mail],
            ["signup", "Create account", UserPlus],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              disabled={loading}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                mode === value ? "bg-surface font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {step === "request" ? (
          <form onSubmit={requestCode} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="signup-name">
                  Name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="signup-name"
                  autoComplete="name"
                  placeholder="Your name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
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
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label>
                  Account type <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                  {([
                    ["Student", GraduationCap],
                    ["Lecturer", School],
                  ] as const).map(([value, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={role === value}
                      onClick={() => setRole(value)}
                      disabled={loading}
                      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        role === value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-surface-2"
                      }`}
                    >
                      <Icon className="size-4" />
                      {value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {role === "Lecturer"
                    ? "Lecturers can add, edit and delete lessons. Lecturer access is only granted to approved emails; otherwise your account is created as a student."
                    : "Students can browse the directory and watch and download lessons."}
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading && <Loader2 className="animate-spin" />}
              {mode === "signup" ? "Email me a code to create my account" : "Email me a code"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll send a 6-digit code that expires in 10 minutes.
            </p>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <p className="text-center text-sm text-muted-foreground">
              Enter the 6-digit code sent to <span className="text-foreground">{email}</span>
              {mode === "signup" ? " to create your account." : "."}
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
        {mode === "signin" ? "New here? Choose “Create account” above." : "Already registered? Choose “Sign in” above."}
      </p>
    </div>
  );
}
