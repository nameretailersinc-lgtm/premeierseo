"use client";

import { useEffect, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { CopyButton, Panel, StatTile } from "../ui/primitives";

/*
 * Reads browser details locally: the user-agent string, User-Agent Client Hints (Chromium browsers) and
 * feature/setting checks. Nothing is sent anywhere. We don't claim "up to date" because we keep no version list.
 */

interface UaData {
  brands?: { brand: string; version: string }[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
}

export interface ParsedUa {
  browser: string;
  version: string;
  engine: string;
  os: string;
  device: string;
}

export function parseUserAgent(ua: string): ParsedUa {
  const m = (re: RegExp) => re.exec(ua)?.[1] ?? "";
  const RULES: [RegExp, string, RegExp][] = [
    [/Edg(e|A|iOS)?\//, "Microsoft Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
    [/OPR\/|Opera/, "Opera", /(?:OPR|Version)\/([\d.]+)/],
    [/SamsungBrowser\//, "Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    [/Firefox\/|FxiOS\//, "Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    [/CriOS\//, "Chrome (iOS)", /CriOS\/([\d.]+)/],
    [/Chromium\//, "Chromium", /Chromium\/([\d.]+)/],
    [/Chrome\//, "Chrome", /Chrome\/([\d.]+)/],
    [/Version\/[\d.]+.*Safari\//, "Safari", /Version\/([\d.]+)/],
  ];
  const hit = RULES.find(([test]) => test.test(ua));
  const browser = hit ? hit[1] : "Unknown browser";
  const version = hit ? m(hit[2]) : "";
  const engine = /Gecko\/\d/.test(ua) && /Firefox/.test(ua) ? "Gecko" : /iPhone|iPad|iPod/.test(ua) ? "WebKit (all iOS browsers use WebKit)" : /AppleWebKit/.test(ua) && /Chrome|Chromium|Edg|OPR/.test(ua) ? "Blink" : /AppleWebKit/.test(ua) ? "WebKit" : "Unknown";
  let os = "Unknown";
  if (/Windows NT 10\.0/.test(ua)) os = "Windows 10 or 11";
  else if (/Windows NT/.test(ua)) os = `Windows (NT ${m(/Windows NT ([\d.]+)/)})`;
  else if (/iPhone|iPad|iPod/.test(ua)) os = `iOS / iPadOS ${m(/OS ([\d_]+)/).replace(/_/g, ".")}`;
  else if (/Mac OS X/.test(ua)) os = `macOS ${m(/Mac OS X ([\d_.]+)/).replace(/_/g, ".")}`;
  else if (/Android/.test(ua)) os = `Android ${m(/Android ([\d.]+)/)}`;
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";
  const device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "Tablet" : /Mobi|iPhone|iPod/.test(ua) ? "Phone" : "Desktop or laptop";
  return { browser, version, engine, os: os.trim(), device };
}

interface Info {
  ua: string;
  parsed: ParsedUa;
  hints: Record<string, string> | null;
  rows: [string, string][];
}

function collect(): Info {
  const n = navigator as Navigator & { userAgentData?: UaData; deviceMemory?: number; globalPrivacyControl?: boolean };
  const ua = n.userAgent;
  const mq = (q: string) => window.matchMedia(q).matches;
  const rows: [string, string][] = [
    ["Screen", `${screen.width} × ${screen.height} px (${window.devicePixelRatio}× pixel ratio)`],
    ["Browser window", `${window.innerWidth} × ${window.innerHeight} px`],
    ["Color scheme", mq("(prefers-color-scheme: dark)") ? "Dark" : "Light"],
    ["Reduced motion", mq("(prefers-reduced-motion: reduce)") ? "Requested" : "Not requested"],
    ["Touch screen", n.maxTouchPoints > 0 ? `Yes (${n.maxTouchPoints} touch points)` : "No"],
    ["Languages", (n.languages ?? [n.language]).join(", ")],
    ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["Cookies", n.cookieEnabled ? "Enabled" : "Disabled"],
    ["JavaScript", "Enabled (this page uses it to read these details)"],
    ["Online", n.onLine ? "Yes" : "No"],
    ["CPU threads", n.hardwareConcurrency ? String(n.hardwareConcurrency) : "Not reported"],
    ["Device memory", n.deviceMemory ? `About ${n.deviceMemory} GB (rounded by the browser)` : "Not reported"],
    ["Do Not Track", n.doNotTrack === "1" ? "On" : "Off or not supported"],
    ["Global Privacy Control", n.globalPrivacyControl ? "On" : "Off or not supported"],
  ];
  return { ua, parsed: parseUserAgent(ua), hints: null, rows };
}

export default function BrowserInfo() {
  const { completed } = useTool();
  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => {
    let cancelled = false;
    const base = collect();
    const uad = (navigator as Navigator & { userAgentData?: UaData }).userAgentData;
    const apply = (hints: Record<string, string> | null) => {
      if (cancelled) return;
      setInfo({ ...base, hints });
      completed("view");
    };
    if (uad?.getHighEntropyValues) {
      uad
        .getHighEntropyValues(["platformVersion", "fullVersionList", "model", "architecture", "bitness"])
        .then((h) => {
          const full = (h.fullVersionList as { brand: string; version: string }[] | undefined)?.filter((b) => !/Not.?A.?Brand/i.test(b.brand));
          apply({
            Brands: (full ?? uad.brands ?? []).map((b) => `${b.brand} ${b.version}`).join(", "),
            Platform: [uad.platform, h.platformVersion].filter(Boolean).join(" "),
            Architecture: [h.architecture, h.bitness ? `${h.bitness}-bit` : ""].filter(Boolean).join(", "),
            Mobile: uad.mobile ? "Yes" : "No",
            Model: (h.model as string) || "—",
          });
        })
        .catch(() => apply(null));
    } else Promise.resolve().then(() => apply(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = info?.parsed;
  const report = info
    ? [
        `Browser: ${p!.browser} ${p!.version}`,
        `Engine: ${p!.engine}`,
        `Operating system: ${p!.os}`,
        `Device: ${p!.device}`,
        ...(info.hints ? Object.entries(info.hints).map(([k, v]) => `Client hints ${k}: ${v}`) : []),
        ...info.rows.map(([k, v]) => `${k}: ${v}`),
        `User agent: ${info.ua}`,
      ].join("\n")
    : "";
  return (
    <div className="grid gap-4">
      <div className="grid min-h-28 grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Browser" value={<span className="text-xl">{p ? `${p.browser} ${p.version.split(".")[0]}` : "Detecting…"}</span>} sub={p?.version ? `Full version ${p.version}` : undefined} />
        <StatTile label="Operating system" value={<span className="text-xl">{p?.os ?? "Detecting…"}</span>} />
        <StatTile label="Device type" value={<span className="text-xl">{p?.device ?? "Detecting…"}</span>} />
        <StatTile label="Rendering engine" value={<span className="text-xl">{p?.engine ?? "Detecting…"}</span>} />
      </div>
      <Panel title="User-agent string" actions={<CopyButton text={info?.ua ?? ""} disabled={!info} label="Copy user agent" />}>
        <p className="min-h-12 p-3 font-mono text-sm break-all sm:p-4">{info?.ua ?? "Detecting…"}</p>
      </Panel>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title="Settings and screen" actions={<CopyButton text={report} disabled={!info} label="Copy details for support" />}>
          <dl className="grid min-h-48 grid-cols-[10rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 p-3 text-sm sm:p-4">
            {info?.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-3">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="User-Agent Client Hints">
          <div className="min-h-24 p-3 text-sm sm:p-4">
            {info?.hints ? (
              <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                {Object.entries(info.hints).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-ink-3">{info ? "Your browser doesn't support Client Hints (Firefox and Safari don't), so the details above come from the user-agent string." : "Detecting…"}</p>
            )}
          </div>
        </Panel>
      </div>
      <p className="text-sm text-ink-3">Everything here is read by your browser on this page. Nothing is sent to our server.</p>
    </div>
  );
}
