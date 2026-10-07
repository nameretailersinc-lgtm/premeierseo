/*
 * Lorem ipsum generator. Words come from the standard lorem ipsum passage (itself a scrambled
 * excerpt of Cicero's De finibus bonorum et malorum, 45 BC). Placeholder text is not security-
 * sensitive, but we still use the shared crypto helpers so there is one randomness source.
 */
import { randomBelow, randomInt } from "./random";

export const LOREM_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud " +
  "exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur " +
  "sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium " +
  "doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo ipsam quia voluptas " +
  "aspernatur aut odit fugit consequuntur magni dolores eos ratione sequi nesciunt neque porro quisquam dolorem adipisci numquam eius modi tempora incidunt magnam " +
  "quaerat minima nostrum exercitationem ullam corporis suscipit laboriosam aliquid commodi consequatur autem vel eum iure quam nihil molestiae illum"
).split(" ");

export type LoremUnit = "paragraphs" | "sentences" | "words" | "list";

function word() {
  return WORDS[randomBelow(WORDS.length)];
}

function sentence(): string {
  const n = randomInt(6, 14);
  const w = Array.from({ length: n }, word);
  // An occasional comma after the 3rd–5th word reads more naturally.
  if (n > 8 && randomBelow(2)) w[randomInt(2, 4)] += ",";
  const s = w.join(" ");
  return s[0].toUpperCase() + s.slice(1) + ".";
}

function paragraph(): string {
  return Array.from({ length: randomInt(4, 7) }, sentence).join(" ");
}

export interface LoremOptions {
  unit: LoremUnit;
  count: number;
  startWithLorem: boolean;
  html: boolean;
}

export function lorem({ unit, count, startWithLorem, html }: LoremOptions): string {
  const n = Math.max(1, Math.min(count, unit === "words" ? 10_000 : 500));
  if (unit === "words") {
    const opening = LOREM_OPENING.replace(/[.,]/g, "").toLowerCase().split(" ");
    const w = Array.from({ length: n }, (_, i) => (startWithLorem && i < opening.length ? opening[i] : word()));
    let s = w.join(" ");
    s = s[0].toUpperCase() + s.slice(1) + ".";
    return html ? `<p>${s}</p>` : s;
  }
  if (unit === "sentences") {
    const s = Array.from({ length: n }, (_, i) => (i === 0 && startWithLorem ? LOREM_OPENING : sentence())).join(" ");
    return html ? `<p>${s}</p>` : s;
  }
  if (unit === "list") {
    const items = Array.from({ length: n }, (_, i) => (i === 0 && startWithLorem ? "Lorem ipsum dolor sit amet" : sentence().replace(/\.$/, "").split(" ").slice(0, randomInt(3, 7)).join(" ").replace(/,$/, "")));
    return html ? `<ul>\n${items.map((x) => `  <li>${x}</li>`).join("\n")}\n</ul>` : items.map((x) => `- ${x}`).join("\n");
  }
  const paras = Array.from({ length: n }, (_, i) => (i === 0 && startWithLorem ? LOREM_OPENING + " " + paragraph() : paragraph()));
  return html ? paras.map((p) => `<p>${p}</p>`).join("\n") : paras.join("\n\n");
}
