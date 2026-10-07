"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "./Icon";
import { track } from "@/lib/analytics";

const REASONS = [
  ["wrong-result", "Wrong result"],
  ["error", "Error message"],
  ["did-not-load", "Didn't load"],
  ["hard-to-use", "Hard to use"],
  ["other", "Something else"],
] as const;

const TOPICS = [
  ["question", "Question about a tool"],
  ["tool-request", "Suggest a new tool"],
  ["correction", "Correction to a page"],
  ["other", "Something else"],
] as const;

/**
 * Contact and "Report a problem" form. Posts to /api/report, which forwards to the owner's
 * webhook when configured. Never collects file content. Falls back to the email address.
 */
export function ReportForm({ kind, tools, email }: { kind: "problem" | "contact"; tools?: { id: string; name: string }[]; email: string }) {
  const id = useId();
  const [tool, setTool] = useState("");
  const [reason, setReason] = useState<string>("wrong-result");
  const [topic, setTopic] = useState<string>("question");
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from query after mount (static page)
    if (p.get("tool")) setTool(p.get("tool")!);
    if (p.get("topic")) setTopic(p.get("topic")!);
  }, []);

  if (state === "sent") {
    return (
      <div role="status" className="flex gap-3 rounded-lg border border-success-line bg-success-subtle p-4">
        <Icon name="circle-check" size={22} className="shrink-0 text-success" />
        <div>
          <p className="font-semibold">Thanks, your message has been sent.</p>
          <p className="text-sm text-ink-2">{from ? "We'll reply to the address you gave." : "You didn't leave an email address, so we can't reply, but we read every report."}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (kind === "contact" && !message.trim()) {
          setState("error");
          setErrMsg("Please write a message.");
          return;
        }
        setState("sending");
        try {
          const r = await fetch("/api/report", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind, tool, reason, topic, message, email: from, website: (e.currentTarget.elements.namedItem("website") as HTMLInputElement)?.value }),
          });
          const d = await r.json();
          if (!r.ok || d.error) throw new Error(d.error?.message ?? "Sending failed.");
          setState("sent");
          if (kind === "problem") track("problem_reported", { tool_id: tool || "none", reason });
        } catch (err) {
          setState("error");
          setErrMsg(err instanceof Error ? err.message : "Sending failed.");
        }
      }}
    >
      {kind === "problem" && tools && (
        <div>
          <label htmlFor={`${id}-tool`} className="field-label">
            Which tool?
          </label>
          <select id={`${id}-tool`} className="select" value={tool} onChange={(e) => setTool(e.target.value)}>
            <option value="">Not about a specific tool</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {kind === "problem" ? (
        <fieldset>
          <legend className="field-label">What went wrong?</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {REASONS.map(([v, l]) => (
              <label key={v} className="inline-flex items-center gap-2 py-1.5">
                <input type="radio" name="reason" value={v} checked={reason === v} onChange={() => setReason(v)} className="size-[1.125rem]" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div>
          <label htmlFor={`${id}-topic`} className="field-label">
            Topic
          </label>
          <select id={`${id}-topic`} className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${id}-msg`} className="field-label">
          {kind === "problem" ? "Details" : "Message"} {kind === "problem" && <span className="font-normal text-ink-3">(optional)</span>}
        </label>
        <textarea
          id={`${id}-msg`}
          className="textarea"
          style={{ ["--ta-min" as string]: "8rem" }}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-describedby={`${id}-msg-help`}
        />
        <p id={`${id}-msg-help`} className="field-help">
          {kind === "problem"
            ? "What did you do, what did you expect, and what happened? Please don't paste private text or personal data."
            : "Up to 4,000 characters."}
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="field-label">
          Your email <span className="font-normal text-ink-3">(optional, only if you&apos;d like a reply)</span>
        </label>
        <input id={`${id}-email`} type="email" autoComplete="email" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this empty <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state === "error" && (
        <p role="alert" className="flex gap-2 rounded-md border border-danger-line bg-danger-subtle p-3 text-sm">
          <Icon name="circle-alert" size={18} className="shrink-0 text-danger" />
          <span>
            {errMsg} You can also email <a href={`mailto:${email}`} className="text-accent underline">{email}</a>.
          </span>
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary min-w-40" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : kind === "problem" ? "Send report" : "Send message"}
        </button>
      </div>
    </form>
  );
}
