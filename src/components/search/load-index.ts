import type { SearchIndex } from "@/lib/search";

let indexPromise: Promise<SearchIndex> | null = null;

/** Fetches the static search index once per page session (on first search intent). */
export function loadIndex(): Promise<SearchIndex> {
  indexPromise ||= fetch("/search-index.json")
    .then((r) => {
      if (!r.ok) throw new Error("index");
      return r.json() as Promise<SearchIndex>;
    })
    .catch((e) => {
      indexPromise = null;
      throw e;
    });
  return indexPromise;
}
