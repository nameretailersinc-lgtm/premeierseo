"use client";

import { useEffect, useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, Field, Panel, StatTile } from "../ui/primitives";
import { getJson, postJson, type ApiError, type IpGeo, type IpLookupResult, type MyIpResult } from "../lib/seo/api";
import { ApiErrorAlert } from "../lib/seo/ui";

function regionName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function GeoTable({ geo }: { geo: IpGeo }) {
  const rows: [string, string | null][] = [
    ["Country", geo.country ?? regionName(geo.countryCode)],
    ["Continent", geo.continent],
    ["Network (ASN)", geo.asn],
    ["Network owner", geo.asName],
    ["Owner's domain", geo.asDomain],
  ];
  return (
    <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="break-words">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const looksLikeIp = (s: string) => IPV4.test(s) || (s.includes(":") && /^[0-9a-f:.]+$/i.test(s));

export default function IpLookup() {
  const id = useId();
  const { used, announce, completed, error: track } = useTool();
  const [mine, setMine] = useState<MyIpResult | null>(null);
  const [mineErr, setMineErr] = useState<ApiError | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<IpLookupResult | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [inputErr, setInputErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<MyIpResult>("/api/ip").then((r) => {
      if (cancelled) return;
      if (r.ok) setMine(r.data);
      else setMineErr(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = async (ip: string) => {
    setBusy(true);
    setErr(null);
    const r = await postJson<IpLookupResult>("/api/ip", { ip });
    setBusy(false);
    if (r.ok) {
      setRes(r.data);
      completed("lookup");
      announce(r.data.geo ? `${ip}: ${r.data.geo.country ?? "location found"}` : (r.data.message ?? "No location data."));
    } else {
      setRes(null);
      setErr(r.error);
      track(r.error.code, "lookup");
      announce(r.error.message);
    }
  };

  const edge = mine?.edge;
  const edgeText = edge && (edge.city || edge.region || edge.country) ? [edge.city, edge.region, regionName(edge.country)].filter(Boolean).join(", ") : null;

  return (
    <div className="grid gap-4">
      <Panel title="Your public IP address" actions={mine?.ip ? <CopyButton text={mine.ip} label="Copy IP" /> : null}>
        <div className="grid min-h-32 gap-3 p-3 sm:p-4" aria-live="polite">
          {!mine && !mineErr && <p className="text-sm text-ink-3">Detecting…</p>}
          {mineErr && <ApiErrorAlert error={mineErr} />}
          {mine && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatTile label="IP address" value={<span className="font-mono text-xl break-all">{mine.ip ?? "Unknown"}</span>} sub={mine.version ? `IPv${mine.version}` : undefined} />
                <StatTile label="Approximate location" value={<span className="text-base">{mine.geo?.country ?? edgeText ?? "Not available"}</span>} sub={edgeText && mine.geo ? `Hosting edge: ${edgeText}` : edgeText ? "From our hosting provider's edge network" : undefined} />
                <StatTile label="Network" value={<span className="text-base">{mine.geo?.asName ?? "—"}</span>} sub={mine.geo?.asn ?? undefined} />
              </div>
              {mine.geo && <GeoTable geo={mine.geo} />}
              {!mine.providerConfigured && <p className="text-sm text-ink-3">Network and country lookups aren&apos;t configured on this server right now, so only the details our hosting edge provides are shown.</p>}
              {mine.ip && mine.ip.includes(":") && <p className="text-sm text-ink-3">You&apos;re connected over IPv6. Many networks also have an IPv4 address that sites without IPv6 will see.</p>}
            </>
          )}
        </div>
      </Panel>
      <Panel title="Look up an IP address">
        <form
          className="grid gap-3 p-3 sm:p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const ip = q.trim();
            if (!looksLikeIp(ip)) {
              setInputErr("Enter an IPv4 address such as 8.8.8.8 or an IPv6 address such as 2001:4860:4860::8888.");
              return;
            }
            setInputErr(null);
            used("type");
            void lookup(ip);
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label="IP address" htmlFor={`${id}-ip`} error={inputErr}>
              <input id={`${id}-ip`} className="input mono" autoCapitalize="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="8.8.8.8" aria-invalid={inputErr ? true : undefined} />
            </Field>
            <Button type="submit" variant="primary" size="md" icon="search" busy={busy} disabled={busy}>
              {busy ? "Looking up…" : "Look up IP"}
            </Button>
          </div>
          {mine?.ip && (
            <div>
              <Button variant="ghost" onClick={() => (setQ(mine.ip!), void lookup(mine.ip!))}>
                Use my IP
              </Button>
            </div>
          )}
        </form>
        <div className="min-h-16 px-3 pb-3 sm:px-4 sm:pb-4" aria-live="polite">
          {err && <ApiErrorAlert error={err} />}
          {res && res.private && <Alert tone="info" title={`${res.ip} is a private or reserved address`}>{res.message}</Alert>}
          {res && !res.private && res.geo && (
            <div className="grid gap-2">
              <p className="font-mono text-sm">{res.ip}</p>
              <GeoTable geo={res.geo} />
              <p className="text-xs text-ink-3">Data from {res.geo.provider}. Locations are approximate and describe the network, not a person or street address.</p>
            </div>
          )}
          {res && !res.private && !res.geo && <Alert tone="warning">{res.message ?? "No location data is available for this address."}</Alert>}
        </div>
      </Panel>
    </div>
  );
}
