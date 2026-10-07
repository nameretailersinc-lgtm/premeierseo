/* Escaping and tag builders for generated <head> code. */

export function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();

export function metaName(name: string, content: string): string {
  return `<meta name="${name}" content="${escAttr(clean(content))}">`;
}

export function metaProp(property: string, content: string): string {
  return `<meta property="${property}" content="${escAttr(clean(content))}">`;
}

export function isAbsoluteHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
