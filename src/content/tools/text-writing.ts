import type { ToolDef } from "@/lib/types";

/*
 * Writing-check tools (spell checker, proofreader, punctuation, essay checker, summarizer, rewriter).
 * One engine (widget "writing-check") with a mode per page. Rules are listed on each page; examples
 * are real outputs of src/tools/lib/text/{proof,prose,summarize,plain-english,spell-core}.ts run on
 * src/tools/lib/text/writing-samples.ts. No accuracy percentages, no AI claims.
 */

const SPELL_SOURCES = [
  { label: "Hunspell spell checker", url: "https://hunspell.github.io/" },
  { label: "nspell: Hunspell-compatible spell checker in JavaScript", url: "https://github.com/wooorm/nspell" },
  { label: "dictionary-en: English (US) Hunspell dictionary from SCOWL", url: "https://github.com/wooorm/dictionaries/tree/main/dictionaries/en" },
  { label: "SCOWL (Spell Checker Oriented Word Lists)", url: "http://wordlist.aspell.net/" },
];

const READABILITY_SOURCES = [
  { label: "Flesch, R. (1948). A new readability yardstick. Journal of Applied Psychology, 32(3), 221–233", url: "https://doi.org/10.1037/h0057532" },
  {
    label: "Kincaid, J. P., Fishburne, R. P., Rogers, R. L. & Chissom, B. S. (1975). Derivation of new readability formulas for Navy enlisted personnel. Research Branch Report 8-75",
    url: "https://apps.dtic.mil/sti/citations/ADA006655",
  },
];

export const WRITING_TOOLS: ToolDef[] = [
  {
    id: "spell-checker",
    path: "/spell-checker/",
    name: "Spell Checker",
    h1: "Spell Checker",
    title: "Spell Checker – Check Spelling Online With Suggestions",
    metaDescription:
      "Paste text to find misspelled words and get suggestions from a US English Hunspell dictionary, with an option to accept British spellings. Runs in your browser.",
    summary:
      "Find misspelled words in any text and fix them with one click, using a full Hunspell US English dictionary that runs in your browser. Add your own words, or accept British spellings such as colour.",
    category: "text-tools",
    subgroup: "writing",
    card: "Find misspelled words and fix them with dictionary suggestions.",
    archetype: "analyzer",
    widget: "writing-check",
    config: { mode: "spelling" },
    aliases: [
      "spelling checker",
      "check spelling",
      "spell check",
      "spelling",
      "spelling corrector",
      "spellcheck online",
      "spell cheker",
      "spelling check online",
      "misspelled words checker",
      "correct spelling",
    ],
    keywords: ["spelling", "typo", "dictionary", "hunspell", "british", "american"],
    processing: "browser",
    limits: [
      "One dictionary: US English. British spellings can be accepted, but there is no separate UK word list.",
      "Checks each word on its own, so correctly spelled wrong words (their/there) are not caught.",
    ],
    steps: [
      "Paste or type your text into **Your text**.",
      "Tick **Accept British spellings** if you write colour and organise, and keep **Ignore words in CAPITALS** for acronyms.",
      "Press **Check spelling**. The dictionary downloads once (about 550 KB); results then update as you edit.",
      "Under **Results**, press a suggestion to replace the word everywhere, **Ignore** to skip it, or **Add to my dictionary** to accept it from now on.",
    ],
    example: {
      title: "The built-in example",
      input: "Ths paragraph has a few mispelled words. We will recieve the samples tommorow and seperate them definately before the meeting.",
      output: "Ths → Ohs, Tbs, The, Thy, Hts, T's\nmispelled → misspelled, dispelled\nrecieve → receive, relieve\ntommorow → tomorrow\nseperate → separate\ndefinately → definitely",
      note: "Real output. Suggestions come from Hunspell's rules (similar letters, keyboard neighbors, swapped letters) and aren't ranked by meaning, which is why “This” isn't offered for “Ths”.",
    },
    sections: [
      {
        heading: "How the spell checker finds mistakes",
        body: "Each word is looked up in the **Hunspell en-US dictionary** (the same format LibreOffice, Firefox and Chrome use), read by the open-source nspell library. Hunspell stores about 49,000 base words plus rules for their forms, so “organize”, “organizes”, “reorganized” and “organizer's” are all recognized without listing each one. The check runs in a Web Worker, a background thread in your browser, so long documents don't freeze the page, and your text is never uploaded. URLs, email addresses, code in backticks, hashtags and words containing digits are skipped. A word not in the dictionary is reported with up to six suggestions; pressing one replaces every occurrence.",
      },
      {
        heading: "US and British spelling",
        body: "The dictionary is American English. Tick **Accept British spellings** and a word that isn't in it is accepted when a standard British-to-American change turns it into a dictionary word:\n\n| British | American | Rule |\n|---|---|---|\n| colour, favourite | color, favorite | -our → -or |\n| organise, realisation | organize, realization | -ise → -ize |\n| analyse | analyze | -yse → -yze |\n| centre, fibre | center, fiber | -tre/-bre → -ter/-ber |\n| catalogue | catalog | -ogue → -og |\n| defence, licence | defense, license | -ence → -ense |\n| travelled, modelling | traveled, modeling | doubled l |\n\nThis is a rule check, not a UK dictionary: words such as “manoeuvre” that need two unusual changes are still flagged. Suggestions are always American spellings.",
      },
      {
        heading: "Suggestions and your personal word list",
        body: "Names, brands, technical terms and new words are often missing from any dictionary. **Ignore** hides a word until you leave the page. **Add to my dictionary** saves it in your browser so it is never flagged again on this device, in this tool, the [online proofreader](/online-proofreader/) and the [essay checker](/essay-checker/). Open **My dictionary** to see or remove saved words. Capitalized words are accepted only if the dictionary has them capitalized, so “london” is flagged but “London” is not.",
      },
      {
        heading: "What a spell checker can't catch",
        body: "A spell checker looks at one word at a time. It can't tell that a correctly spelled word is the wrong one: “their” for “there”, “form” for “from”, “affect” for “effect”, “it's” for “its”, or a missing word. It also accepts any real word that a typo happens to produce (“mange” for “manage”). Read the text once more after the check, ideally aloud or after a break, and use the proofreader for the common confusions it has rules for.",
      },
      {
        heading: "Spelling vs grammar vs punctuation checks",
        body: "- **This spell checker**: words not in the dictionary.\n- **[Punctuation checker](/punctuation-checker/)**: spacing, commas, apostrophes, quotes, brackets and capitals, with each rule explained.\n- **[Online proofreader](/online-proofreader/)**: spelling plus grammar rules (a/an, its/it's, could of, then/than, repeated words), punctuation and style hints in one pass.\n- **[Essay checker](/essay-checker/)**: length, readability and structure rather than errors.\n\nFor word and character totals, use the [word counter](/word-counter/).",
      },
    ],
    faq: [
      {
        q: "Does it check grammar too?",
        a: "No, only spelling. The online proofreader adds grammar and punctuation rules and style hints to the same spelling check.",
      },
      {
        q: "Can it tell 'their' from 'there'?",
        a: "No. Both are correctly spelled, so a spell checker accepts both. The proofreader flags a few clear patterns, such as “their is”, but not every case.",
      },
      {
        q: "Is my text uploaded?",
        a: "No. The dictionary file is downloaded from this site once, and checking happens in your browser. Your personal word list is stored only on your device.",
      },
      {
        q: "Which dictionaries are used?",
        a: "The English (US) Hunspell dictionary from the dictionary-en package, which is built from SCOWL word lists, read with nspell. British spellings are accepted by rule when you tick the option.",
      },
    ],
    sources: SPELL_SOURCES,
    related: ["online-proofreader", "punctuation-checker", "essay-checker", "word-counter", "online-notepad"],
    links: [
      { href: "/online-proofreader/", anchor: "online proofreader" },
      { href: "/punctuation-checker/", anchor: "punctuation checker" },
      { href: "/essay-checker/", anchor: "essay checker" },
      { href: "/word-counter/", anchor: "word counter" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Hunspell en-US dictionary, checked in a background thread",
      "Up to six suggestions per word; replace every occurrence in one click",
      "Personal dictionary saved on your device",
      "Optional acceptance of British spellings by rule",
    ],
    indexable: true,
    updated: "2026-09-30",
    priority: 1,
  },
  {
    id: "online-proofreader",
    path: "/online-proofreader/",
    name: "Online Proofreader",
    h1: "Online Proofreader",
    title: "Online Proofreader – Check Grammar, Spelling and Style",
    metaDescription:
      "Proofread text for grammar, spelling, punctuation and style in one pass. Each suggestion explains the rule, so you can accept it or skip it.",
    summary:
      "Proofread text for spelling, common grammar mistakes, punctuation and wordy style in one pass. Every suggestion names the rule it comes from, so you can accept it or skip it.",
    category: "text-tools",
    subgroup: "writing",
    card: "Check spelling, grammar, punctuation and style in one pass.",
    archetype: "analyzer",
    widget: "writing-check",
    config: { mode: "proofread" },
    aliases: [
      "grammar checker",
      "grammer checker",
      "proofreading tool",
      "proofread online",
      "grammar and spelling check",
      "check grammar",
      "spelling and grammar",
      "proof reader",
      "grammar check online",
      "proofreader",
    ],
    keywords: ["grammar", "proofreading", "spelling", "punctuation", "style", "email", "essay"],
    processing: "browser",
    limits: [
      "Rule-based: it catches the specific patterns listed under “What this checker looks for”, not every grammar error.",
      "English only; spelling uses a US dictionary (British spellings optional).",
    ],
    steps: [
      "Paste your text into **Your text**, or press **Example** to see the checks at work.",
      "Press **Proofread**. Results appear on the right and update as you edit.",
      "Filter by **Spelling**, **Grammar**, **Punctuation** or **Style**; switch to **Marked text** to see every issue underlined in place.",
      "Press a suggestion (such as **Change to “an”**) to apply it, **Ignore** to skip it, or **Fix all spacing** for double spaces and spaces before punctuation.",
    ],
    example: {
      title: "The built-in example",
      input: "Its been a busy week , and i think the the team did well. We could of finished sooner, the tests took longer then expected. Their is still a hour of work left.In order to finish, we need to utilize every tester.",
      output:
        "Its → It's (its / it's)\n“ ,” → “,” (space before punctuation)\ni → I (lowercase “i”)\nthe the → the (repeated word)\ncould of → could have\nsooner, the tests… → possible comma splice (hint)\nthen → than (than / then)\nTheir is → There is (there / their)\na hour → an hour (a / an)\nleft.In → left. In (missing space after punctuation)\nIn order to → To (wordy phrase, hint)",
      note: "Real output of the rule set. The spelling check found no misspellings in this text: every error here is a real word used wrongly, which only rules can catch.",
    },
    sections: [
      {
        heading: "What the proofreader checks",
        body: "Four kinds of check run together:\n\n- **Spelling**: every word against the Hunspell US English dictionary (the same check as the [spell checker](/spell-checker/)), with suggestions and your personal word list.\n- **Grammar rules**: a/an by sound, its/it's, your/you're, lets/let's, could of/should of, then/than after comparisons, their is/are, repeated words, lowercase “i”, and simple agreement errors such as “she don't” and “they was”.\n- **Punctuation**: the full rule set of the [punctuation checker](/punctuation-checker/): spacing, commas, apostrophes, quotes, brackets, capitals and sentence endings.\n- **Style hints**: wordy phrases with shorter equivalents, possible passive voice and sentences over 30 words.\n\nThe complete list, with what each rule matches, is under **What this checker looks for** below the tool.",
      },
      {
        heading: "Reading and applying suggestions",
        body: "Each result shows the rule name, the sentence around the problem with the problem marked, a one-line explanation and one or more fixes. Results labelled **Hint** are patterns that are often, but not always, wrong: “your right” is an error in “your right about that” but correct in “your right to vote”. Untick **Show hints** to see only firmer issues. Applying a fix changes your text directly; the list then refreshes. **Ignore** hides a single result for this session. Nothing is changed without you pressing a button: the proofreader never rewrites your text on its own.",
      },
      {
        heading: "Common grammar issues it flags",
        body: "| You wrote | Suggestion | Why |\n|---|---|---|\n| a hour, an university | an hour, a university | a/an follows the sound, not the letter |\n| its been | it's been | it's = it is / it has |\n| it's own | its own | its = belonging to it |\n| could of | could have | “could've” misheard |\n| better then | better than | than compares, then is time |\n| their is | there is | their = belonging to them |\n| she don't | she doesn't | he/she/it takes doesn't |\n| alot | a lot | two words |\n\nIt does not judge word choice (affect/effect), tense consistency, dangling modifiers, or whether a sentence makes sense.",
      },
      {
        heading: "Limits of automated proofreading",
        body: "This is a rule-based checker, not an AI model or a full grammar parser. It can only find the patterns its rules describe, so a clean result means “none of these patterns found”, not “error-free”. Rules are tuned to avoid false alarms, which means some real errors pass. It also can't check facts, names, numbers or tone. No accuracy percentage is given because it would depend entirely on the kind of mistakes in your text.",
      },
      {
        heading: "A checklist for important documents",
        body: "1. Run the proofreader and work through spelling and grammar first, then punctuation, then style hints.\n2. Check names, dates, figures and links by hand against the source.\n3. Read the text aloud or with your browser's read-aloud feature; your ear catches missing words that eyes skip.\n4. Check the length with the [word counter](/word-counter/) if there's a limit.\n5. For essays, run the [essay checker](/essay-checker/) for readability and structure.\n6. Leave it for an hour, then read it once more from the end, sentence by sentence.",
      },
    ],
    faq: [
      {
        q: "How is this different from the spell checker?",
        a: "The spell checker only finds words that aren't in the dictionary. The proofreader runs the same spelling check plus grammar, punctuation and style rules, so it also catches real words used wrongly, such as “could of” or “a hour”.",
      },
      {
        q: "Will it rewrite my text?",
        a: "No. It suggests specific fixes and changes the text only when you press one. For shorter, plainer wording, try the sentence rewriter's phrase list, and review its changes too.",
      },
      {
        q: "Does it support British English?",
        a: "Partly. Tick **Accept British spellings** and words such as colour, organise and centre are accepted by rule. The grammar and punctuation rules apply to both; it doesn't enforce UK or US punctuation style.",
      },
      {
        q: "Is my text stored?",
        a: "No. Checking happens in your browser. The text is kept in this tab's session storage so a reload doesn't lose it, and is cleared when you close the tab.",
      },
    ],
    sources: [...SPELL_SOURCES.slice(0, 2), { label: "GOV.UK style guide A to Z", url: "https://www.gov.uk/guidance/style-guide/a-to-z" }],
    related: ["spell-checker", "punctuation-checker", "essay-checker", "word-counter", "text-summarizer"],
    links: [
      { href: "/spell-checker/", anchor: "spell checker" },
      { href: "/punctuation-checker/", anchor: "punctuation checker" },
      { href: "/essay-checker/", anchor: "essay checker" },
      { href: "/word-counter/", anchor: "word counter" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Spelling (Hunspell en-US), grammar, punctuation and style in one pass",
      "Every suggestion names its rule; hints are labelled",
      "One-click fixes, ignore, and a marked-up view of the text",
      "Published list of all rules it applies",
    ],
    indexable: true,
    updated: "2026-09-30",
    priority: 1,
  },
  {
    id: "punctuation-checker",
    path: "/punctuation-checker/",
    name: "Punctuation Checker",
    h1: "Punctuation Checker",
    title: "Punctuation Checker – Find Comma and Apostrophe Errors",
    metaDescription:
      "Check text for missing or extra commas, apostrophe mistakes, spacing around punctuation and unmatched quotes. Each issue explains the rule it breaks.",
    summary:
      "Check text for comma problems, apostrophe mistakes, spacing around punctuation, unmatched quotes and brackets, and missing capitals. Each issue explains the rule it breaks.",
    category: "text-tools",
    subgroup: "writing",
    card: "Find comma, apostrophe, spacing and quotation mark mistakes.",
    archetype: "analyzer",
    widget: "writing-check",
    config: { mode: "punctuation" },
    aliases: [
      "comma checker",
      "punctuation corrector",
      "check punctuation",
      "apostrophe checker",
      "its vs it's checker",
      "grammer and punctuation checker",
      "comma splice checker",
      "punctuation check online",
      "punctuation fixer",
    ],
    keywords: ["comma", "apostrophe", "quotes", "brackets", "spacing", "capital letters", "comma splice"],
    processing: "browser",
    limits: ["Pattern-based: checks the listed rules only and can't parse sentence structure.", "Doesn't enforce a style guide (Oxford comma, UK or US quote placement)."],
    steps: [
      "Paste your text into **Your text**. Punctuation is checked as you type.",
      "Untick any **Rule groups** you don't need (Commas, Apostrophes, Spacing, Quotes and brackets, Sentence endings and capitals).",
      "Read each result under **Results**: the rule, the marked text and why it's flagged.",
      "Press the suggested fix, **Ignore** it, or **Fix all spacing** to clean up every spacing issue at once.",
    ],
    example: {
      title: "The built-in example",
      input: "Its a short list:apples , pears and plums. We left early,we were tired!! The report (draft two is attached.\n\nhowever the deadline hasn't changed. Lets meet on Monday.",
      output: "Its → It's (its / it's)\n“ ,” → “,” (space before punctuation)\n“early,we” → “early, we” (missing space after punctuation)\n!! → ! (repeated punctuation)\n( → never closed (unmatched brackets)\nhowever → However (capital at paragraph start)\nLets → Let's (lets / let's)",
      note: "Real output. The missing space in “list:apples” is not flagged: colons are skipped because of times (10:30) and ratios.",
    },
    sections: [
      {
        heading: "Comma rules the checker applies",
        body: "- **Possible comma splice** (hint): a comma followed by a pronoun and a verb, as in “It's late, we should go”. Two complete sentences need a full stop, a semicolon, or a conjunction after the comma (“, so we should go”). Sentences that start with if, when, because, although and similar words are skipped, because there the comma is correct.\n- **“However” joining sentences** (hint): “It rained, however we went” needs “It rained; however, we went”.\n- **Introductory words** (hint): a sentence starting with However, Therefore, Moreover, Furthermore, Nevertheless, Consequently, Meanwhile, Unfortunately or Fortunately needs a comma after it.\n- **Doubled commas** and **missing space after a comma**.\n\nIt does not decide where a comma is needed inside a sentence in general; that needs a grammar parser.",
      },
      {
        heading: "Apostrophes: its/it's, plurals and possessives",
        body: "**it's** means “it is” or “it has”; **its** means “belonging to it” and never has an apostrophe. The checker flags “its” before words that only make sense with “it is/has” (its a, its been, its not, its going) and flags “it's own”. It also flags **lets** before a verb when you mean “let us” (lets go → let's go), **your welcome** (you're welcome) plus other your/you're patterns as hints, and **apostrophes in plurals of numbers** (1990's → 1990s). Ordinary possessives (the dog's bone, the dogs' bowls) can't be judged without knowing how many dogs you mean, so they are not checked.",
      },
      {
        heading: "Spacing, quotes and sentence endings",
        body: "- **Spacing**: double spaces, a space before , . ; : ! ?, a missing space after , ; ! ? or after a full stop between words (“end.Next”), and spaces just inside brackets (hint). URLs, email addresses, decimals and abbreviations such as U.S. are skipped.\n- **Quotes and brackets**: an opening ( [ { never closed in the same paragraph, a closing one without an opener, an odd number of straight double quotes, and curly “ ” that don't pair. Smileys like :) and list markers like 1) are ignored.\n- **Endings and capitals**: a lowercase word after . ! ? (abbreviations such as e.g., etc. and Mr. are skipped), a paragraph starting in lowercase, a lowercase “i”, doubled full stops, “!!” and “??”, and a long paragraph with no closing punctuation (hint).",
      },
      {
        heading: "UK and US punctuation differences",
        body: "| | US style | UK style |\n|---|---|---|\n| Main quotation marks | “double” | ‘single’ (often) |\n| Full stop with quotes | inside: “like this.” | outside unless part of the quote: ‘like this’. |\n| Abbreviations | Mr., Dr. | Mr, Dr |\n| Serial (Oxford) comma | usual | optional |\n\nThe checker accepts both styles: it doesn't move full stops in or out of quotes or require Mr. with a full stop. Pick one style and use it consistently.",
      },
      {
        heading: "When to ignore a suggestion",
        body: "Rules marked **Hint** look for patterns, not meaning. Ignore a comma-splice hint when the comma joins very short parallel clauses on purpose (“I came, I saw, I conquered”), or when a dialogue tag follows (“Wait, she said”). A lowercase word after a full stop may be a brand (eBay, iPhone, which are skipped automatically) or a code name. Repeated !! can be right in informal writing. Press **Ignore** to hide a result, or untick **Show hints**. For spelling and grammar too, use the [online proofreader](/online-proofreader/).",
      },
    ],
    faq: [
      {
        q: "Can it tell whether I need an Oxford comma?",
        a: "No. The serial comma before “and” in a list is a style choice, and the checker accepts lists with or without it. Choose one style for a document and use it consistently.",
      },
      {
        q: "Does it check grammar as well?",
        a: "Only where grammar and punctuation overlap: its/it's, lets/let's, your/you're and a lowercase “i”. For a/an, could of, then/than and spelling, use the online proofreader.",
      },
      {
        q: "Why is a correct sentence flagged?",
        a: "Some rules, labelled Hint, match patterns that are usually but not always wrong, such as a comma before “we were”. Read the explanation and ignore it if the sentence is right.",
      },
    ],
    sources: [
      { label: "Purdue OWL: Punctuation", url: "https://owl.purdue.edu/owl/general_writing/punctuation/index.html" },
      { label: "GOV.UK style guide A to Z (UK punctuation conventions)", url: "https://www.gov.uk/guidance/style-guide/a-to-z" },
    ],
    related: ["online-proofreader", "spell-checker", "essay-checker", "remove-extra-spaces", "word-counter"],
    links: [
      { href: "/online-proofreader/", anchor: "online proofreader" },
      { href: "/spell-checker/", anchor: "spell checker" },
      { href: "/essay-checker/", anchor: "essay checker" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Five rule groups you can switch on and off",
      "Comma splice, its/it's, let's and plural-apostrophe checks",
      "Unmatched quotes and brackets per paragraph",
      "One-click spacing fixes; every result explains its rule",
    ],
    indexable: true,
    updated: "2026-09-30",
    priority: 2,
  },
  {
    id: "essay-checker",
    path: "/essay-checker/",
    name: "Essay Checker",
    h1: "Essay Checker",
    title: "Essay Checker – Structure, Readability and Word Choice",
    metaDescription:
      "Check an essay's structure, readability, sentence variety, transitions and length against your target, with a paragraph-by-paragraph breakdown.",
    summary:
      "Get a report on an essay's length against your target, readability scores, sentence variety, paragraphs, transitions and repeated words, plus a spelling check. It measures the writing; it doesn't grade it.",
    category: "text-tools",
    subgroup: "writing",
    card: "Report an essay's length, readability, sentence variety and paragraphs.",
    archetype: "analyzer",
    widget: "writing-check",
    config: { mode: "essay" },
    aliases: [
      "essay readability checker",
      "essay structure checker",
      "check my essay",
      "essay analyzer",
      "essay grammer checker",
      "paragraph length checker",
      "flesch kincaid calculator",
      "readability checker",
      "essay word count checker",
    ],
    keywords: ["essay", "readability", "flesch", "grade level", "paragraph", "transitions", "students"],
    processing: "browser",
    limits: ["Doesn't grade, check facts or detect plagiarism.", "Syllables are estimated from spelling, so scores can differ by a few points from other tools."],
    steps: [
      "Paste your essay into **Your essay**; separate paragraphs with a blank line.",
      "Enter your **Target word count** (or 0 for none).",
      "Press **Analyze essay**. The report appears below and updates as you edit.",
      "Work through **Paragraph by paragraph**, **Long sentences** and **Transitions and repeated words**, then proofread the final draft.",
    ],
    example: {
      title: "The built-in example (3 paragraphs)",
      input: "Social media has changed how teenagers communicate. Many students now spend several hours a day on apps such as Instagram and TikTok. … In conclusion, social media is a tool whose effects depend on how it is used. …",
      output:
        "Words 122 · Sentences 8 · Paragraphs 3\nWords per sentence 15.25 · Syllables per word 1.52\nFlesch Reading Ease 62.4 (plain English)\nFlesch–Kincaid grade 8.3\nTransitions: first, for example, however, in conclusion\nPossible passive: “are mixed”, “are designed”",
      note: "Real report. “are mixed” is an adjective, not a true passive, which is why passive results are hints.",
    },
    sections: [
      {
        heading: "What the essay checker measures",
        body: "- **Length**: words, sentences, paragraphs and progress toward your target (with a warning when you are more than 10% over).\n- **Readability**: Flesch Reading Ease and Flesch–Kincaid grade, with the calculation shown.\n- **Sentence variety**: shortest and longest sentence, standard deviation, and how many sentences fall under 10, 10–20, 21–30 and over 30 words.\n- **Paragraphs**: words, sentences, reading ease and transitions for each, with notes on one-sentence, very long or thin body paragraphs.\n- **Word choice**: most-used words (common words excluded), sentences that start with the same word three or more times, possible passive voice.\n- **Spelling**: words not in the Hunspell US English dictionary.",
      },
      {
        heading: "Readability scores explained",
        body: "**Flesch Reading Ease** (Flesch, 1948) = 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words). Higher is easier: 60–70 is plain English that most 13–15-year-olds read easily, 30–50 is typical of academic writing. **Flesch–Kincaid grade** (Kincaid et al., 1975, developed for US Navy training material) = 0.39 × (words ÷ sentences) + 11.8 × (syllables ÷ words) − 15.59 and gives a US school grade. Both only measure sentence length and word length; a short, clear sentence with one long technical word scores “harder” than it reads. Syllables are estimated with spelling rules and an exception list, so expect small differences from other calculators. There is no single right score for an essay: academic essays often land between 30 and 50; aim for clarity rather than a number.",
      },
      {
        heading: "Paragraph and sentence variety",
        body: "Readers lose the thread in sentences over about 30 words, and a run of sentences of exactly the same length sounds flat. The report lists every sentence over 30 words so you can split it, and shows the spread of sentence lengths: a low standard deviation (under about 4 words) means very uniform sentences. In the paragraph table, a body paragraph under 40 words usually needs more evidence or explanation, and one over 200 words often holds two ideas. A one-sentence paragraph can work for emphasis, but several in a row suggest the argument isn't developed.",
      },
      {
        heading: "Transitions and repeated words",
        body: "Transition words (however, for example, therefore, in contrast, in conclusion and about 40 others) show how one idea connects to the next. The report lists the ones you used overall and per paragraph; a body paragraph without any is worth a second look. **Most-used words** shows your top ten content words with their share of the text. Topic words are expected to repeat, but a general word above about 2.5% (“things”, “really”, “important”) usually has better alternatives. Starting three or more sentences with the same word (“The”, “This”) is flagged as well.",
      },
      {
        heading: "What it doesn't check: plagiarism and facts",
        body: "The essay checker doesn't compare your text with other sources, so it can't detect plagiarism or AI-generated text, and it doesn't check facts, quotations, citations or referencing style. It doesn't grade the essay or judge the argument. Use it alongside your marking criteria. For grammar and punctuation errors, [proofread the final draft](/online-proofreader/); for the time a reader needs, see the [reading time](/reading-time-calculator/) calculator; for character limits, the [word counter](/word-counter/).",
      },
    ],
    faq: [
      {
        q: "Does it check for plagiarism?",
        a: "No. It analyzes only the text you paste and never compares it with other documents. Use your school's plagiarism service for that.",
      },
      {
        q: "What readability score should an essay have?",
        a: "There is no required score. School essays often score 50–65 on Reading Ease and university essays 30–50. If yours is much lower, look at the long sentences listed in the report first.",
      },
      {
        q: "Can it grade my essay?",
        a: "No. It reports measurable features such as length, readability and structure. Grades depend on the argument, evidence and marking criteria, which a tool can't judge.",
      },
    ],
    sources: [...READABILITY_SOURCES, SPELL_SOURCES[0]],
    related: ["online-proofreader", "spell-checker", "word-counter", "reading-time-calculator", "text-summarizer"],
    links: [
      { href: "/online-proofreader/", anchor: "proofread the final draft" },
      { href: "/word-counter/", anchor: "word counter" },
      { href: "/reading-time-calculator/", anchor: "reading time" },
      { href: "/spell-checker/", anchor: "spell checker" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Flesch Reading Ease and Flesch–Kincaid grade with the calculation shown",
      "Paragraph-by-paragraph table and sentence-length spread",
      "Transitions, most-used words and repeated sentence starters",
      "Target word count progress and spelling check",
    ],
    indexable: true,
    updated: "2026-09-30",
    priority: 2,
  },
  {
    id: "text-summarizer",
    path: "/text-summarizer/",
    name: "Text Summarizer",
    h1: "Text Summarizer",
    title: "Text Summarizer – Summarize Articles Into Key Points",
    metaDescription:
      "Condense long text into its most important sentences as a paragraph, bullet points or a one-line TL;DR. Choose the summary length and see key terms.",
    summary:
      "Condense an article or report into its most representative sentences, as a paragraph, bullet points or a one-line TL;DR. It picks existing sentences and shows which ones; it doesn't rewrite.",
    category: "text-tools",
    subgroup: "writing",
    card: "Pick the key sentences of a long text as a paragraph, bullets or TL;DR.",
    archetype: "transform",
    widget: "writing-check",
    config: { mode: "summarize" },
    aliases: [
      "summarize text",
      "summary generator",
      "article summarizer",
      "tldr generator",
      "summarizer",
      "summarise text",
      "text summariser",
      "key points generator",
      "extractive summarizer",
      "sumarizer",
    ],
    keywords: ["summary", "tldr", "key points", "article", "report", "extractive"],
    processing: "browser",
    limits: ["Extractive: the summary uses your sentences word for word.", "Works best on structured prose (articles, reports); poorly on dialogue, lists or very short texts."],
    steps: [
      "Paste the text into **Text to summarize** (or press **Example**).",
      "Choose a **Length**: Short (15% of sentences), Medium (25%), Long (40%), or **Sentences…** for an exact number.",
      "Choose a **Format**: Paragraph, Bullet points or TL;DR (1 sentence). The summary updates as you change options.",
      "Open **Which sentences were picked** to see every sentence's score, then copy or download the summary.",
    ],
    example: {
      title: "The built-in example, Short, Bullet points",
      input: "Urban trees do more than make streets look pleasant. A mature street tree shades pavement and buildings, … (4 paragraphs, 11 sentences)",
      output: "• Urban trees do more than make streets look pleasant.\n• Planting trees is not enough on its own.",
      note: "Real output: 2 of 11 sentences (15% rounded). Both open a paragraph and share the text's key term, “trees”.",
    },
    sections: [
      {
        heading: "How extractive summarising picks sentences",
        body: "This summarizer uses the frequency method first described by H. P. Luhn at IBM in 1958. It counts how often each content word appears (common words such as “the” and “because” are ignored, and simple plurals are merged), then gives each sentence a score: the sum of its distinct words' frequencies relative to the most frequent word, divided by the square root of the number of words so long sentences don't win just by being long. The first sentence of the text gets a 20% boost and the first sentence of each paragraph 10%, because writers tend to put key points there. Sentences under 5 words score 0, and a sentence sharing 60% or more of its words with one already picked is skipped. The top sentences are shown in their original order.",
      },
      {
        heading: "Choosing summary length",
        body: "**Short** keeps about 15% of the sentences, **Medium** 25% and **Long** 40%, rounded, with at least one. For an abstract or a meeting brief, Short is usually enough; for study notes, Medium or Long keeps more supporting detail. **Sentences…** sets an exact number. The footer shows how many sentences and words were kept and the share of the original. Very short inputs (fewer than 3 sentences) are left alone.",
      },
      {
        heading: "Paragraph, bullets or TL;DR",
        body: "**Paragraph** joins the picked sentences into one block, useful for an abstract. **Bullet points** puts each on its own line with a bullet, which suits notes and emails. **TL;DR** returns only the single highest-scoring sentence, prefixed “TL;DR:”. **Key terms** beside the summary lists the most frequent content words, which is often the quickest way to see what a text is about.",
      },
      {
        heading: "When a summary misses context",
        body: "Because sentences are lifted as they are, a picked sentence may start with “This” or “However” and refer to something that wasn't picked. Numbers and caveats from neighboring sentences can also be lost, and a text whose main point appears only once (in a conclusion, say) may be under-represented. Check the summary against **Which sentences were picked**, and add a sentence by hand where the meaning depends on it. For formatted web pages, [strip HTML before summarising](/html-to-text-converter/). To compare lengths, use the [word counter](/word-counter/) or the [reading time calculator](/reading-time-calculator/).",
      },
      {
        heading: "Citing the original source",
        body: "An extractive summary contains the author's exact words, so treat it as quotation, not your own writing. In an essay or report, either put the sentences in quotation marks with a citation, or use the summary as notes and write your own paraphrase, still citing the source. Keep the author, title, publication and date with any summary you save so you can find and cite the original later.",
      },
    ],
    faq: [
      {
        q: "Does it rewrite text or pick sentences?",
        a: "It picks sentences. Every sentence in the summary appears word for word in your text, and you can see the score of each one.",
      },
      {
        q: "How long can the input be?",
        a: "There is no fixed limit; it runs in your browser and handles tens of thousands of words quickly on a typical computer. Very long texts are better summarized section by section.",
      },
      {
        q: "Is this an AI summarizer?",
        a: "No. It uses a word-frequency method with no language model, so it can't paraphrase or combine ideas, but it also never invents content.",
      },
    ],
    sources: [{ label: "Luhn, H. P. (1958). The automatic creation of literature abstracts. IBM Journal of Research and Development, 2(2), 159–165", url: "https://doi.org/10.1147/rd.22.0159" }],
    related: ["word-counter", "reading-time-calculator", "essay-checker", "online-proofreader", "remove-extra-spaces"],
    links: [
      { href: "/word-counter/", anchor: "word counter" },
      { href: "/reading-time-calculator/", anchor: "reading time calculator" },
      { href: "/html-to-text-converter/", anchor: "strip HTML before summarising" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Extractive summary by word frequency and position (Luhn method)",
      "Short, medium, long or an exact number of sentences",
      "Paragraph, bullet points or one-line TL;DR",
      "Every sentence's score and the key terms are shown",
    ],
    indexable: true,
    updated: "2026-09-30",
    priority: 2,
  },
  {
    id: "sentence-rewriter",
    path: "/sentence-rewriter/",
    name: "Sentence Rewriter",
    h1: "Sentence Rewriter",
    title: "Sentence Rewriter – Make Sentences Shorter and Plainer",
    metaDescription:
      "Rewrite sentences in plain English: swap wordy phrases and formal words for shorter ones, and spot long or passive sentences. Every change is listed.",
    summary:
      "Make sentences shorter and plainer by swapping wordy phrases and formal words for everyday ones from a fixed list, and see long or passive sentences to fix by hand. Every change is listed.",
    category: "text-tools",
    subgroup: "writing",
    card: "Swap wordy phrases for plain English and flag long sentences.",
    archetype: "transform",
    widget: "writing-check",
    config: { mode: "rewrite" },
    aliases: [
      "rewrite sentence",
      "sentence rephraser",
      "reword sentence",
      "plain english converter",
      "make sentence concise",
      "wordiness checker",
      "sentence rewritter",
      "simplify text",
    ],
    keywords: ["concise", "plain english", "wordy", "simplify", "rewrite"],
    processing: "browser",
    limits: ["Replaces phrases from a fixed list; it doesn't paraphrase, change tone or restructure sentences.", "English only."],
    steps: [
      "Paste a sentence or paragraph into **Sentence or paragraph**.",
      "Choose what to change: **Shorten wordy phrases**, **Use everyday words**, and optionally **Remove filler words**.",
      "Read the **Plainer version** and the **Changes made** list; check **Worth a manual look** for long or passive sentences.",
      "Copy the result, or press **Reuse** to keep editing it.",
    ],
    example: {
      title: "The built-in example",
      input: "In order to finish the project on time, we need to utilize all available staff. It is important to note that the end result was delayed due to the fact that a large number of users commenced testing prior to the launch date.",
      output: "To finish the project on time, we need to use all available staff. The result was delayed because many users started testing before the launch date.",
      note: "Real output: 8 changes, 43 words down to 26. “was delayed” is then listed as possible passive voice to check by hand.",
    },
    sections: [
      {
        heading: "Rewrite styles: formal, casual, concise, simple",
        body: "This rewriter does one job: it makes text **concise and simple** using fixed lists, so the same input always gives the same output.\n\n- **Shorten wordy phrases** (about 100 entries): in order to → to, due to the fact that → because, at this point in time → now, a large number of → many, prior to → before, make a decision → decide. Empty openers such as “it is important to note that” are deleted.\n- **Use everyday words**: utilize → use, commence → start, facilitate → help, approximately → about, with each verb form listed so tense is kept (utilized → used).\n- **Remove filler words** (off by default): very, really, quite, basically, actually, literally and similar.\n\nIt doesn't change tone to formal or casual; that needs a language model, which this page doesn't use.",
      },
      {
        heading: "Comparing versions",
        body: "The original stays on the left and the plainer version on the right, and **Changes made** lists every replacement with the old wording struck through, so you can check each one. Untick a group of changes to see the text without it. **Worth a manual look** lists sentences over 25 words and possible passive constructions (“was delayed”), which a phrase list can't fix: split long sentences at “and”, “but” or “which”, and name who does the action.",
      },
      {
        heading: "Keeping meaning and facts intact",
        body: "The replacements are chosen to keep meaning in normal use, but a phrase list can't read context. “Additional” → “more” is wrong in “additional (extra-charge) baggage” for some readers, and removing “very” changes emphasis. Numbers, names and technical terms are never changed. Review the list of changes before using the text, especially in legal or technical writing. For spelling and grammar, run the result through the [online proofreader](/online-proofreader/).",
      },
      {
        heading: "Rewriting vs plagiarism",
        body: "Swapping words in someone else's text doesn't make it yours: the ideas and structure still belong to the author, so rewritten passages need a citation just like quotations. This tool is meant for your own drafts. To condense a source for notes, the [text summarizer](/text-summarizer/) picks key sentences that you can then quote and cite; check length with the [word counter](/word-counter/).",
      },
    ],
    faq: [
      {
        q: "Will the rewrite keep my meaning?",
        a: "Usually, because it only swaps fixed phrases for shorter equivalents and never restructures a sentence. A few swaps can shift nuance, so review the list of changes.",
      },
      {
        q: "How long can the input be?",
        a: "Any length; it runs in your browser and updates as you type. It works best on paragraphs of your own writing.",
      },
      {
        q: "Is rewriting someone else's text allowed?",
        a: "Rewording doesn't remove the need to credit the source. Quote and cite other people's work; use this tool on your own drafts.",
      },
    ],
    sources: [
      { label: "Federal Plain Language Guidelines (plainlanguage.gov)", url: "https://www.plainlanguage.gov/guidelines/" },
      { label: "Plain English Campaign: The A to Z of alternative words", url: "https://www.plainenglish.co.uk/the-a-z-of-alternative-words.html" },
    ],
    related: ["online-proofreader", "text-summarizer", "word-counter", "essay-checker"],
    links: [
      { href: "/online-proofreader/", anchor: "online proofreader" },
      { href: "/text-summarizer/", anchor: "text summarizer" },
      { href: "/word-counter/", anchor: "word counter" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "About 100 wordy phrases with concise replacements",
      "Formal-to-everyday word swaps that keep the verb tense",
      "Optional filler-word removal",
      "Every change listed; long and passive sentences flagged",
    ],
    indexable: false,
    updated: "2026-09-30",
    priority: 3,
  },
];
