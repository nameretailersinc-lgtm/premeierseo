/*
 * Line-by-line comparison (longest common subsequence) for the text editor's Compare view.
 * The common start and end are skipped first, so typical edits to long texts stay fast.
 */

export interface DiffLine {
  type: "same" | "del" | "add";
  text: string;
  /** 1-based line number in the original (del/same) or the changed text (add/same). */
  a?: number;
  b?: number;
}

export const MAX_DIFF_CELLS = 4_000_000;

export function diffLines(original: string, changed: string): { lines: DiffLine[]; added: number; removed: number } | { error: string } {
  const A = original.replace(/\r\n?/g, "\n").split("\n");
  const B = changed.replace(/\r\n?/g, "\n").split("\n");
  let pre = 0;
  while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
  const a = A.slice(pre, A.length - suf);
  const b = B.slice(pre, B.length - suf);
  const n = a.length;
  const m = b.length;
  if ((n + 1) * (m + 1) > MAX_DIFF_CELLS) return { error: `Too many changed lines to compare (${n.toLocaleString("en-US")} × ${m.toLocaleString("en-US")}). Compare smaller sections.` };

  // LCS lengths from the end: L[i][j] = LCS of a[i..] and b[j..].
  const W = m + 1;
  const L = new Uint32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i * W + j] = a[i] === b[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);

  const out: DiffLine[] = [];
  for (let k = 0; k < pre; k++) out.push({ type: "same", text: A[k], a: k + 1, b: k + 1 });
  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push({ type: "same", text: a[i], a: pre + i + 1, b: pre + j + 1 });
      i++;
      j++;
    } else if (i < n && (j >= m || L[(i + 1) * W + j] >= L[i * W + j + 1])) {
      out.push({ type: "del", text: a[i], a: pre + i + 1 });
      removed++;
      i++;
    } else {
      out.push({ type: "add", text: b[j], b: pre + j + 1 });
      added++;
      j++;
    }
  }
  for (let k = 0; k < suf; k++) out.push({ type: "same", text: A[A.length - suf + k], a: A.length - suf + k + 1, b: B.length - suf + k + 1 });
  return { lines: out, added, removed };
}
