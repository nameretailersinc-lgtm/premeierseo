"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, Segmented, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  BASE_NAME,
  explain,
  explainTwos,
  explainTwosRead,
  formatValue,
  fromBig,
  fromTwos,
  group,
  parseNumber,
  toBig,
  toTwos,
  type Base,
  type Steps,
  type Value,
} from "../lib/dev/base";

/*
 * Number base converter. All four bases update together; the landing page sets the focused
 * pair with config { from, to }. Two's complement mode treats binary/octal/hex as fixed-width
 * bit patterns and decimal as the signed value.
 */

const BASES: Base[] = [2, 10, 16, 8];
const LABEL: Record<Base, string> = { 2: "Binary (base 2)", 8: "Octal (base 8)", 10: "Decimal (base 10)", 16: "Hexadecimal (base 16)" };
const SAMPLE: Record<Base, string> = { 2: "11111111", 8: "755", 10: "255", 16: "1A3" };
const GROUP: Record<Base, number> = { 2: 4, 8: 3, 10: 3, 16: 2 };
/** 8-bit two's complement examples (−10 in every base). */
const TWOS_SAMPLE: Record<Base, string> = { 2: "11110110", 8: "366", 10: "-10", 16: "F6" };

type Opts = { neg: "sign" | "twos"; width: string; grouped: boolean; steps: boolean; pad: boolean };
const BITS_PER: Partial<Record<Base, number>> = { 2: 1, 8: 3, 16: 4 };

function asBase(v: unknown, fallback: Base): Base {
  const n = Number(v);
  return n === 2 || n === 8 || n === 10 || n === 16 ? n : fallback;
}

interface Derived {
  text: Partial<Record<Base, string>>;
  error?: string;
  note?: string;
  value?: Value;
  signed?: bigint;
  bits?: string;
}

function derive(raw: string, active: Base, o: Opts): Derived {
  const width = Number(o.width);
  const p = parseNumber(raw, active);
  if (p.error) return { text: {}, error: p.error };
  if (!p.value) return { text: {} };
  const v = p.value;
  const text: Partial<Record<Base, string>> = {};
  let note: string | undefined;
  if (o.neg === "twos") {
    if (v.num !== BigInt(0)) return { text: {}, error: "Two's complement is for whole numbers. Remove the fraction or switch Negative numbers to Minus sign." };
    let signed: bigint;
    let unsigned: bigint;
    if (active === 10) {
      signed = toBig(v);
      const t = toTwos(signed, width);
      if (t.error) return { text: {}, error: t.error };
      unsigned = BigInt("0b" + t.bits);
    } else {
      if (v.neg) return { text: {}, error: `In two's complement mode, type the ${BASE_NAME[active]} bit pattern without a minus sign.` };
      const r = fromTwos(v.int, width);
      if (r.error) return { text: {}, error: r.error };
      signed = r.value!;
      unsigned = v.int;
    }
    const bits = unsigned.toString(2).padStart(width, "0");
    text[10] = signed.toString();
    text[2] = bits;
    text[16] = unsigned.toString(16).toUpperCase().padStart(width / 4, "0");
    text[8] = unsigned.toString(8).padStart(Math.ceil(width / 3), "0");
    return { text, value: fromBig(signed), signed, bits };
  }
  for (const b of BASES) {
    const f = formatValue(v, b);
    text[b] = f.text;
    if (f.truncated) note = `The fraction doesn't end in ${BASE_NAME[b]}; it is cut off after 32 digits.`;
  }
  // Keep leading zeros: carry the bit width implied by the typed digits (hex 0F → 00001111).
  const per = BITS_PER[active];
  if (o.pad && per && p.digits) {
    const bits = p.digits.split(".")[0].length * per;
    for (const b of [2, 8, 16] as Base[]) {
      if (b === active) continue;
      const t = text[b] ?? "";
      const neg = t.startsWith("-");
      const [ip, fp] = (neg ? t.slice(1) : t).split(".");
      text[b] = (neg ? "-" : "") + ip.padStart(Math.ceil(bits / BITS_PER[b]!), "0") + (fp !== undefined ? "." + fp : "");
    }
  }
  return { text, value: v, note };
}

function StepsView({ steps }: { steps: Steps[] }) {
  return (
    <div className="grid gap-4 p-3 sm:p-4">
      {steps.map((s, i) => (
        <div key={i} className="grid gap-2">
          <p className="font-semibold">{s.method}</p>
          <p className="text-sm text-ink-2">{s.intro}</p>
          {s.tables.map((t, j) => (
            <div key={j} className="overflow-x-auto">
              <table className="w-full min-w-72 border-collapse text-sm tabular-nums">
                <caption className="pb-1 text-left text-ink-3">{t.caption}</caption>
                <thead>
                  <tr>
                    {t.head.map((h) => (
                      <th key={h} scope="col" className="border-b border-line px-2 py-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, k) => (
                    <tr key={k}>
                      {r.map((c, m) => (
                        <td key={m} className="font-mono border-b border-line px-2 py-1">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="font-mono rounded-md bg-surface-2 px-3 py-2 text-sm break-all">{s.result}</p>
        </div>
      ))}
    </div>
  );
}

export default function NumberBase({ toolId, config }: WidgetProps) {
  const { used, announce } = useTool();
  const id = useId();
  const pairFrom = asBase(config?.from, 2);
  const pairTo = asBase(config?.to, 10);
  const [focus, setFocus] = useState<[Base, Base]>([pairFrom, pairTo]);
  const [active, setActive] = useState<Base>(pairFrom);
  const [raw, setRaw] = useState("");
  const [o, setO] = usePersistentOptions<Opts>(toolId, { neg: "sign", width: "8", grouped: false, steps: true, pad: false });

  const d = useMemo(() => derive(raw, active, o), [raw, active, o]);
  const [from, to] = focus;
  const others = BASES.filter((b) => b !== from && b !== to);

  const shown = (b: Base) => {
    if (b === active) return raw;
    const t = d.text[b] ?? "";
    return o.grouped && t ? group(t, GROUP[b]) : t;
  };

  const steps = useMemo(() => {
    if (!o.steps || !d.value || d.error) return [] as Steps[];
    const target = active === from ? to : from;
    const list: Steps[] = [];
    if (o.neg === "twos" && d.signed !== undefined && d.signed < BigInt(0)) {
      if (active === 10) {
        const s = explainTwos(d.signed, Number(o.width));
        if (s) list.push(s);
      } else if (d.bits) {
        const s = explainTwosRead(d.bits);
        if (s) list.push(s);
      }
      return list;
    }
    const p = parseNumber(raw, active);
    if (!p.digits || !p.value) return list;
    const s = explain(p.digits, active, target, { ...p.value, neg: false });
    if (s) list.push(s);
    return list;
  }, [o.steps, o.neg, o.width, d, active, from, to, raw]);

  const field = (b: Base, big: boolean) => {
    const fid = `${id}-${b}`;
    const val = shown(b);
    const isActive = b === active;
    const err = isActive ? d.error : undefined;
    const digits = (d.text[b] ?? "").replace(/^-/, "").split(".")[0].length;
    return (
      <Field
        key={b}
        label={LABEL[b]}
        htmlFor={fid}
        error={err}
        help={
          val && !err ? (b === 2 ? `${digits} bit${digits === 1 ? "" : "s"}` : `${digits} digit${digits === 1 ? "" : "s"}`) : b === 10 ? "Digits 0–9" : b === 2 ? "0 and 1 only" : b === 8 ? "Digits 0–7" : "0–9 and A–F"
        }
      >
        <div className="flex gap-2">
          <input
            id={fid}
            type="text"
            inputMode={b === 16 ? "text" : "decimal"}
            autoComplete="off"
            spellCheck={false}
            className={`input mono ${big ? "h-12 text-lg" : ""}`}
            value={val}
            placeholder={isActive || !raw ? `e.g. ${SAMPLE[b]}` : ""}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `${fid}-err` : `${fid}-help`}
            onChange={(e) => {
              if (!isActive) setActive(b);
              setRaw(e.target.value);
              used("type");
            }}
          />
          <CopyButton text={val.replace(/ /g, "")} disabled={!val || Boolean(err)} />
        </div>
      </Field>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="Negative numbers"
            value={o.neg}
            onChange={(v) => setO({ ...o, neg: v })}
            options={[
              { value: "sign", label: "Minus sign" },
              { value: "twos", label: "Two's complement" },
            ]}
          />
          {o.neg === "twos" && (
            <Field label="Bit width" htmlFor={`${id}-w`} className="w-32">
              <select id={`${id}-w`} className="select" value={o.width} onChange={(e) => setO({ ...o, width: e.target.value })}>
                {["8", "16", "32", "64"].map((w) => (
                  <option key={w} value={w}>
                    {w}-bit
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Checkbox checked={o.grouped} onChange={(v) => setO({ ...o, grouped: v })} label="Group digits" help="Binary in fours, hex in pairs" />
          {o.neg === "sign" && (
            <Checkbox checked={o.pad} onChange={(v) => setO({ ...o, pad: v })} label="Keep leading zeros" help="Hex 0F → 00001111" />
          )}
          <Checkbox checked={o.steps} onChange={(v) => setO({ ...o, steps: v })} label="Show steps" />
        </div>
      </div>

      <Panel
        as="div"
        title={
          <span>
            {BASE_NAME[from][0].toUpperCase() + BASE_NAME[from].slice(1)} to {BASE_NAME[to]}
          </span>
        }
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setActive(from);
                setRaw(o.neg === "twos" ? TWOS_SAMPLE[from] : SAMPLE[from]);
                used("example");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="arrow-left-right"
              onClick={() => {
                setFocus([to, from]);
                if (raw && !d.error && d.text[to] !== undefined) {
                  setRaw(d.text[to] ?? "");
                  setActive(to);
                }
                announce(`Now converting ${BASE_NAME[to]} to ${BASE_NAME[from]}`);
              }}
            >
              Swap
            </Button>
            <Button
              variant="ghost"
              icon="trash"
              disabled={!raw}
              onClick={() => {
                setRaw("");
                announce("Cleared");
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          {field(from, true)}
          {field(to, true)}
        </div>
        <div className="grid gap-4 border-t border-line p-3 sm:grid-cols-2 sm:p-4">
          <p className="text-sm font-semibold text-ink-2 sm:col-span-2">Other bases</p>
          {others.map((b) => field(b, false))}
        </div>
        {d.note && (
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <Alert tone="info">{d.note}</Alert>
          </div>
        )}
      </Panel>

      {o.steps && (
        <Panel title={<span>Step-by-step working</span>}>
          {steps.length ? (
            <StepsView steps={steps} />
          ) : (
            <p className="min-h-16 p-3 text-sm text-ink-3 sm:p-4">
              {raw && !d.error
                ? "Steps are shown for numbers up to 64 digits long."
                : `Type a number in the ${BASE_NAME[from]} box to see how it converts.`}
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
