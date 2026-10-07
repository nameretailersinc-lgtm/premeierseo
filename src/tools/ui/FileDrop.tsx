"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useTool } from "./ToolContext";
import { formatBytes } from "./primitives";

/**
 * Keyboard-accessible file input: a visually hidden but focusable <input type="file">
 * inside a <label>. Drag-and-drop and clipboard paste are enhancements only.
 */
export function FileDrop({
  accept,
  multiple = false,
  onFiles,
  hint,
  compact = false,
  maxBytes = 100 * 1024 * 1024,
  label,
  pasteImages = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint: string;
  compact?: boolean;
  maxBytes?: number;
  label?: string;
  pasteImages?: boolean;
}) {
  const id = useId();
  const { used, announce, error } = useTool();
  const [drag, setDrag] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accepts = (f: File) => {
    const list = accept.split(",").map((s) => s.trim().toLowerCase());
    const name = f.name.toLowerCase();
    return list.some((a) =>
      a.endsWith("/*") ? f.type.startsWith(a.slice(0, -1)) : a.startsWith(".") ? name.endsWith(a) : f.type === a,
    );
  };

  const take = (list: FileList | File[] | null, method: string) => {
    if (!list || !list.length) return;
    const files = Array.from(list);
    const ok = files.filter((f) => accepts(f) && f.size <= maxBytes);
    const bad = files.filter((f) => !ok.includes(f));
    if (bad.length) {
      const tooBig = bad.filter((f) => f.size > maxBytes);
      setProblem(
        tooBig.length
          ? `${tooBig[0].name} is larger than ${formatBytes(maxBytes)}.`
          : `${bad[0].name} isn't a supported file type. Accepted: ${hint.split("·")[0].trim()}.`,
      );
      error(tooBig.length ? "FILE_TOO_LARGE" : "UNSUPPORTED_FORMAT", "input");
    } else setProblem(null);
    if (ok.length) {
      used(method);
      announce(`${ok.length} file${ok.length > 1 ? "s" : ""} added`);
      onFiles(multiple ? ok : ok.slice(0, 1));
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  useEffect(() => {
    if (!pasteImages) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) take(files, "clipboard_image");
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="peer sr-only"
        onChange={(e) => take(e.target.files, "file_picker")}
      />
      <label
        htmlFor={id}
        data-drag={drag || undefined}
        data-compact={compact || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          take(e.dataTransfer.files, "drop");
        }}
        className="dropzone peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
      >
        <span
          className={`grid shrink-0 place-items-center rounded-xl border transition-colors ${
            compact ? "size-9" : "size-12"
          } ${drag ? "border-accent bg-accent text-on-accent" : "border-accent-line bg-accent-subtle text-accent"}`}
        >
          <Icon name="upload" size={compact ? 18 : 22} />
        </span>
        <span className={compact ? "min-w-0 flex-1" : "grid gap-1"}>
          <span className={`block font-semibold text-ink ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
            {drag ? "Release to add" : compact ? (multiple ? "Add more files" : "Replace file") : `Drop ${multiple ? "files" : "a file"} here`}
          </span>
          {!compact && (
            <span className="block text-sm text-ink-2">
              <span className="hidden sm:inline">or pick them from your device — </span>everything is processed in your browser
            </span>
          )}
        </span>
        <span className={`btn btn-primary pointer-events-none ${compact ? "btn-sm" : "btn-lg mt-1"}`}>
          {label ?? (multiple ? "Choose files" : "Choose file")}
        </span>
        {!compact && <span className="text-xs leading-5 text-ink-3">{hint}</span>}
      </label>
      {problem && (
        <p role="alert" className="mt-2 flex gap-2 rounded-lg border border-danger-line bg-danger-subtle px-3 py-2 text-sm text-danger">
          <Icon name="circle-alert" size={16} className="mt-0.5 shrink-0" />
          {problem}
        </p>
      )}
    </div>
  );
}
