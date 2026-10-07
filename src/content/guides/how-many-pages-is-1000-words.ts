import { defineGuide, toolLink as t } from "./shared";

export const howManyPagesIs1000Words = defineGuide({
  slug: "how-many-pages-is-1000-words",
  title: "How Many Pages Is 1,000 Words? Words-to-Pages Table",
  h1: "How many pages is 1,000 words?",
  metaDescription:
    "Page counts for 500 to 10,000 words at single and double spacing, with the font and margin assumptions behind them, plus reading and speaking times.",
  summary:
    "About **2 pages single-spaced or 4 pages double-spaced**, using the usual rule of 500 and 250 words per page (12 pt font, 1-inch margins). Our layout measurements give slightly fewer pages for typical essay prose: 1.8 single-spaced or 3.6 double-spaced in Times New Roman, and 2.0 or 3.9 in Arial. Read silently at an average pace, 1,000 words take about 4 minutes.",
  cluster: "Writing",
  tools: ["word-counter", "reading-time-calculator", "essay-checker", "character-counter"],
  body: [
    {
      heading: "Words-to-pages table",
      body: `Assumptions: US Letter paper, 1-inch margins, 12 pt font, half-inch first-line indents, no extra space between paragraphs, no headings or title block. Pages are rounded to one decimal place.

| Words | Times New Roman, single | Times New Roman, double | Arial, single | Arial, double |
|---|---|---|---|---|
| 500 | 0.9 | 1.8 | 1.0 | 2.0 |
| 750 | 1.4 | 2.7 | 1.5 | 2.9 |
| 1,000 | 1.8 | 3.6 | 2.0 | 3.9 |
| 1,500 | 2.7 | 5.4 | 2.9 | 5.9 |
| 2,000 | 3.6 | 7.2 | 3.9 | 7.8 |
| 2,500 | 4.5 | 9.0 | 4.9 | 9.8 |
| 3,000 | 5.4 | 10.8 | 5.9 | 11.7 |
| 4,000 | 7.2 | 14.4 | 7.8 | 15.6 |
| 5,000 | 9.0 | 18.1 | 9.8 | 19.5 |
| 7,500 | 13.5 | 27.1 | 14.7 | 29.3 |
| 10,000 | 18.0 | 36.1 | 19.6 | 39.1 |

The working rates behind the table are about 555 words per single-spaced page and 277 per double-spaced page in Times New Roman, and 511 and 256 in Arial. Arial is wider, so the familiar 500/250 rule is close to Arial and slightly pessimistic for Times New Roman.

To use the table for your own text, paste it into the ${t("word-counter", "word counter")} for an exact count, then divide by the rate for your font and spacing.`,
    },
    {
      heading: "How we measured words per page",
      body: `Page counts depend on real text wrapping onto real lines, so we simulated it instead of quoting the rule of thumb.

1. **Font widths.** We used the standard Adobe metrics for Times Roman and Helvetica, which match Times New Roman and Arial closely, and measured every word at 12 pt.
2. **Lines.** Words were wrapped greedily into a 6.5-inch line. Single spacing is 1.15 times the font size (13.8 pt), the built-in line height of both fonts, giving 46 lines on a Letter page with 1-inch margins; double spacing gives 23.
3. **Text.** The table uses about 5,300 words of modern expository prose from our own editorial documents: 5.3 letters per word and about 90 words per paragraph, close to typical academic and business writing.

As a check, we ran the same layout on Charles Darwin's *The Voyage of the Beagle* (Project Gutenberg), whose words average 4.6 letters and whose paragraphs are long. It fitted about 734 words per single-spaced page in Times New Roman, a third more than the essay prose. Short words and long paragraphs both pack more words onto a page, so treat any words-per-page figure as a range rather than a constant.`,
    },
    {
      heading: "What changes the page count",
      body: `In rough order of impact:

- **Line spacing.** Double spacing halves the words per page. 1.5 spacing gives about two-thirds of the single-spaced figure.
- **Font size.** In our measurements, Arial at 11 pt fitted about 612 words per single-spaced page against 511 at 12 pt, a 20% difference.
- **Font.** Times New Roman fits about 9% more words than Arial at the same size. A monospaced font such as Courier fits far fewer: about 386 words per single-spaced page.
- **Paper and margins.** A4 is narrower but taller than Letter; with 1-inch margins it held about 5% more words (582 per single-spaced page in Times New Roman). Wider margins reduce the count proportionally.
- **Paragraphs and dialogue.** Every paragraph ends with a partly empty line. Dialogue-heavy fiction or short web-style paragraphs lose more space than long academic paragraphs.
- **Everything else.** Headings, a title block, block quotes, tables, footnotes and a reference list all take space without adding to most assignments' word counts.

If a teacher sets a page count rather than a word count, the font, size, spacing and margins in their instructions are what make the target fair, so follow them exactly.`,
    },
    {
      heading: "Handwritten pages",
      body: `Handwriting varies too much for a reliable table: letter size, spacing and the ruling of the paper all change the result. Measure your own instead:

1. Write a full page in your normal handwriting.
2. Count the words on five lines and divide by five to get words per line.
3. Multiply by the number of lines you used.

For example, if five lines hold 52 words (10.4 per line) and your page has 30 ruled lines, one page holds about 310 words, so 1,000 words would take a little over three pages. That example is arithmetic, not a measured average; your figure is the one that matters for an exam answer.`,
    },
    {
      heading: "Reading and speaking time",
      body: `Marc Brysbaert's 2019 review of 190 reading studies put the average silent reading rate for adults reading non-fiction in English at 238 words per minute, 260 for fiction, and 183 words per minute for reading aloud. For speeches and presentations, 130–150 words per minute is a common planning range that leaves room for pauses.

| Words | Silent reading (238 wpm) | Reading aloud (183 wpm) | Speech (130–150 wpm) |
|---|---|---|---|
| 500 | 2.1 min | 2.7 min | 3.3–3.8 min |
| 1,000 | 4.2 min | 5.5 min | 6.7–7.7 min |
| 1,500 | 6.3 min | 8.2 min | 10.0–11.5 min |
| 2,000 | 8.4 min | 10.9 min | 13.3–15.4 min |
| 5,000 | 21.0 min | 27.3 min | 33.3–38.5 min |

So a 1,000-word speech runs about 7 minutes at a relaxed pace. Technical material, readers working in a second language and slides that need explaining all push the times up. The ${t("reading-time-calculator", "reading time calculator")} lets you change the rate and works backwards from a time limit to a word target.`,
    },
    {
      heading: "Word counts for common assignments",
      body: `Converting page targets into words with the measured rates above:

| Target | Words, double-spaced | Words, single-spaced |
|---|---|---|
| 1 page | about 255–280 | about 510–555 |
| 2 pages | about 510–555 | about 1,020–1,110 |
| 5 pages | about 1,280–1,385 | about 2,555–2,775 |
| 10 pages | about 2,560–2,770 | about 5,110–5,550 |

The ranges run from Arial (lower) to Times New Roman (higher). A 5-page double-spaced essay is therefore roughly 1,250–1,400 words.

Some applications set limits in words or characters rather than pages:

- **Common App personal essay:** up to 650 words. Write to the limit you are given, not to the page count it would fill.
- **UCAS personal statement (2026 entry onwards):** three questions sharing 4,000 characters including spaces, with at least 350 characters per answer. At 6 to 7 characters per word including the space and punctuation, 4,000 characters is roughly 570–670 words. Check the real figure with a ${t("character-counter", "character counter")}, since a character limit is not a word limit.

For coursework, the brief decides what counts: many instructors exclude the title, headings, references and appendices but include in-text citations and quotations. Before submitting, an ${t("essay-checker", "essay checker")} can catch spelling and grammar slips that a word count won't.`,
    },
  ],
  sources: [
    { label: "Brysbaert, M. (2019). How many words do we read per minute? Journal of Memory and Language, 109", url: "https://doi.org/10.1016/j.jml.2019.104047" },
    { label: "pdf-lib: standard 14 font metrics used for the layout simulation", url: "https://pdf-lib.js.org/" },
    { label: "Project Gutenberg: The Voyage of the Beagle by Charles Darwin (comparison text)", url: "https://www.gutenberg.org/ebooks/944" },
    { label: "Common App: first-year essay prompts", url: "https://www.commonapp.org/apply/essay-prompts/" },
    { label: "UCAS: How to write your personal statement, 2026 entry onwards", url: "https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement/how-to-write-your-personal-statement-for-2026-entry-onwards" },
  ],
});
