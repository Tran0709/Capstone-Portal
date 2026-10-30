"use client";

import * as React from "react";
import { FileUp, X } from "lucide-react";

/**
 * A clearly visible "choose file" button that replaces the browser's plain file input.
 * The real <input type="file"> stays in the form (hidden), so form submission is unchanged.
 */
export function FilePicker({
  name,
  accept,
  multiple = false,
  buttonLabel,
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  buttonLabel: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [names, setNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setNames([]);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setNames([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        name={name}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
      >
        <FileUp className="size-4" />
        {buttonLabel}
      </button>
      {names.length > 0 ? (
        <span className="inline-flex max-w-full items-center gap-2 rounded-md border bg-surface-2 px-2.5 py-1 text-sm">
          <span className="truncate">{names.length === 1 ? names[0] : `${names.length} files: ${names.join(", ")}`}</span>
          <button type="button" onClick={clear} aria-label="Remove selected files" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">No file chosen</span>
      )}
    </div>
  );
}
