"use client";

import * as React from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type MaintenanceNoticeProps = {
  email: string;
  notice: {
    id: string;
    title: string;
    message: string;
  };
};

export function MaintenanceNotice({ email, notice }: MaintenanceNoticeProps) {
  const [dismissedLocally, setDismissedLocally] = React.useState(false);
  const storageKey = `portal-maintenance-notice:${encodeURIComponent(email)}:${notice.id}`;

  const isDismissedInStorage = React.useSyncExternalStore(
    React.useCallback((callback) => {
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    }, []),
    React.useCallback(() => {
      try {
        return window.localStorage.getItem(storageKey) === "dismissed";
      } catch (error) {
        console.error("Could not read maintenance notice status:", error);
        return false;
      }
    }, [storageKey]),
    () => false
  );
  const open = !isDismissedInStorage && !dismissedLocally;

  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "dismissed");
    } catch (error) {
      console.error("Could not save maintenance notice status:", error);
    }
    setDismissedLocally(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <section
        aria-labelledby="maintenance-notice-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border bg-surface p-6 shadow-2xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Bell aria-hidden="true" className="size-5" />
            </span>
            <h2
              className="text-lg font-semibold"
              id="maintenance-notice-title"
            >
              {notice.title}
            </h2>
          </div>
          <button
            aria-label="Dismiss maintenance notice"
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            onClick={dismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {notice.message}
        </p>
        <div className="mt-6 flex justify-end">
          <Button autoFocus onClick={dismiss}>
            Got it
          </Button>
        </div>
      </section>
    </div>
  );
}
