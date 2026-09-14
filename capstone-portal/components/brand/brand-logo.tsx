"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Shows the portal logo from /logo.png (drop your own image there).
 * If the file is missing, it falls back to a shield icon so the header
 * never breaks. `size` is the box size in pixels.
 */
export function BrandLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          borderRadius: size * 0.28,
          background: "color-mix(in oklch, var(--primary) 15%, transparent)",
          color: "var(--primary)",
          boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--primary) 25%, transparent)",
        }}
      >
        <ShieldCheck size={Math.round(size * 0.6)} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Portal logo"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 6 }}
    />
  );
}
