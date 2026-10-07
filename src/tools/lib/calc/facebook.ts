/*
 * Find numeric Facebook IDs in text the user pastes: profile/page URLs that contain the ID,
 * app links (fb://), and common fields in a page's HTML source. Nothing is fetched: a vanity
 * URL such as facebook.com/nasa doesn't contain the ID, so it can't be resolved offline.
 */

export interface FbMatch {
  id: string;
  /** What kind of thing the pattern usually identifies. */
  kind: "profile" | "page" | "group" | "post owner" | "page or profile";
  source: string;
  count: number;
}

interface Pattern {
  re: RegExp;
  kind: FbMatch["kind"];
  source: string;
}

const PATTERNS: Pattern[] = [
  { re: /facebook\.com\/profile\.php\?(?:[^"'\s<>]*&)?id=(\d{5,20})/gi, kind: "page or profile", source: "profile.php?id= URL" },
  { re: /facebook\.com\/people\/[^/\s"'<>]+\/(\d{5,20})/gi, kind: "profile", source: "/people/name/ID URL" },
  { re: /facebook\.com\/pages\/[^/\s"'<>]+\/(\d{5,20})/gi, kind: "page", source: "/pages/name/ID URL" },
  { re: /facebook\.com\/groups\/(\d{5,20})/gi, kind: "group", source: "/groups/ID URL" },
  { re: /facebook\.com\/(?:permalink|story)\.php\?(?:[^"'\s<>]*&)?id=(\d{5,20})/gi, kind: "post owner", source: "post URL (id=)" },
  { re: /facebook\.com\/[A-Za-z0-9.-]+?-(\d{8,20})(?=[/?#\s"'<>]|$)/gi, kind: "page", source: "name-ID page URL" },
  { re: /facebook\.com\/(\d{5,20})(?=[/?#\s"'<>]|$)/gi, kind: "page or profile", source: "facebook.com/ID URL" },
  { re: /fb:\/\/(?:profile|page)\/\??(?:id=)?(\d{5,20})/gi, kind: "page or profile", source: "fb:// app link" },
  { re: /"pageID"\s*:\s*"?(\d{5,20})/g, kind: "page", source: "\"pageID\" in page source" },
  { re: /"page_id"\s*:\s*"?(\d{5,20})/g, kind: "page", source: "\"page_id\" in page source" },
  { re: /"profile_id"\s*:\s*"?(\d{5,20})/g, kind: "page or profile", source: "\"profile_id\" in page source" },
  { re: /"entity_id"\s*:\s*"?(\d{5,20})/g, kind: "page or profile", source: "\"entity_id\" in page source" },
  { re: /"owning_profile_id"\s*:\s*"?(\d{5,20})/g, kind: "page or profile", source: "\"owning_profile_id\" in page source" },
  { re: /"delegate_page_id"\s*:\s*"?(\d{5,20})/g, kind: "page", source: "\"delegate_page_id\" in page source" },
];

/** IDs that identify the logged-in viewer, not the page being viewed. */
const VIEWER = /"(?:USER_ID|ACCOUNT_ID|actorID|viewerID)"\s*:\s*"?(\d{5,20})/g;

export function findFacebookIds(text: string): { matches: FbMatch[]; viewer: string[]; vanity: string | null } {
  const viewer = new Set<string>();
  for (const m of text.matchAll(VIEWER)) if (m[1] !== "0") viewer.add(m[1]);
  const map = new Map<string, FbMatch>();
  for (const p of PATTERNS) {
    for (const m of text.matchAll(p.re)) {
      const id = m[1];
      if (viewer.has(id) || id === "0") continue;
      const key = id;
      const prev = map.get(key);
      if (prev) {
        prev.count++;
        if (!prev.source.includes(p.source)) prev.source += `; ${p.source}`;
        if (prev.kind === "page or profile" && p.kind !== "page or profile") prev.kind = p.kind;
      } else map.set(key, { id, kind: p.kind, source: p.source, count: 1 });
    }
  }
  const matches = [...map.values()].sort((a, b) => b.count - a.count);
  let vanity: string | null = null;
  if (!matches.length) {
    const v = /facebook\.com\/(?!profile\.php|people\/|pages\/|groups\/|share\/)([A-Za-z0-9.]{3,50})\/?(?:[?#]|$|\s)/i.exec(text);
    if (v) vanity = v[1];
  }
  return { matches, viewer: [...viewer], vanity };
}
