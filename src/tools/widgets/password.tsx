"use client";

/*
 * Password and passphrase generator. Randomness: crypto.getRandomValues (rejection sampling,
 * no modulo bias) via src/tools/lib/calc/password.ts. A password is generated on load and on
 * every option change. Options are remembered; passwords are never stored or sent anywhere.
 */
import { useCallback, useEffect, useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Panel, Segmented, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { AMBIGUOUS, entropyBits, generatePassphrase, generatePassword, poolFor, strengthLabel, type SetName } from "../lib/calc/password";
import { WORDS } from "../lib/calc/wordlist";

const DEFAULTS = {
  mode: "password" as "password" | "passphrase",
  length: 16,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  requireEach: true,
  words: 6,
  separator: "-",
  capitalize: false,
  addNumber: false,
  count: 1,
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export default function PasswordGenerator({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed, error } = useTool();
  const [o, setO] = usePersistentOptions(toolId, DEFAULTS);
  const [out, setOut] = useState<string[]>([]);
  const [bits, setBits] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) => {
    setO((p) => ({ ...p, [k]: v }));
    used("options");
  };

  const sets: Record<SetName, boolean> = { upper: o.upper, lower: o.lower, digits: o.digits, symbols: o.symbols };
  const { pool } = poolFor({ sets, excludeAmbiguous: o.excludeAmbiguous });

  const generate = useCallback(() => {
    try {
      const n = clamp(o.count, 1, 50);
      const list: string[] = [];
      let b = 0;
      for (let i = 0; i < n; i++) {
        if (o.mode === "password") {
          list.push(generatePassword({ length: clamp(o.length, 4, 128), sets: { upper: o.upper, lower: o.lower, digits: o.digits, symbols: o.symbols }, excludeAmbiguous: o.excludeAmbiguous, requireEach: o.requireEach }));
          b = entropyBits(poolFor({ sets: { upper: o.upper, lower: o.lower, digits: o.digits, symbols: o.symbols }, excludeAmbiguous: o.excludeAmbiguous }).pool.length, clamp(o.length, 4, 128));
        } else {
          const r = generatePassphrase({ words: clamp(o.words, 3, 12), separator: o.separator, capitalize: o.capitalize, addNumber: o.addNumber });
          list.push(r.text);
          b = r.bits;
        }
      }
      setOut(list);
      setBits(b);
      setErr(null);
    } catch (e) {
      setOut([]);
      setBits(0);
      setErr(e instanceof Error ? e.message : "Could not generate a password.");
      error("generate");
    }
  }, [o, error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- generate in the browser only (never on the server), and again whenever options change
    generate();
  }, [generate]);

  const s = strengthLabel(bits);
  const first = out[0] ?? "";
  const toneCls = { danger: "text-danger", warning: "text-warning", success: "text-success" }[s.tone];
  const barCls = { danger: "bg-danger", warning: "bg-warning", success: "bg-success" }[s.tone];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel
        tone="accent"
        title={o.mode === "password" ? "Your password" : "Your passphrase"}
        actions={
          <>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => {
                generate();
                used("regenerate");
                announce("New password generated");
              }}
            >
              Regenerate
            </Button>
            <CopyButton text={out.join("\n")} disabled={!out.length} label={out.length > 1 ? "Copy all" : "Copy"} variant="primary" />
          </>
        }
      >
        <div className="grid min-h-48 content-start gap-4 p-3 sm:p-4">
          {err ? (
            <Alert tone="danger" role="alert">
              {err}
            </Alert>
          ) : out.length > 1 ? (
            <label className="block">
              <span className="sr-only">Generated passwords</span>
              <textarea className="textarea mono" readOnly value={out.join("\n")} style={{ ["--ta-min" as string]: "12rem" }} spellCheck={false} />
            </label>
          ) : (
            <output
              htmlFor={`${id}-len`}
              className="block min-h-16 rounded-md border border-line-strong bg-surface-2 px-3 py-4 font-mono text-xl break-all text-ink sm:text-2xl"
              aria-label="Generated password"
            >
              {first || "Generating…"}
            </output>
          )}
          <div>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>
                Strength: <strong className={toneCls}>{bits ? s.label : "—"}</strong>
              </span>
              <span className="text-ink-3 tabular-nums">{bits ? `${bits.toFixed(1)} bits of entropy` : ""}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div className={`h-2 ${barCls}`} style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink-3">
              {o.mode === "password"
                ? `${clamp(o.length, 4, 128)} characters from a set of ${pool.length}: ${clamp(o.length, 4, 128)} × log₂(${pool.length}) = ${bits.toFixed(1)} bits.`
                : `${clamp(o.words, 3, 12)} words from a list of ${WORDS.length.toLocaleString()}: ${clamp(o.words, 3, 12)} × log₂(${WORDS.length}) = ${(clamp(o.words, 3, 12) * Math.log2(WORDS.length)).toFixed(1)} bits${o.addNumber ? ", plus a digit in a random word" : ""}.`}{" "}
              Each extra bit doubles the guesses an attacker who knows these settings would need.
            </p>
          </div>
          <p className="text-sm text-ink-3">Generated in your browser with the Web Crypto API. Nothing is saved or sent; the password is gone when you leave the page.</p>
        </div>
      </Panel>

      <Panel icon="sparkles" title="Options">
        <div className="grid gap-4 p-3 sm:p-4">
          <Segmented
            legend="Type"
            value={o.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "password", label: "Password" },
              { value: "passphrase", label: "Passphrase" },
            ]}
          />
          {o.mode === "password" ? (
            <>
              <div>
                <label htmlFor={`${id}-len`} className="field-label">
                  Length
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={4}
                    max={64}
                    value={Math.min(64, o.length)}
                    aria-label="Length slider"
                    aria-valuetext={`${o.length} characters`}
                    onChange={(e) => set("length", Number(e.target.value))}
                    className="w-full"
                  />
                  <input
                    id={`${id}-len`}
                    type="number"
                    min={4}
                    max={128}
                    className="input w-20 tabular-nums"
                    value={o.length}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) set("length", clamp(n, 4, 128));
                    }}
                  />
                </div>
              </div>
              <fieldset className="grid gap-0.5">
                <legend className="field-label">Characters</legend>
                <Checkbox checked={o.upper} onChange={(v) => set("upper", v)} label="Uppercase (A–Z)" />
                <Checkbox checked={o.lower} onChange={(v) => set("lower", v)} label="Lowercase (a–z)" />
                <Checkbox checked={o.digits} onChange={(v) => set("digits", v)} label="Numbers (0–9)" />
                <Checkbox checked={o.symbols} onChange={(v) => set("symbols", v)} label="Symbols (! # $ % & * …)" />
                <Checkbox checked={o.excludeAmbiguous} onChange={(v) => set("excludeAmbiguous", v)} label="Exclude look-alike characters" help={`Leaves out ${AMBIGUOUS.split("").join(" ")}`} />
                <Checkbox checked={o.requireEach} onChange={(v) => set("requireEach", v)} label="Use every selected type at least once" />
              </fieldset>
            </>
          ) : (
            <>
              <div>
                <label htmlFor={`${id}-words`} className="field-label">
                  Words
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={o.words}
                    aria-label="Words slider"
                    aria-valuetext={`${o.words} words`}
                    onChange={(e) => set("words", Number(e.target.value))}
                    className="w-full"
                  />
                  <input
                    id={`${id}-words`}
                    type="number"
                    min={3}
                    max={12}
                    className="input w-20 tabular-nums"
                    value={o.words}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) set("words", clamp(n, 3, 12));
                    }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`${id}-sep`} className="field-label">
                  Separator
                </label>
                <select id={`${id}-sep`} className="select" value={o.separator} onChange={(e) => set("separator", e.target.value)}>
                  <option value="-">Hyphen (-)</option>
                  <option value=" ">Space</option>
                  <option value=".">Dot (.)</option>
                  <option value="_">Underscore (_)</option>
                  <option value="">None</option>
                </select>
              </div>
              <Checkbox checked={o.capitalize} onChange={(v) => set("capitalize", v)} label="Capitalize each word" help="For sites that demand a capital letter; adds no strength." />
              <Checkbox checked={o.addNumber} onChange={(v) => set("addNumber", v)} label="Add a number" help="For sites that demand a digit." />
            </>
          )}
          <div>
            <label htmlFor={`${id}-count`} className="field-label">
              How many
            </label>
            <input
              id={`${id}-count`}
              type="number"
              min={1}
              max={50}
              className="input w-24 tabular-nums"
              value={o.count}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) set("count", clamp(n, 1, 50));
              }}
            />
          </div>
          <Button
            variant="ghost"
            icon="rotate-ccw"
            onClick={() => {
              setO(DEFAULTS);
              completed("reset");
            }}
          >
            Reset options
          </Button>
        </div>
      </Panel>
    </div>
  );
}
