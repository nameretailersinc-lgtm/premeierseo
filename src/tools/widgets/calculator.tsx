"use client";

/*
 * Calculator engine for percentage, discount, GST, EMI, BMI, AdSense and file-size pages.
 * config.mode picks the calculator. Everything computes live; a result shows "—" until the
 * inputs are valid, and the formula with the user's numbers is printed under every result.
 * Formulas live in src/tools/lib/calc/* and are quoted on the tool pages.
 */
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Panel, Segmented, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  addTax,
  applyPercent,
  earningsFromCtrCpc,
  earningsFromRpm,
  fmtMoney,
  fmtNum,
  loanTotals,
  ok,
  parseNum,
  percentChange,
  percentDifference,
  percentOf,
  percentOff,
  plain,
  removeTax,
  rpmFromCtrCpc,
  salePrice,
  stackedDiscount,
  whatPercent,
} from "../lib/calc/money";
import { ASIAN_ACTION_POINTS, IN_TO_M, LB_TO_KG, WHO_CATEGORIES, bmi as bmiOf, category, healthyRangeKg } from "../lib/calc/bmi";
import { convertAll, type SizeUnit } from "../lib/calc/bytes";
import { BigResult, CurrencySelect, Formula, NumInput, ResultRows, useAnnounceResult, useCurrencyCode } from "../lib/calc/ui";

const DASH = "—";

function Shell({
  inputs,
  result,
  onExample,
  onReset,
  copyText,
  exampleLabel = "Example",
}: {
  inputs: React.ReactNode;
  result: React.ReactNode;
  onExample?: () => void;
  onReset: () => void;
  copyText: string;
  exampleLabel?: string;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Inputs"
        actions={
          <>
            {onExample && (
              <Button variant="ghost" icon="sparkles" onClick={onExample}>
                {exampleLabel}
              </Button>
            )}
            <Button variant="ghost" icon="rotate-ccw" onClick={onReset}>
              Reset
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">{inputs}</div>
      </Panel>
      <Panel tone="accent" title="Result" actions={<CopyButton text={copyText} disabled={!copyText} label="Copy result" />}>
        <div className="grid min-h-64 content-start gap-4 p-3 sm:p-4">{result}</div>
      </Panel>
    </div>
  );
}

/* =============================== Percentage =============================== */

type PctMode = "of" | "what" | "change" | "diff" | "apply";

function PercentageCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { mode: "of" as PctMode });
  const mode = opts.mode;
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [dir, setDir] = useState<"up" | "down">("up");
  const A = parseNum(a);
  const B = parseNum(b);
  const valid = ok(A, B);

  const labels: Record<PctMode, [string, string]> = {
    of: ["Percentage (X)", "Of the number (Y)"],
    what: ["Value (X)", "Total (Y)"],
    change: ["Old value", "New value"],
    diff: ["First value", "Second value"],
    apply: ["Starting value", "Percentage"],
  };

  let main = DASH;
  let sub: string | null = null;
  let lines: string[] = [];
  if (valid) {
    if (mode === "of") {
      const r = percentOf(A, B);
      main = fmtNum(r, 4);
      lines = ["X% of Y = X ÷ 100 × Y", `${plain(A, 6)} ÷ 100 × ${plain(B, 6)} = ${plain(r, 6)}`];
      sub = `${plain(A, 6)}% of ${plain(B, 6)}`;
    } else if (mode === "what") {
      const r = whatPercent(A, B);
      if (Number.isFinite(r)) {
        main = `${fmtNum(r, 4)}%`;
        lines = ["X ÷ Y × 100", `${plain(A, 6)} ÷ ${plain(B, 6)} × 100 = ${plain(r, 6)}%`];
        sub = `${plain(A, 6)} is ${plain(r, 4)}% of ${plain(B, 6)}`;
      } else sub = "The total can't be zero.";
    } else if (mode === "change") {
      const r = percentChange(A, B);
      if (Number.isFinite(r)) {
        main = `${r > 0 ? "+" : ""}${fmtNum(r, 4)}%`;
        sub = r === 0 ? "No change" : `${fmtNum(Math.abs(r), 4)}% ${r > 0 ? "increase" : "decrease"} (difference ${plain(B - A, 6)})`;
        lines = ["(New − Old) ÷ |Old| × 100", `(${plain(B, 6)} − ${plain(A, 6)}) ÷ ${plain(Math.abs(A), 6)} × 100 = ${plain(r, 6)}%`];
      } else sub = "The old value can't be zero: a change from zero has no percentage.";
    } else if (mode === "diff") {
      const r = percentDifference(A, B);
      if (Number.isFinite(r)) {
        main = `${fmtNum(r, 4)}%`;
        sub = "Percentage difference (relative to the average of the two values)";
        lines = ["|A − B| ÷ ((A + B) ÷ 2) × 100", `|${plain(A, 6)} − ${plain(B, 6)}| ÷ ${plain((Math.abs(A) + Math.abs(B)) / 2, 6)} × 100 = ${plain(r, 6)}%`];
      } else sub = "Both values can't be zero.";
    } else {
      const p = dir === "up" ? B : -B;
      const r = applyPercent(A, p);
      main = fmtNum(r, 4);
      sub = `${plain(A, 6)} ${dir === "up" ? "increased" : "decreased"} by ${plain(B, 6)}% (${dir === "up" ? "+" : "−"}${plain(Math.abs(r - A), 6)})`;
      lines = [
        dir === "up" ? "Y × (1 + X ÷ 100)" : "Y × (1 − X ÷ 100)",
        `${plain(A, 6)} × (1 ${dir === "up" ? "+" : "−"} ${plain(B, 6)} ÷ 100) = ${plain(r, 6)}`,
      ];
    }
  }
  const copy = main !== DASH ? `${sub ? sub + ": " : ""}${main}` : "";
  useAnnounceResult(main !== DASH ? `Result ${main}` : null, announce, completed);

  return (
    <Shell
      onExample={() => {
        used("example");
        const ex: Record<PctMode, [string, string]> = { of: ["15", "240"], what: ["45", "60"], change: ["80", "100"], diff: ["80", "100"], apply: ["240", "15"] };
        setA(ex[mode][0]);
        setB(ex[mode][1]);
      }}
      onReset={() => {
        setA("");
        setB("");
      }}
      copyText={copy}
      inputs={
        <>
          <Segmented
            legend="Calculate"
            value={mode}
            onChange={(v) => setOpts((o) => ({ ...o, mode: v }))}
            options={[
              { value: "of", label: "X% of Y" },
              { value: "what", label: "X is what % of Y" },
              { value: "change", label: "% change" },
              { value: "diff", label: "% difference" },
              { value: "apply", label: "Increase / decrease" },
            ]}
          />
          {mode === "apply" && (
            <Segmented
              legend="Direction"
              value={dir}
              onChange={setDir}
              options={[
                { value: "up", label: "Increase by" },
                { value: "down", label: "Decrease by" },
              ]}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-a`} className="field-label">
                {labels[mode][0]}
              </label>
              <NumInput
                id={`${id}-a`}
                value={a}
                allowNegative
                suffix={mode === "of" ? "%" : undefined}
                onChange={(v) => {
                  setA(v);
                  used("type");
                }}
              />
            </div>
            <div>
              <label htmlFor={`${id}-b`} className="field-label">
                {labels[mode][1]}
              </label>
              <NumInput
                id={`${id}-b`}
                value={b}
                allowNegative={mode !== "apply"}
                suffix={mode === "apply" ? "%" : undefined}
                onChange={(v) => {
                  setB(v);
                  used("type");
                }}
              />
            </div>
          </div>
          {mode === "what" && <p className="field-help">For an exam percentage, enter the marks you scored as X and the maximum marks as Y.</p>}
        </>
      }
      result={
        <>
          <BigResult label="Result" value={main} sub={sub} />
          <Formula lines={lines} />
        </>
      }
    />
  );
}

/* =============================== Discount =============================== */

type DiscMode = "sale" | "off" | "stack";

function DiscountCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { mode: "sale" as DiscMode, currency: "" });
  const cur = useCurrencyCode(opts.currency);
  const [price, setPrice] = useState("");
  const [pct, setPct] = useState("");
  const [pct2, setPct2] = useState("");
  const [pct3, setPct3] = useState("");
  const [sale, setSale] = useState("");
  const [tax, setTax] = useState("");
  const mode = opts.mode;
  const P = parseNum(price);
  const T = tax.trim() ? parseNum(tax) : 0;
  const money = (n: number) => fmtMoney(n, cur);

  let main = DASH;
  let rows: [string, string][] = [];
  let lines: string[] = [];
  let sub: string | null = null;
  let err: string | null = null;

  if (mode === "sale") {
    const D = parseNum(pct);
    if (ok(P, D, T) && P >= 0) {
      if (D > 100) err = "A discount can't be more than 100%.";
      else {
        const r = salePrice(P, D);
        const taxAmt = (r.final * T) / 100;
        main = money(r.final + taxAmt);
        sub = T ? `including ${plain(T)}% tax on the discounted price` : `You save ${money(r.saving)}`;
        rows = [
          ["Original price", money(P)],
          [`Discount (${plain(D, 4)}%)`, `−${money(r.saving)}`],
          ["Price after discount", money(r.final)],
          ...(T ? ([[`Tax (${plain(T, 4)}%)`, `+${money(taxAmt)}`]] as [string, string][]) : []),
        ];
        lines = [
          "Sale price = Price × (1 − Discount ÷ 100)",
          `${plain(P)} × (1 − ${plain(D, 4)} ÷ 100) = ${plain(r.final)}`,
          T ? `With tax: ${plain(r.final)} × (1 + ${plain(T, 4)} ÷ 100) = ${plain(r.final + taxAmt)}` : "",
        ];
      }
    }
  } else if (mode === "off") {
    const S = parseNum(sale);
    if (ok(P, S) && P > 0 && S >= 0) {
      const r = percentOff(P, S);
      main = `${fmtNum(r, 2)}% off`;
      if (r < 0) sub = `The sale price is higher: that's a ${fmtNum(-r, 2)}% increase.`;
      else sub = `You save ${money(P - S)}`;
      rows = [
        ["Original price", money(P)],
        ["Sale price", money(S)],
        ["Saving", money(P - S)],
      ];
      lines = ["Percent off = (Original − Sale) ÷ Original × 100", `(${plain(P)} − ${plain(S)}) ÷ ${plain(P)} × 100 = ${plain(r)}%`];
    }
  } else {
    const ds = [pct, pct2, pct3].filter((s) => s.trim()).map(parseNum);
    if (ok(P, ...ds, T) && ds.length && P >= 0) {
      if (ds.some((d) => d > 100 || d < 0)) err = "Each discount must be between 0% and 100%.";
      else {
        const r = stackedDiscount(P, ds);
        const taxAmt = (r.final * T) / 100;
        main = money(r.final + taxAmt);
        sub = `Total saving ${money(r.saving)}, an effective ${fmtNum(r.effectivePct, 2)}% off (not ${plain(ds.reduce((s, d) => s + d, 0), 4)}%)`;
        rows = [
          ["Original price", money(P)],
          ...r.steps.map((s, i) => [`After discount ${i + 1} (${plain(s.pct, 4)}%)`, money(s.after)] as [string, string]),
          ...(T ? ([[`Tax (${plain(T, 4)}%)`, `+${money(taxAmt)}`]] as [string, string][]) : []),
        ];
        lines = [
          "Final = Price × (1 − d₁ ÷ 100) × (1 − d₂ ÷ 100) …",
          `${plain(P)} × ${ds.map((d) => `(1 − ${plain(d, 4)} ÷ 100)`).join(" × ")} = ${plain(r.final)}`,
          `Effective discount = 1 − ${ds.map((d) => plain(1 - d / 100, 6)).join(" × ")} = ${plain(r.effectivePct, 4)}%`,
        ];
      }
    }
  }
  useAnnounceResult(main !== DASH ? `Result ${main}` : null, announce, completed);

  const field = (label: string, value: string, set: (v: string) => void, key: string, suffix?: string, help?: string) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="field-label">
        {label}
      </label>
      <NumInput
        id={`${id}-${key}`}
        value={value}
        suffix={suffix}
        onChange={(v) => {
          set(v);
          used("type");
        }}
      />
      {help && <p className="field-help">{help}</p>}
    </div>
  );

  return (
    <Shell
      onExample={() => {
        used("example");
        setPrice("2499");
        if (mode === "sale") setPct("30");
        if (mode === "off") setSale("1874.25");
        if (mode === "stack") {
          setPct("20");
          setPct2("10");
        }
      }}
      onReset={() => {
        [setPrice, setPct, setPct2, setPct3, setSale, setTax].forEach((f) => f(""));
      }}
      copyText={main !== DASH ? `${main}${sub ? ` (${sub})` : ""}` : ""}
      inputs={
        <>
          <Segmented
            legend="Calculate"
            value={mode}
            onChange={(v) => setOpts((o) => ({ ...o, mode: v }))}
            options={[
              { value: "sale", label: "Sale price" },
              { value: "off", label: "Percent off" },
              { value: "stack", label: "Stacked discounts" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {field("Original price", price, setPrice, "p")}
            {mode === "sale" && field("Discount", pct, setPct, "d", "%")}
            {mode === "off" && field("Sale price", sale, setSale, "s")}
            {mode === "stack" && field("First discount", pct, setPct, "d1", "%")}
            {mode === "stack" && field("Second discount", pct2, setPct2, "d2", "%")}
            {mode === "stack" && field("Third discount (optional)", pct3, setPct3, "d3", "%")}
            {mode !== "off" && field("Sales tax or VAT (optional)", tax, setTax, "t", "%", "Added after the discount.")}
            <CurrencySelect id={`${id}-cur`} value={opts.currency} onChange={(v) => setOpts((o) => ({ ...o, currency: v }))} />
          </div>
        </>
      }
      result={
        <>
          <BigResult label={mode === "off" ? "Discount" : "You pay"} value={main} sub={sub} />
          {err && (
            <Alert tone="danger" role="alert">
              {err}
            </Alert>
          )}
          {rows.length > 0 && <ResultRows rows={rows} />}
          <Formula lines={lines} />
        </>
      }
    />
  );
}

/* =============================== GST =============================== */

const GST_RATES = [
  { v: "5", label: "5%" },
  { v: "18", label: "18%" },
  { v: "40", label: "40%" },
  { v: "3", label: "3%" },
  { v: "0.25", label: "0.25%" },
];

function GstCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { dir: "add" as "add" | "remove", supply: "intra" as "intra" | "inter", currency: "" });
  const cur = useCurrencyCode(opts.currency);
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("18");
  const A = parseNum(amount);
  const R = parseNum(rate);
  const money = (n: number) => fmtMoney(n, cur);
  const valid = ok(A, R) && A >= 0 && R >= 0 && R <= 100;
  const r = valid ? (opts.dir === "add" ? addTax(A, R) : removeTax(A, R)) : null;
  const half = r ? r.tax / 2 : NaN;

  const lines = r
    ? opts.dir === "add"
      ? ["GST = Net × Rate ÷ 100;  Total = Net + GST", `${plain(A)} × ${plain(R, 4)} ÷ 100 = ${plain(r.tax)};  ${plain(A)} + ${plain(r.tax)} = ${plain(r.gross)}`]
      : ["Net = Total × 100 ÷ (100 + Rate);  GST = Total − Net", `${plain(A)} × 100 ÷ ${plain(100 + R, 4)} = ${plain(r.net)};  ${plain(A)} − ${plain(r.net)} = ${plain(r.tax)}`]
    : [];
  if (r && opts.supply === "intra") lines.push(`CGST = SGST = ${plain(r.tax)} ÷ 2 = ${plain(half)} (${plain(R / 2, 4)}% each)`);
  if (r && opts.supply === "inter") lines.push(`IGST = ${plain(r.tax)} (the full ${plain(R, 4)}%)`);
  useAnnounceResult(r ? `GST ${money(r.tax)}, total ${money(r.gross)}` : null, announce, completed);

  return (
    <Shell
      onExample={() => {
        used("example");
        setAmount(opts.dir === "add" ? "1000" : "1180");
        setRate("18");
      }}
      onReset={() => {
        setAmount("");
        setRate("18");
      }}
      copyText={r ? `Net ${money(r.net)} + GST ${plain(R, 4)}% ${money(r.tax)} = ${money(r.gross)}` : ""}
      inputs={
        <>
          <Segmented
            legend="Calculation"
            value={opts.dir}
            onChange={(v) => setOpts((o) => ({ ...o, dir: v }))}
            options={[
              { value: "add", label: "Add GST" },
              { value: "remove", label: "Remove GST" },
            ]}
          />
          <div>
            <label htmlFor={`${id}-a`} className="field-label">
              {opts.dir === "add" ? "Price before GST (net)" : "Price including GST (total)"}
            </label>
            <NumInput
              id={`${id}-a`}
              value={amount}
              onChange={(v) => {
                setAmount(v);
                used("type");
              }}
            />
          </div>
          <div>
            <label htmlFor={`${id}-r`} className="field-label">
              GST or VAT rate
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="India GST rates">
              {GST_RATES.map((g) => (
                <button key={g.v} type="button" className="chip" aria-pressed={rate === g.v} onClick={() => setRate(g.v)}>
                  {g.label}
                </button>
              ))}
            </div>
            <NumInput id={`${id}-r`} value={rate} suffix="%" onChange={setRate} describedBy={`${id}-r-help`} />
            <p id={`${id}-r-help`} className="field-help">
              India slabs from 22 September 2025: 5%, 18% and 40%; 3% for gold and silver, 0.25% for rough diamonds. For VAT or any other sales tax, type your rate.
            </p>
          </div>
          <Segmented
            legend="Type of supply (India)"
            value={opts.supply}
            onChange={(v) => setOpts((o) => ({ ...o, supply: v }))}
            options={[
              { value: "intra", label: "Within a state: CGST + SGST" },
              { value: "inter", label: "Between states: IGST" },
            ]}
          />
          <CurrencySelect id={`${id}-cur`} value={opts.currency} onChange={(v) => setOpts((o) => ({ ...o, currency: v }))} />
        </>
      }
      result={
        <>
          <BigResult label={opts.dir === "add" ? "Total including GST" : "Price before GST"} value={r ? money(opts.dir === "add" ? r.gross : r.net) : DASH} />
          {valid ? null : rate.trim() && !(R >= 0 && R <= 100) ? <p className="text-sm text-danger">Enter a rate between 0 and 100%.</p> : null}
          <ResultRows
            rows={[
              ["Net amount", r ? money(r.net) : DASH],
              [`GST${Number.isFinite(R) ? ` (${plain(R, 4)}%)` : ""}`, r ? money(r.tax) : DASH],
              ...(opts.supply === "intra"
                ? ([
                    [`CGST (${Number.isFinite(R) ? plain(R / 2, 4) : "–"}%)`, r ? money(half) : DASH],
                    [`SGST / UTGST (${Number.isFinite(R) ? plain(R / 2, 4) : "–"}%)`, r ? money(half) : DASH],
                  ] as [string, string][])
                : ([[`IGST (${Number.isFinite(R) ? plain(R, 4) : "–"}%)`, r ? money(r.tax) : DASH]] as [string, string][])),
              ["Total", r ? money(r.gross) : DASH],
            ]}
          />
          <Formula lines={lines} />
        </>
      }
    />
  );
}

/* =============================== EMI =============================== */

function EmiCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { unit: "years" as "years" | "months", view: "yearly" as "yearly" | "monthly", currency: "" });
  const cur = useCurrencyCode(opts.currency);
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const P = parseNum(amount);
  const R = parseNum(rate);
  const T = parseNum(tenure);
  const months = opts.unit === "years" ? Math.round(T * 12) : Math.round(T);
  const valid = ok(P, R, T) && P > 0 && R >= 0 && R <= 100 && months >= 1 && months <= 600;
  const res = useMemo(() => (valid ? loanTotals(P, R, months) : null), [valid, P, R, months]);
  const money = (n: number, d = 2) => fmtMoney(n, cur, d);

  const yearly = useMemo(() => {
    if (!res) return [];
    const out: { year: number; payment: number; interest: number; principal: number; balance: number }[] = [];
    res.rows.forEach((r) => {
      const y = Math.ceil(r.month / 12);
      const cur = out[y - 1] ?? (out[y - 1] = { year: y, payment: 0, interest: 0, principal: 0, balance: 0 });
      cur.payment += r.payment;
      cur.interest += r.interest;
      cur.principal += r.principal;
      cur.balance = r.balance;
    });
    return out;
  }, [res]);

  const r = R / 12 / 100;
  const lines = res
    ? [
        "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)",
        `P = ${plain(P)}, r = ${plain(R, 4)} ÷ 12 ÷ 100 = ${plain(r, 8)}, n = ${months} months`,
        R === 0 ? `With 0% interest, EMI = P ÷ n = ${plain(res.emi)}` : `EMI = ${plain(res.emi)};  total interest = EMI × n − P = ${plain(res.interest)}`,
      ]
    : [];
  useAnnounceResult(res ? `EMI ${money(res.emi)} per month, total interest ${money(res.interest, 0)}` : null, announce, completed);

  const csv = () =>
    ["Month,Payment,Interest,Principal,Balance", ...(res?.rows ?? []).map((x) => [x.month, x.payment.toFixed(2), x.interest.toFixed(2), x.principal.toFixed(2), x.balance.toFixed(2)].join(","))].join("\n");

  return (
    <div className="grid gap-4">
      <Shell
        onExample={() => {
          used("example");
          setAmount("1000000");
          setRate("8.5");
          setTenure(opts.unit === "years" ? "20" : "240");
        }}
        onReset={() => {
          setAmount("");
          setRate("");
          setTenure("");
        }}
        copyText={res ? `EMI ${money(res.emi)} for ${months} months; total interest ${money(res.interest)}; total payment ${money(res.total)}` : ""}
        inputs={
          <>
            <div>
              <label htmlFor={`${id}-p`} className="field-label">
                Loan amount
              </label>
              <NumInput
                id={`${id}-p`}
                value={amount}
                onChange={(v) => {
                  setAmount(v);
                  used("type");
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-r`} className="field-label">
                  Interest rate (per year)
                </label>
                <NumInput id={`${id}-r`} value={rate} suffix="% p.a." onChange={setRate} />
              </div>
              <div>
                <label htmlFor={`${id}-t`} className="field-label">
                  Tenure
                </label>
                <NumInput id={`${id}-t`} value={tenure} suffix={opts.unit} onChange={setTenure} />
              </div>
            </div>
            <Segmented
              legend="Tenure in"
              value={opts.unit}
              onChange={(v) => {
                setOpts((o) => ({ ...o, unit: v }));
                if (Number.isFinite(T)) setTenure(v === "months" ? String(Math.round(T * 12)) : plain(T / 12, 2));
              }}
              options={[
                { value: "years", label: "Years" },
                { value: "months", label: "Months" },
              ]}
            />
            <CurrencySelect id={`${id}-cur`} value={opts.currency} onChange={(v) => setOpts((o) => ({ ...o, currency: v }))} />
            {ok(T) && (months < 1 || months > 600) && <p className="text-sm text-danger">Enter a tenure between 1 month and 50 years.</p>}
          </>
        }
        result={
          <>
            <BigResult label="Monthly EMI" value={res ? money(res.emi) : DASH} />
            <ResultRows
              rows={[
                ["Principal", res ? money(P) : DASH],
                ["Total interest", res ? money(res.interest) : DASH],
                ["Total of all payments", res ? money(res.total) : DASH],
                ["Interest as a share of payments", res ? `${fmtNum((res.interest / res.total) * 100, 1)}%` : DASH],
              ]}
            />
            <Formula lines={lines} />
          </>
        }
      />
      <Panel
        title="Amortization schedule"
        actions={
          <>
            <Segmented
              legend="Show"
              hideLegend
              value={opts.view}
              onChange={(v) => setOpts((o) => ({ ...o, view: v }))}
              options={[
                { value: "yearly", label: "By year" },
                { value: "monthly", label: "By month" },
              ]}
            />
            <DownloadButton data={csv} filename="emi-schedule.csv" mime="text/csv;charset=utf-8" label="CSV" disabled={!res} />
          </>
        }
      >
        {res ? (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">Amortization schedule {opts.view === "yearly" ? "by year" : "by month"}</caption>
              <thead className="sticky top-0 bg-surface-2 text-left text-ink-2">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    {opts.view === "yearly" ? "Year" : "Month"}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Payment
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Interest
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Principal
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {(opts.view === "yearly" ? yearly.map((y) => ({ k: y.year, ...y })) : res.rows.map((m) => ({ k: m.month, ...m }))).map((x) => (
                  <tr key={x.k} className="border-t border-line">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">
                      {x.k}
                    </th>
                    <td className="px-3 py-1.5 text-right">{money(x.payment)}</td>
                    <td className="px-3 py-1.5 text-right">{money(x.interest)}</td>
                    <td className="px-3 py-1.5 text-right">{money(x.principal)}</td>
                    <td className="px-3 py-1.5 text-right">{money(x.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="min-h-24 p-4 text-sm text-ink-3">Enter the loan amount, rate and tenure to see how each payment splits between interest and principal.</p>
        )}
      </Panel>
    </div>
  );
}

/* =============================== BMI =============================== */

function BmiCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { units: "metric" as "metric" | "imperial", asian: false });
  const [cm, setCm] = useState("");
  const [kg, setKg] = useState("");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [lb, setLb] = useState("");
  const metric = opts.units === "metric";

  let hM = NaN;
  let wKg = NaN;
  if (metric) {
    hM = parseNum(cm) / 100;
    wKg = parseNum(kg);
  } else {
    const f = ft.trim() ? parseNum(ft) : 0;
    const i = inch.trim() ? parseNum(inch) : 0;
    hM = ft.trim() || inch.trim() ? (f * 12 + i) * IN_TO_M : NaN;
    wKg = parseNum(lb) * LB_TO_KG;
  }
  const plausible = hM >= 0.5 && hM <= 2.75 && wKg >= 10 && wKg <= 650;
  const value = plausible ? bmiOf(wKg, hM) : NaN;
  const cat = category(value);
  const asianCat = opts.asian ? category(value, ASIAN_ACTION_POINTS) : undefined;
  const [lo, hi] = Number.isFinite(value) ? healthyRangeKg(hM) : [NaN, NaN];
  const shown = Number.isFinite(value) ? (Math.round(value * 10) / 10).toFixed(1) : DASH;
  const hasInput = metric ? cm.trim() && kg.trim() : (ft.trim() || inch.trim()) && lb.trim();
  const range = (a: number, b: number) =>
    metric ? `${fmtNum(a, 1)}–${fmtNum(b, 1)} kg` : `${fmtNum(a / LB_TO_KG, 0)}–${fmtNum(b / LB_TO_KG, 0)} lb`;
  const totalIn = hM / IN_TO_M;
  const lines = Number.isFinite(value)
    ? metric
      ? ["BMI = weight (kg) ÷ height (m)²", `${plain(wKg, 2)} ÷ ${plain(hM, 3)}² = ${plain(wKg, 2)} ÷ ${plain(hM * hM, 4)} = ${plain(value, 2)}`]
      : [
          "BMI = 703 × weight (lb) ÷ height (in)²  (703.07 exactly)",
          `${plain(wKg / LB_TO_KG, 2)} lb, ${plain(totalIn, 2)} in → 703.07 × ${plain(wKg / LB_TO_KG, 2)} ÷ ${plain(totalIn * totalIn, 2)} = ${plain(value, 2)}`,
        ]
    : [];
  useAnnounceResult(Number.isFinite(value) && cat ? `BMI ${shown}, ${cat.label}` : null, announce, completed);
  const pos = Number.isFinite(value) ? Math.min(100, Math.max(0, ((value - 15) / (40 - 15)) * 100)) : null;

  const f = (label: string, v: string, set: (s: string) => void, key: string, suffix: string) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="field-label">
        {label}
      </label>
      <NumInput
        id={`${id}-${key}`}
        value={v}
        suffix={suffix}
        onChange={(x) => {
          set(x);
          used("type");
        }}
      />
    </div>
  );

  return (
    <Shell
      onExample={() => {
        used("example");
        if (metric) {
          setCm("175");
          setKg("70");
        } else {
          setFt("5");
          setInch("9");
          setLb("160");
        }
      }}
      onReset={() => [setCm, setKg, setFt, setInch, setLb].forEach((s) => s(""))}
      copyText={Number.isFinite(value) && cat ? `BMI ${shown} (${cat.label}, WHO adult category)` : ""}
      inputs={
        <>
          <Alert tone="info">For adults aged 20 and over. Not for children, teens or pregnancy: children and teens need BMI-for-age percentiles.</Alert>
          <Segmented
            legend="Units"
            value={opts.units}
            onChange={(v) => setOpts((o) => ({ ...o, units: v }))}
            options={[
              { value: "metric", label: "Metric (cm, kg)" },
              { value: "imperial", label: "Imperial (ft, in, lb)" },
            ]}
          />
          {metric ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {f("Height", cm, setCm, "cm", "cm")}
              {f("Weight", kg, setKg, "kg", "kg")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {f("Height (feet)", ft, setFt, "ft", "ft")}
              {f("Height (inches)", inch, setInch, "in", "in")}
              {f("Weight", lb, setLb, "lb", "lb")}
            </div>
          )}
          <Checkbox
            checked={opts.asian}
            onChange={(v) => setOpts((o) => ({ ...o, asian: v }))}
            label="Also show WHO action points for Asian adults"
            help="Lower cut-offs (23 and 27.5) from the 2004 WHO expert consultation."
          />
        </>
      }
      result={
        <>
          <BigResult label="Your BMI" value={shown} sub={cat ? <span className="font-semibold">{cat.label}</span> : null} />
          {hasInput && !plausible && <p className="text-sm text-danger">Check the height and weight: the values look outside a possible adult range.</p>}
          <div aria-hidden="true">
            <div className="relative flex h-3 overflow-hidden rounded-full">
              <span className="bg-accent-line" style={{ width: "14%" }} />
              <span className="bg-success-line" style={{ width: "26%" }} />
              <span className="bg-warning-line" style={{ width: "20%" }} />
              <span className="bg-danger-line" style={{ width: "40%" }} />
              {pos !== null && <span className="absolute top-0 h-3 w-1 -translate-x-1/2 rounded bg-ink" style={{ left: `${pos}%` }} />}
            </div>
            <div className="mt-1 flex justify-between text-xs text-ink-3 tabular-nums">
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
          <ResultRows
            rows={[
              ["Healthy BMI range (WHO)", "18.5–24.9"],
              ["Weight for that range at your height", Number.isFinite(lo) ? range(lo, hi) : DASH],
              ...(opts.asian ? ([["WHO Asian action points", asianCat ? asianCat.label : DASH]] as [string, string][]) : []),
            ]}
          />
          <table className="w-full text-sm">
            <caption className="sr-only">WHO adult BMI categories</caption>
            <tbody>
              {WHO_CATEGORIES.map((c) => (
                <tr key={c.label} className={`border-t border-line ${cat?.label === c.label ? "bg-accent-subtle font-semibold" : ""}`}>
                  <th scope="row" className="px-2 py-1 text-left font-normal">
                    {c.label}
                  </th>
                  <td className="px-2 py-1 text-right tabular-nums">{c.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Formula lines={lines} />
        </>
      }
    />
  );
}

/* =============================== AdSense =============================== */

function AdsenseCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { method: "rpm" as "rpm" | "ctr", currency: "" });
  const cur = useCurrencyCode(opts.currency);
  const [views, setViews] = useState("");
  const [rpm, setRpm] = useState("");
  const [ctr, setCtr] = useState("");
  const [cpc, setCpc] = useState("");
  const V = parseNum(views);
  const money = (n: number) => fmtMoney(n, cur);
  let daily = NaN;
  let lines: string[] = [];
  if (opts.method === "rpm") {
    const R = parseNum(rpm);
    if (ok(V, R) && V >= 0 && R >= 0) {
      daily = earningsFromRpm(V, R);
      lines = ["Earnings = Page views ÷ 1,000 × Page RPM", `${plain(V)} ÷ 1,000 × ${plain(R)} = ${plain(daily)} per day`];
    }
  } else {
    const C = parseNum(ctr);
    const K = parseNum(cpc);
    if (ok(V, C, K) && V >= 0 && C >= 0 && C <= 100 && K >= 0) {
      daily = earningsFromCtrCpc(V, C, K);
      lines = [
        "Earnings = Page views × CTR ÷ 100 × CPC",
        `${plain(V)} × ${plain(C, 4)} ÷ 100 × ${plain(K)} = ${plain(daily)} per day`,
        `Implied page RPM = CTR ÷ 100 × CPC × 1,000 = ${plain(rpmFromCtrCpc(C, K))}`,
      ];
    }
  }
  const valid = Number.isFinite(daily);
  if (valid) lines.push("Month = day × 30; year = day × 365");
  useAnnounceResult(valid ? `About ${money(daily * 30)} per month` : null, announce, completed);

  return (
    <Shell
      exampleLabel="Example values"
      onExample={() => {
        used("example");
        setViews("10000");
        setRpm("5");
        setCtr("1.5");
        setCpc("0.40");
      }}
      onReset={() => [setViews, setRpm, setCtr, setCpc].forEach((s) => s(""))}
      copyText={valid ? `Estimated AdSense earnings: ${money(daily)} per day, ${money(daily * 30)} per month, ${money(daily * 365)} per year` : ""}
      inputs={
        <>
          <Segmented
            legend="Estimate from"
            value={opts.method}
            onChange={(v) => setOpts((o) => ({ ...o, method: v }))}
            options={[
              { value: "rpm", label: "Page RPM" },
              { value: "ctr", label: "CTR × CPC" },
            ]}
          />
          <div>
            <label htmlFor={`${id}-v`} className="field-label">
              Page views per day
            </label>
            <NumInput
              id={`${id}-v`}
              value={views}
              onChange={(v) => {
                setViews(v);
                used("type");
              }}
            />
          </div>
          {opts.method === "rpm" ? (
            <div>
              <label htmlFor={`${id}-rpm`} className="field-label">
                Page RPM (earnings per 1,000 page views)
              </label>
              <NumInput id={`${id}-rpm`} value={rpm} onChange={setRpm} />
              <p className="field-help">Use the Page RPM from your AdSense reports for the same pages and countries.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-ctr`} className="field-label">
                  Page CTR
                </label>
                <NumInput id={`${id}-ctr`} value={ctr} suffix="%" onChange={setCtr} />
              </div>
              <div>
                <label htmlFor={`${id}-cpc`} className="field-label">
                  Cost per click (CPC)
                </label>
                <NumInput id={`${id}-cpc`} value={cpc} onChange={setCpc} />
              </div>
            </div>
          )}
          <CurrencySelect id={`${id}-cur`} value={opts.currency} onChange={(v) => setOpts((o) => ({ ...o, currency: v }))} />
          <p className="field-help">Example values are for trying the calculator only. They are not typical earnings: RPM and CPC vary widely by country, topic and season.</p>
        </>
      }
      result={
        <>
          <BigResult label="Estimated earnings per month" value={valid ? money(daily * 30) : DASH} />
          <ResultRows
            rows={[
              ["Per day", valid ? money(daily) : DASH],
              ["Per month (30 days)", valid ? money(daily * 30) : DASH],
              ["Per year (365 days)", valid ? money(daily * 365) : DASH],
            ]}
          />
          <Formula lines={lines} />
        </>
      }
    />
  );
}

/* =============================== MB ↔ KB =============================== */

const UNITS: { v: SizeUnit; label: string }[] = [
  { v: "B", label: "Bytes (B)" },
  { v: "KB", label: "Kilobytes (KB)" },
  { v: "MB", label: "Megabytes (MB)" },
  { v: "GB", label: "Gigabytes (GB)" },
  { v: "TB", label: "Terabytes (TB)" },
  { v: "KiB", label: "Kibibytes (KiB)" },
  { v: "MiB", label: "Mebibytes (MiB)" },
  { v: "GiB", label: "Gibibytes (GiB)" },
];

function SizeCalc({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { unit: "MB" as SizeUnit, convention: "decimal" as "decimal" | "binary" });
  const [value, setValue] = useState("1");
  const V = parseNum(value);
  const valid = ok(V) && V >= 0;
  const ambiguous = ["KB", "MB", "GB", "TB"].includes(opts.unit);
  const r = valid ? convertAll(V, opts.unit, opts.convention) : null;
  const n = (x: number) => (r ? fmtNum(x, x < 1 ? 9 : 4) : DASH);
  const label = `${plain(V, 6)} ${opts.unit}`;
  const bytesLine = r
    ? ambiguous
      ? `${label} × ${opts.convention === "binary" ? "1,024" : "1,000"}^${["KB", "MB", "GB", "TB"].indexOf(opts.unit) + 1} = ${fmtNum(r.bytes, 3)} bytes`
      : `${label} = ${fmtNum(r.bytes, 3)} bytes`
    : "";
  useAnnounceResult(r ? `${label} is ${n(r.decimal.KB)} KB decimal, ${n(r.binary.KiB)} KB binary` : null, announce, completed);

  return (
    <Shell
      onReset={() => setValue("")}
      onExample={() => {
        used("example");
        setValue("2");
        setOpts((o) => ({ ...o, unit: "MB" }));
      }}
      copyText={r ? `${label} = ${n(r.decimal.KB)} KB (1 KB = 1,000 B) = ${n(r.binary.KiB)} KiB (1 KiB = 1,024 B)` : ""}
      inputs={
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor={`${id}-v`} className="field-label">
                Size
              </label>
              <NumInput
                id={`${id}-v`}
                value={value}
                onChange={(v) => {
                  setValue(v);
                  used("type");
                }}
              />
            </div>
            <div>
              <label htmlFor={`${id}-u`} className="field-label">
                Unit
              </label>
              <select id={`${id}-u`} className="select" value={opts.unit} onChange={(e) => setOpts((o) => ({ ...o, unit: e.target.value as SizeUnit }))}>
                {UNITS.map((u) => (
                  <option key={u.v} value={u.v}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {ambiguous && (
            <Segmented
              legend={`My ${opts.unit} means`}
              value={opts.convention}
              onChange={(v) => setOpts((o) => ({ ...o, convention: v }))}
              options={[
                { value: "decimal", label: "Decimal: 1 MB = 1,000 KB" },
                { value: "binary", label: "Binary: 1 MB = 1,024 KB" },
              ]}
            />
          )}
          <p className="field-help">
            Need a smaller file rather than a number? <Link className="text-accent underline" href="/reduce-image-size-in-kb/">Reduce an image to a size in KB</Link> or{" "}
            <Link className="text-accent underline" href="/compress-pdf/">compress a PDF</Link>.
          </p>
        </>
      }
      result={
        <>
          <BigResult
            label={`${label} in kilobytes`}
            value={r ? `${n(r.decimal.KB)} KB` : DASH}
            sub={r ? `or ${n(r.binary.KiB)} KB if 1 KB = 1,024 bytes (Windows)` : null}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">Conversions in decimal and binary units</caption>
              <thead className="text-left text-ink-2">
                <tr>
                  <th scope="col" className="py-1.5 pr-2">
                    Decimal (SI, macOS, drives)
                  </th>
                  <th scope="col" className="py-1.5 pl-2">
                    Binary (IEC, Windows)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["KB", "KiB"],
                    ["MB", "MiB"],
                    ["GB", "GiB"],
                    ["TB", "TiB"],
                  ] as const
                ).map(([d, b]) => (
                  <tr key={d} className="border-t border-line">
                    <td className="py-1.5 pr-2">
                      {r ? n(r.decimal[d]) : DASH} {d}
                    </td>
                    <td className="py-1.5 pl-2">
                      {r ? n(r.binary[b]) : DASH} {b} <span className="text-ink-3">({d} on Windows)</span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <td className="py-1.5 pr-2" colSpan={2}>
                    {r ? fmtNum(r.bytes, 3) : DASH} bytes
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Formula lines={r ? [bytesLine, "KB = bytes ÷ 1,000;  KiB = bytes ÷ 1,024", "MB = bytes ÷ 1,000,000;  MiB = bytes ÷ 1,048,576"] : []} />
        </>
      }
    />
  );
}

export default function Calculator({ toolId, config }: WidgetProps) {
  switch (config?.mode) {
    case "percentage":
      return <PercentageCalc toolId={toolId} />;
    case "discount":
      return <DiscountCalc toolId={toolId} />;
    case "gst":
      return <GstCalc toolId={toolId} />;
    case "emi":
      return <EmiCalc toolId={toolId} />;
    case "bmi":
      return <BmiCalc toolId={toolId} />;
    case "adsense":
      return <AdsenseCalc toolId={toolId} />;
    case "mb-kb":
      return <SizeCalc toolId={toolId} />;
    default:
      return (
        <p role="alert" className="panel p-4 text-danger">
          Unknown calculator.
        </p>
      );
  }
}
