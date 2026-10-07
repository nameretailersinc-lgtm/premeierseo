"use client";

/*
 * Test data engine. config.mode:
 *  - "cards": Luhn-valid test card numbers (random digits after a network prefix) + Luhn validator
 *  - "names": clearly fictional people (example.com emails, regulator-reserved fictional phones)
 *  - "boy-names": curated boy names with origin and meaning, filters, tap-to-copy, shortlist
 * Randomness: crypto.getRandomValues (src/tools/lib/text/random.ts).
 */
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Panel, Segmented, copyText, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { NETWORKS, detectNetwork, groupDigits, luhnCheckDigit, luhnValid, testCardNumber } from "../lib/calc/codes";
import { BOY_NAMES, COUNTRIES, ORIGINS, fakePerson, type Country, type FakePerson, type Gender } from "../lib/calc/names";
import { randomBelow, shuffle } from "../lib/text/random";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : lo)));
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/* =============================== Test card numbers =============================== */

function TestCards({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { network: "visa", count: 5, grouped: true });
  const [rows, setRows] = useState<{ network: string; number: string }[]>([]);
  const [check, setCheck] = useState("");

  const generate = useCallback(() => {
    const n = clamp(o.count, 1, 100);
    const list = Array.from({ length: n }, () => {
      const net = o.network === "mixed" ? NETWORKS[randomBelow(NETWORKS.length)] : NETWORKS.find((x) => x.id === o.network)!;
      const num = testCardNumber(net);
      return { network: net.name, number: o.grouped ? groupDigits(num, net.group) : num };
    });
    setRows(list);
  }, [o.network, o.count, o.grouped]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- numbers are generated in the browser only
    generate();
  }, [generate]);

  const digits = check.replace(/[\s-]/g, "");
  const net = digits ? detectNetwork(digits) : undefined;
  const valid = digits.length >= 2 && /^\d+$/.test(digits) ? luhnValid(digits) : null;
  const expected = digits.length >= 2 && /^\d+$/.test(digits) ? luhnCheckDigit(digits.slice(0, -1)) : null;

  return (
    <div className="grid gap-4">
      <Alert tone="warning" title="Test numbers only">
        Luhn-valid test numbers for software testing. Not real cards; cannot be used for payments. For end-to-end payment tests use your gateway&apos;s official test cards, such as{" "}
        <a href="https://docs.stripe.com/testing" rel="noopener" target="_blank">
          Stripe&apos;s
        </a>{" "}
        or{" "}
        <a href="https://developer.paypal.com/tools/sandbox/card-testing/" rel="noopener" target="_blank">
          PayPal&apos;s
        </a>
        .
      </Alert>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Panel icon="sparkles" title="Options">
          <div className="grid gap-4 p-3 sm:p-4">
            <div>
              <label htmlFor={`${id}-net`} className="field-label">
                Card network (prefix)
              </label>
              <select id={`${id}-net`} className="select" value={o.network} onChange={(e) => setO((p) => ({ ...p, network: e.target.value }))}>
                {NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.length} digits)
                  </option>
                ))}
                <option value="mixed">Mixed networks</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-count`} className="field-label">
                Quantity
              </label>
              <input id={`${id}-count`} type="number" min={1} max={100} className="input w-24 tabular-nums" value={o.count} onChange={(e) => setO((p) => ({ ...p, count: clamp(Number(e.target.value), 1, 100) }))} />
            </div>
            <Checkbox checked={o.grouped} onChange={(v) => setO((p) => ({ ...p, grouped: v }))} label="Group digits with spaces" />
            <Button
              variant="primary"
              icon="refresh"
              onClick={() => {
                generate();
                used("generate");
                announce("New test numbers generated");
              }}
            >
              Generate numbers
            </Button>
          </div>
        </Panel>
        <Panel
          title="Test card numbers"
          actions={
            <>
              <CopyButton text={rows.map((r) => r.number).join("\n")} disabled={!rows.length} label="Copy all" />
              <DownloadButton data={() => ["network,number", ...rows.map((r) => `${csvCell(r.network)},${r.number.replace(/\s/g, "")}`)].join("\n")} filename="test-card-numbers.csv" mime="text/csv;charset=utf-8" label="CSV" disabled={!rows.length} />
              <DownloadButton data={() => JSON.stringify(rows.map((r) => ({ network: r.network, number: r.number.replace(/\s/g, ""), test_only: true })), null, 2)} filename="test-card-numbers.json" mime="application/json" label="JSON" disabled={!rows.length} />
            </>
          }
        >
          <ul className="grid min-h-48 content-start divide-y divide-line">
            {rows.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
                <span className="font-mono text-base tabular-nums">{r.number}</span>
                <span className="text-sm text-ink-3">{r.network} · test only</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title={<label htmlFor={`${id}-check`}>Luhn validator</label>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <input id={`${id}-check`} className="input mono" inputMode="numeric" autoComplete="off" value={check} placeholder="Paste a number to check its Luhn checksum" onChange={(e) => setCheck(e.target.value)} />
          <p className="text-sm" role="status">
            {valid === null ? (
              <span className="text-ink-3">Checks the checksum and prefix only. It can&apos;t tell whether a card exists or has funds.</span>
            ) : valid ? (
              <span className="text-success">Passes the Luhn check{net ? ` · ${net.name} prefix` : ""} · {digits.length} digits{net && net.length !== digits.length ? ` (${net.name} numbers here are ${net.length} digits)` : ""}.</span>
            ) : (
              <span className="text-danger">
                Fails the Luhn check. With these first {digits.length - 1} digits the last digit would need to be {expected}.
              </span>
            )}
          </p>
        </div>
      </Panel>
    </div>
  );
}

/* =============================== Fake names =============================== */

const FIELDS = [
  { key: "email", label: "Email (example.com)" },
  { key: "username", label: "Username" },
  { key: "phone", label: "Phone (fictional range)" },
  { key: "address", label: "Address" },
  { key: "birthDate", label: "Date of birth" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

function FakeNames({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { country: "US" as Country, gender: "any" as Gender, count: 10, email: true, username: false, phone: true, address: true, birthDate: false });
  const [people, setPeople] = useState<FakePerson[]>([]);

  const generate = useCallback(() => {
    setPeople(Array.from({ length: clamp(o.count, 1, 500) }, () => fakePerson(o.country, o.gender)));
  }, [o.country, o.gender, o.count]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- generated in the browser only
    generate();
  }, [generate]);

  const cols: { key: string; label: string; get: (p: FakePerson) => string }[] = [
    { key: "name", label: "Name", get: (p) => `${p.firstName} ${p.lastName}` },
    ...(o.email ? [{ key: "email", label: "Email", get: (p: FakePerson) => p.email }] : []),
    ...(o.username ? [{ key: "username", label: "Username", get: (p: FakePerson) => p.username }] : []),
    ...(o.phone ? [{ key: "phone", label: "Phone", get: (p: FakePerson) => p.phone || "—" }] : []),
    ...(o.address ? [{ key: "address", label: "Address", get: (p: FakePerson) => `${p.street}, ${p.city}, ${p.region} ${p.postalCode}` }] : []),
    ...(o.birthDate ? [{ key: "birthDate", label: "Date of birth", get: (p: FakePerson) => p.birthDate }] : []),
  ];
  const exportRows = () =>
    people.map((p) => {
      const r: Record<string, string> = { first_name: p.firstName, last_name: p.lastName, gender: p.gender };
      if (o.email) r.email = p.email;
      if (o.username) r.username = p.username;
      if (o.phone) r.phone = p.phone;
      if (o.address) Object.assign(r, { street: p.street, city: p.city, region: p.region, postal_code: p.postalCode, country: p.country });
      if (o.birthDate) r.birth_date = p.birthDate;
      return r;
    });
  const csv = () => {
    const rs = exportRows();
    if (!rs.length) return "";
    const keys = Object.keys(rs[0]);
    return [keys.join(","), ...rs.map((r) => keys.map((k) => csvCell(r[k] ?? "")).join(","))].join("\n");
  };

  return (
    <div className="grid gap-4">
      <Alert tone="info">
        Fictional test data. Names are common first names and surnames combined at random; emails use the reserved example.com/.net/.org domains; phone numbers come from ranges regulators reserve for fiction. Street addresses are invented, but a combination can match a real address by chance, so never send mail or goods to one.
      </Alert>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Panel icon="sparkles" title="Options">
          <div className="grid gap-4 p-3 sm:p-4">
            <div>
              <label htmlFor={`${id}-country`} className="field-label">
                Country
              </label>
              <select id={`${id}-country`} className="select" value={o.country} onChange={(e) => setO((p) => ({ ...p, country: e.target.value as Country }))}>
                {(Object.keys(COUNTRIES) as Country[]).map((c) => (
                  <option key={c} value={c}>
                    {COUNTRIES[c].name}
                  </option>
                ))}
              </select>
              {o.country === "IN" && <p className="field-help">No fictional phone range is published for India, so phone numbers are left blank.</p>}
            </div>
            <Segmented
              legend="Gender"
              value={o.gender}
              onChange={(v) => setO((p) => ({ ...p, gender: v }))}
              options={[
                { value: "any", label: "Any" },
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
            <fieldset className="grid gap-0.5">
              <legend className="field-label">Fields</legend>
              {FIELDS.map((f) => (
                <Checkbox key={f.key} checked={o[f.key as FieldKey]} onChange={(v) => setO((p) => ({ ...p, [f.key]: v }))} label={f.label} />
              ))}
            </fieldset>
            <div>
              <label htmlFor={`${id}-n`} className="field-label">
                How many
              </label>
              <input id={`${id}-n`} type="number" min={1} max={500} className="input w-24 tabular-nums" value={o.count} onChange={(e) => setO((p) => ({ ...p, count: clamp(Number(e.target.value), 1, 500) }))} />
            </div>
            <Button
              variant="primary"
              icon="refresh"
              onClick={() => {
                generate();
                used("generate");
                announce(`${clamp(o.count, 1, 500)} fictional people generated`);
              }}
            >
              Generate people
            </Button>
          </div>
        </Panel>
        <Panel
          title={`${people.length} fictional ${people.length === 1 ? "person" : "people"}`}
          actions={
            <>
              <CopyButton text={csv} disabled={!people.length} label="Copy CSV" />
              <DownloadButton data={csv} filename={`fake-names-${o.country.toLowerCase()}.csv`} mime="text/csv;charset=utf-8" label="CSV" disabled={!people.length} />
              <DownloadButton data={() => JSON.stringify(exportRows(), null, 2)} filename={`fake-names-${o.country.toLowerCase()}.json`} mime="application/json" label="JSON" disabled={!people.length} />
            </>
          }
        >
          <div className="max-h-[32rem] min-h-48 overflow-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Generated fictional people</caption>
              <thead className="sticky top-0 bg-surface-2 text-left text-ink-2">
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} scope="col" className="px-3 py-2 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.map((p, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    {cols.map((c) => (
                      <td key={c.key} className="px-3 py-1.5">
                        {c.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* =============================== Boy names =============================== */

const LETTERS = Array.from(new Set(BOY_NAMES.map((b) => b.name[0]))).sort();

function BoyNames({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { letter: "", length: "any", origin: "", withMeaning: false, order: "random" as "random" | "az", shortlist: [] as string[] });
  const [seed, setSeed] = useState(0);
  const [order, setOrder] = useState<string[]>(() => BOY_NAMES.map((b) => b.name).sort());
  const [copied, setCopied] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shuffle in the browser only (keeps SSR output stable)
    setOrder(o.order === "random" ? shuffle(BOY_NAMES.map((b) => b.name)) : BOY_NAMES.map((b) => b.name).sort());
  }, [o.order, seed]);

  const byName = useMemo(() => new Map(BOY_NAMES.map((b) => [b.name, b])), []);
  const list = order
    .map((n) => byName.get(n)!)
    .filter((b) => (!o.letter || b.name[0] === o.letter) && (!o.origin || b.origin === o.origin) && (!o.withMeaning || b.meaning))
    .filter((b) => (o.length === "short" ? b.name.length <= 4 : o.length === "medium" ? b.name.length >= 5 && b.name.length <= 6 : o.length === "long" ? b.name.length >= 7 : true));

  const toggle = (name: string) => setO((p) => ({ ...p, shortlist: p.shortlist.includes(name) ? p.shortlist.filter((n) => n !== name) : [...p.shortlist, name] }));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Panel
        title={`${list.length} names`}
        actions={
          <Button
            variant="secondary"
            icon="shuffle"
            onClick={() => {
              setO((p) => ({ ...p, order: "random" }));
              setSeed((s) => s + 1);
              used("shuffle");
            }}
          >
            Shuffle
          </Button>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor={`${id}-l`} className="field-label">
                Starts with
              </label>
              <select id={`${id}-l`} className="select" value={o.letter} onChange={(e) => setO((p) => ({ ...p, letter: e.target.value }))}>
                <option value="">Any letter</option>
                {LETTERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-len`} className="field-label">
                Length
              </label>
              <select id={`${id}-len`} className="select" value={o.length} onChange={(e) => setO((p) => ({ ...p, length: e.target.value }))}>
                <option value="any">Any length</option>
                <option value="short">Short (3–4 letters)</option>
                <option value="medium">Medium (5–6)</option>
                <option value="long">Long (7+)</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-o`} className="field-label">
                Origin
              </label>
              <select id={`${id}-o`} className="select" value={o.origin} onChange={(e) => setO((p) => ({ ...p, origin: e.target.value }))}>
                <option value="">All origins</option>
                {ORIGINS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-ord`} className="field-label">
                Order
              </label>
              <select id={`${id}-ord`} className="select" value={o.order} onChange={(e) => setO((p) => ({ ...p, order: e.target.value as "random" | "az" }))}>
                <option value="random">Random</option>
                <option value="az">A to Z</option>
              </select>
            </div>
          </div>
          <Checkbox checked={o.withMeaning} onChange={(v) => setO((p) => ({ ...p, withMeaning: v }))} label="Only names with a meaning listed" />
          <p className="text-sm text-ink-3" role="status">
            {copied ? `Copied “${copied}”.` : "Tap a name to copy it. Use the star to add it to your shortlist."}
          </p>
          {list.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((b) => {
                const on = o.shortlist.includes(b.name);
                return (
                  <li key={b.name} className="flex min-w-0 items-start gap-1 rounded-md border border-line p-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-sm px-1 text-left hover:bg-surface-2"
                      onClick={async () => {
                        if (await copyText(b.name)) {
                          setCopied(b.name);
                          announce(`Copied ${b.name}`);
                          completed("copy");
                        }
                      }}
                    >
                      <span className="block text-base font-semibold">{b.name}</span>
                      <span className="block text-sm text-ink-3">
                        {b.origin}
                        {b.meaning ? ` · ${b.meaning}` : ""}
                      </span>
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm btn-icon shrink-0" aria-pressed={on} aria-label={on ? `Remove ${b.name} from shortlist` : `Add ${b.name} to shortlist`} onClick={() => toggle(b.name)}>
                      <span aria-hidden="true" className={on ? "text-warning" : "text-ink-3"}>
                        {on ? "★" : "☆"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No names match these filters. Try another letter or origin.</p>
          )}
        </div>
      </Panel>
      <Panel
        title={`Shortlist (${o.shortlist.length})`}
        actions={
          <>
            <CopyButton text={o.shortlist.join("\n")} disabled={!o.shortlist.length} label="Copy" />
            <Button variant="ghost" icon="trash" disabled={!o.shortlist.length} onClick={() => setO((p) => ({ ...p, shortlist: [] }))}>
              Clear
            </Button>
          </>
        }
      >
        <div className="min-h-32 p-3 sm:p-4">
          {o.shortlist.length ? (
            <ol className="grid gap-1 text-base">
              {o.shortlist.map((n) => (
                <li key={n} className="flex items-center justify-between gap-2">
                  <span>{n}</span>
                  <Button variant="ghost" aria-label={`Remove ${n}`} icon="x" onClick={() => toggle(n)} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-3">Starred names appear here and stay in this browser for next time.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

export default function TestData({ toolId, config }: WidgetProps) {
  if (config?.mode === "names") return <FakeNames toolId={toolId} />;
  if (config?.mode === "boy-names") return <BoyNames toolId={toolId} />;
  return <TestCards toolId={toolId} />;
}
