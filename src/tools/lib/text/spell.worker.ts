/*
 * Spelling worker: loads the Hunspell en-US dictionary into nspell off the main thread.
 * Messages: { id, op: "init" | "check" | "suggest", ... } → { id, ok, result | error }.
 */
import { checkWords, loadSpeller, suggestWord } from "./spell-core";

type Req = { id: number; op: "init" } | { id: number; op: "check"; words: string[]; british: boolean } | { id: number; op: "suggest"; word: string };

interface WorkerScope {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage: (msg: unknown) => void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = async (e: MessageEvent<Req>) => {
  const msg = e.data;
  try {
    if (msg.op === "init") {
      await loadSpeller();
      scope.postMessage({ id: msg.id, ok: true, result: true });
    } else if (msg.op === "check") {
      scope.postMessage({ id: msg.id, ok: true, result: await checkWords(msg.words, msg.british) });
    } else if (msg.op === "suggest") {
      scope.postMessage({ id: msg.id, ok: true, result: await suggestWord(msg.word) });
    }
  } catch (err) {
    scope.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
