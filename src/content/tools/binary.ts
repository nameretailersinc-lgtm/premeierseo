import type { ToolDef } from "@/lib/types";

/*
 * Binary and number-base tools. Titles, H1s, descriptions and H2 outlines follow docs/keyword-map.json.
 * Two engines: text-binary (text ↔ bytes) and number-base (2/8/10/16 with BigInt, fractions,
 * two's complement and step-by-step working). Examples are real outputs of src/tools/lib/dev/*.
 */

const UPDATED = "2026-09-30";

const NIBBLE_TABLE =
  "| Hex | Binary | Decimal | Hex | Binary | Decimal |\n|---|---|---|---|---|---|\n| 0 | 0000 | 0 | 8 | 1000 | 8 |\n| 1 | 0001 | 1 | 9 | 1001 | 9 |\n| 2 | 0010 | 2 | A | 1010 | 10 |\n| 3 | 0011 | 3 | B | 1011 | 11 |\n| 4 | 0100 | 4 | C | 1100 | 12 |\n| 5 | 0101 | 5 | D | 1101 | 13 |\n| 6 | 0110 | 6 | E | 1110 | 14 |\n| 7 | 0111 | 7 | F | 1111 | 15 |";

const OCTAL_TABLE =
  "| Octal | Binary | Octal | Binary |\n|---|---|---|---|\n| 0 | 000 | 4 | 100 |\n| 1 | 001 | 5 | 101 |\n| 2 | 010 | 6 | 110 |\n| 3 | 011 | 7 | 111 |";

export const BINARY_TOOLS: ToolDef[] = [
  /* ---------------- Text and binary ---------------- */
  {
    id: "text-to-binary",
    path: "/text-to-binary/",
    name: "Text to Binary Converter",
    h1: "Text to Binary Converter",
    title: "Text to Binary Converter – Binary Translator",
    metaDescription:
      "Translate text into binary code (8-bit ASCII or UTF-8) with a per-character breakdown, then switch direction to turn binary back into text.",
    summary:
      "Translate any text into binary code, one 8-bit byte per ASCII character and two to four bytes for accented letters and emoji, with a table showing how each character was encoded.",
    category: "binary-tools",
    subgroup: "text",
    card: "Translate text into 8-bit binary code, or binary back into text.",
    archetype: "transform",
    widget: "text-binary",
    config: { mode: "text-to-binary" },
    aliases: [
      "binary translator",
      "english to binary",
      "letters to binary",
      "text to binary code",
      "string to binary",
      "word to binary",
      "name in binary",
      "binary code translator",
      "text 2 binary",
      "utf-8 to binary",
    ],
    keywords: ["binary", "encode", "bits", "bytes", "translator"],
    processing: "browser",
    limits: ["The breakdown table lists the first 300 characters; the binary output is always complete."],
    steps: [
      "Type or paste your text into the **Text** box. The binary appears in the **Binary** box as you type.",
      "Choose **Encoding**: **UTF-8** handles every character, including emoji; **ASCII** limits you to the 128 basic characters and allows 7-bit output.",
      "Pick a **Separator** (space, none, comma or new line) to match where you are pasting the result.",
      "Check the **Character-by-character breakdown** to see each character's code point, decimal, hex and binary bytes, then press **Copy** or **Download**.",
      "To go the other way, switch **Direction** to **Binary → Text**; the current binary moves into the input box.",
    ],
    example: {
      input: "Hi!",
      output: "01001000 01101001 00100001",
      note: "H is 72, i is 105 and ! is 33. Each is written as an 8-bit byte. “Café 👍” needs 10 bytes: é takes two and the emoji takes four.",
    },
    sections: [
      {
        heading: "How text becomes binary",
        body: "Computers store each character as a number, and each number as a pattern of bits. The converter does two lookups:\n\n1. **Character → number.** Unicode assigns every character a code point. Capital H is 72, lower-case i is 105.\n2. **Number → bits.** The number is written in base 2 and padded to a full byte: 72 = 64 + 8 = `01001000`.\n\nSo “Hi” becomes `01001000 01101001`. A byte has eight bits, which can hold values 0 to 255. One letter of English text is one byte, which answers the common question of how many bits one letter takes: eight.",
      },
      {
        heading: "ASCII vs UTF-8",
        body: "**ASCII** (1963) defines 128 characters: English letters, digits, punctuation and control codes, numbered 0–127. Seven bits are enough for that range, so some textbooks write ASCII as 7-bit groups (H = `1001000`).\n\n**UTF-8** (RFC 3629) is how almost all text on the web is stored today. It keeps the 128 ASCII characters as single bytes, identical to ASCII, and uses more bytes for everything else:\n\n| Characters | Bytes | Example |\n|---|---|---|\n| ASCII (U+0000–U+007F) | 1 | A = `01000001` |\n| Accented Latin, Greek, Cyrillic, Hebrew, Arabic | 2 | é = `11000011 10101001` |\n| Most other scripts (Chinese, Hindi, Thai) | 3 | 中 = 3 bytes |\n| Emoji and rare characters | 4 | 👍 = `11110000 10011111 10010001 10001101` |\n\nThat is why emoji take more than 8 bits: their code points are above 65,535 and UTF-8 needs four bytes to carry them.",
      },
      {
        heading: "Character-by-character breakdown",
        body: "Below the result, a table lists each character with its Unicode code point (U+0048), its byte values in decimal and hex, and the bits. Multi-byte characters show all their bytes on one row, so you can see that the leading bits of a UTF-8 byte (`110`, `1110`, `11110`) say how many bytes belong to the character and that continuation bytes always start with `10`.\n\nSpaces, tabs and new lines are characters too: a space is 32 (`00100000`) and a new line is 10 (`00001010`). They appear in the table by name.",
      },
      {
        heading: "Separators and formatting",
        body: "Most binary puzzles and homework write one byte per group separated by spaces, which is the default. Choose **None** for a continuous string (useful for checksums or some programming exercises), **Comma** to paste into an array, or **New line** for one byte per line. The bits themselves are the same in every format; the separator only changes how they are laid out.",
      },
      {
        heading: "Translating binary back to text",
        body: "Switch **Direction** to **Binary → Text** to decode. The decoder accepts bytes with or without spaces, ignores commas and line breaks, and reads 7-bit groups if every group has seven digits. For a fuller decoder with decimal, hex and octal output and invalid-input checks, use [binary to text](/binary-to-text/). For plain ASCII codes and the complete 0–127 table, use the [ASCII to binary converter](/ascii-to-binary-converter/).",
      },
    ],
    faq: [
      {
        q: "What is “hello” in binary?",
        a: "In ASCII or UTF-8, lower-case “hello” is `01101000 01100101 01101100 01101100 01101111`. Capital “Hello” only changes the first byte, to `01001000`, because upper- and lower-case letters differ by 32 (one bit).",
      },
      {
        q: "Why do emoji take more than 8 bits?",
        a: "One byte can hold only 256 different values, and Unicode has over a million code points. UTF-8 stores characters above U+FFFF, which includes most emoji, as four bytes (32 bits).",
      },
      {
        q: "How many bits is one letter?",
        a: "Eight bits (one byte) for any English letter, digit or common punctuation mark. Strict 7-bit ASCII uses seven, and letters outside ASCII, such as é or ß, take 16 bits in UTF-8.",
      },
      {
        q: "Is the binary different for upper- and lower-case letters?",
        a: "Yes. A is 65 (`01000001`) and a is 97 (`01100001`). The only difference is the bit worth 32, so changing case flips one bit.",
      },
    ],
    sources: [
      { label: "RFC 3629: UTF-8, a transformation format of ISO 10646", url: "https://www.rfc-editor.org/rfc/rfc3629" },
      { label: "The Unicode Standard, Chapter 3: Conformance (encoding forms)", url: "https://www.unicode.org/versions/latest/core-spec/chapter-3/" },
    ],
    related: ["binary-to-text", "ascii-to-binary-converter", "decimal-to-binary-converter", "ascii-to-unicode-converter", "binary-to-hex-converter"],
    links: [
      { href: "/binary-to-text/", anchor: "binary to text" },
      { href: "/ascii-to-binary-converter/", anchor: "ASCII to binary" },
      { href: "/decimal-to-binary-converter/", anchor: "decimal to binary" },
      { href: "/morse-code-translator/", anchor: "Morse code translator" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "UTF-8 encoding for every Unicode character, including emoji",
      "Strict 7-bit or 8-bit ASCII mode",
      "Space, comma, new-line or no separator",
      "Per-character table of code points, bytes and bits",
      "Two-way: switch to binary → text in one click",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
    formats: { from: ["text"], to: ["binary"] },
  },
  {
    id: "binary-to-text",
    path: "/binary-to-text/",
    name: "Binary to Text Converter",
    h1: "Binary to Text Converter",
    title: "Binary to Text Converter – Decode Binary Code to English",
    metaDescription:
      "Decode binary code into readable text. Paste bits with or without spaces; the decoder finds byte boundaries, flags invalid input and shows each character.",
    summary:
      "Decode binary code into readable text. Paste 8-bit or 7-bit groups with or without spaces and see every byte with its decimal value, hex value and character.",
    category: "binary-tools",
    subgroup: "text",
    card: "Decode binary code into readable text, byte by byte.",
    archetype: "transform",
    widget: "text-binary",
    config: { mode: "binary-to-text" },
    aliases: [
      "binary decoder",
      "binary to english",
      "binary code translator",
      "binary to ascii",
      "decode binary",
      "binary translator",
      "binary to string",
      "binary message decoder",
      "bits to text",
      "binery to text",
    ],
    keywords: ["decode", "binary", "message", "puzzle", "bytes"],
    processing: "browser",
    limits: ["The byte table lists the first 600 bytes; the decoded text is always complete."],
    steps: [
      "Paste the binary into the **Binary** box. Spaces, commas and line breaks between bytes are optional.",
      "Leave **Bits per character** on **Auto-detect**, or set **8 bits** or **7 bits** if the decoder guesses wrong.",
      "Read the decoded text in the **Text** box. Set **Show** to **Decimal values**, **Hex values** or **Octal values** to see the byte values instead.",
      "If you see � characters, set **Character set** to **Latin-1 (8-bit)** for old extended-ASCII data.",
      "Check the **Character-by-character breakdown** for each byte, then press **Copy** or **Download**.",
    ],
    example: {
      input: "010011100110100101100011011001010010000100100001",
      output: "Nice!!",
      note: "48 bits with no spaces split into six bytes: 78, 105, 99, 101, 33, 33.",
    },
    sections: [
      {
        heading: "Decoding binary step by step",
        body: "To decode `01001000 01101001` by hand:\n\n1. Split the bits into bytes of eight.\n2. Add the place values (128, 64, 32, 16, 8, 4, 2, 1) wherever there is a 1: `01001000` = 64 + 8 = 72, `01101001` = 64 + 32 + 8 + 1 = 105.\n3. Look each number up in the ASCII or Unicode table: 72 is H and 105 is i.\n\nThe answer to the common puzzle “what does 01001000 01101001 mean?” is therefore “Hi”. The breakdown table under the result shows these three columns (bits, number, character) for every byte you paste.",
      },
      {
        heading: "Spaced vs continuous binary",
        body: "When bytes are separated by spaces, commas or new lines, each group is read as one byte, and a short group such as `1000001` is padded with a leading zero. When the binary arrives as one long run, the decoder cuts it every eight bits from the left.\n\nIf every group has exactly seven digits, or a continuous run divides by seven but not by eight, the input is read as 7-bit ASCII and a note says so. Override the guess with **Bits per character**.",
      },
      {
        heading: "Invalid input and padding",
        body: "Anything other than 0, 1 and separators stops the conversion with the exact character and its position, for example “2 at position 14”. A continuous run that is not a whole number of bytes decodes as far as it can; the leftover bits are listed in a warning rather than silently dropped.\n\nIn UTF-8 mode, a byte that cannot start or continue a valid character (for example a lone `11000011` with nothing after it) is shown as �, and the breakdown marks it “not valid UTF-8 here”.",
      },
      {
        heading: "Decoding to decimal, hex and ASCII codes",
        body: "The **Show** menu turns the output into the byte values instead of text:\n\n| Show | “Hi” becomes |\n|---|---|\n| Text | Hi |\n| Decimal values | 72 105 |\n| Hex values | 48 69 |\n| Octal values | 110 151 |\n\nThis is useful when the binary is not text at all, such as a number, a colour or part of a file header. To convert one long binary number rather than a list of bytes, use [binary to decimal](/binary-to-decimal-converter/) or [binary to hex](/binary-to-hex-converter/).",
      },
      {
        heading: "Binary puzzles and hidden messages",
        body: "Geocaches, escape rooms and programming challenges often hide a word in binary. If the result looks like nonsense, try these in order: switch **Bits per character** to 7; check whether the bits were written with the least significant bit first (reverse each byte); look for a second layer, such as Base64 or hex, in the decoded text. The [ASCII table](/ascii-to-binary-converter/) helps when only a few bytes are unreadable.",
      },
    ],
    faq: [
      {
        q: "How do I read binary code?",
        a: "Split it into groups of eight bits, convert each group to a number by adding the place values where there is a 1, and look the number up in an ASCII table. 01000001 is 65, which is the letter A.",
      },
      {
        q: "What if my binary isn't a multiple of 8 bits?",
        a: "If it is a multiple of 7, it is probably 7-bit ASCII and is decoded that way. Otherwise the complete bytes are decoded and the extra bits at the end are reported in a warning, so you can check whether a digit was lost when copying.",
      },
      {
        q: "Can it decode UTF-8?",
        a: "Yes. With **Character set** on UTF-8 (the default), multi-byte sequences become accented letters, other scripts and emoji. `11000011 10101001` decodes to é, and the table shows which bytes belong together.",
      },
    ],
    sources: [
      { label: "RFC 3629: UTF-8, a transformation format of ISO 10646", url: "https://www.rfc-editor.org/rfc/rfc3629" },
      { label: "RFC 20: ASCII format for network interchange", url: "https://www.rfc-editor.org/rfc/rfc20" },
    ],
    related: ["text-to-binary", "binary-to-decimal-converter", "binary-to-hex-converter", "ascii-to-binary-converter", "ascii-to-unicode-converter"],
    links: [
      { href: "/text-to-binary/", anchor: "text to binary" },
      { href: "/binary-to-decimal-converter/", anchor: "binary to decimal" },
      { href: "/binary-to-hex-converter/", anchor: "binary to hex" },
      { href: "/ascii-to-binary-converter/", anchor: "ASCII table" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Reads spaced, comma-separated or continuous binary",
      "Auto-detects 7-bit and 8-bit groups",
      "UTF-8 and Latin-1 decoding",
      "Byte table with decimal, hex and character columns",
      "Output as text or as decimal, hex or octal byte values",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
    formats: { from: ["binary"], to: ["text", "ascii"] },
  },

  /* ---------------- ASCII ---------------- */
  {
    id: "ascii-to-binary-converter",
    path: "/ascii-to-binary-converter/",
    name: "ASCII to Binary Converter",
    h1: "ASCII to Binary Converter",
    title: "ASCII to Binary Converter – With Full ASCII Table",
    metaDescription:
      "Convert ASCII characters or decimal ASCII codes to 7- or 8-bit binary, and look up any character in the 0-127 ASCII table with binary and hex values.",
    summary:
      "Convert ASCII characters or their decimal codes (such as 72 101 108) to 7-bit or 8-bit binary, and search the complete 0–127 ASCII table with decimal, hex and binary values.",
    category: "binary-tools",
    subgroup: "ascii",
    card: "Convert ASCII characters or codes to binary and search the ASCII table.",
    archetype: "transform",
    widget: "text-binary",
    config: { mode: "ascii-to-binary" },
    aliases: [
      "ascii code to binary",
      "binary to ascii",
      "ascii table binary",
      "ascii binary table",
      "ascii chart",
      "7 bit ascii",
      "ascii codes",
      "ascii to bin",
      "asci to binary",
    ],
    keywords: ["ascii", "table", "control characters", "codes"],
    processing: "browser",
    limits: ["Only codes 0–127 are ASCII. For accented letters and emoji use the UTF-8 text to binary converter."],
    steps: [
      "Choose **Input**: **Characters** to type text, or **Decimal codes** to enter numbers such as `72 101 108`.",
      "Set **Bits per code** to **8 bits** (one byte per character) or **7 bits** (strict ASCII).",
      "Copy the binary from the **Binary** box, or read each character's values in the breakdown table.",
      "Search the **ASCII table (0–127)** with **Find a character or code**: a character, a decimal or hex code, 8 bits, or a name such as “tab”.",
    ],
    example: {
      input: "Cat",
      output: "01000011 01100001 01110100",
      note: "C = 67, a = 97, t = 116. With **Bits per code** set to 7 bits, “OK” becomes 1001111 1001011.",
    },
    sections: [
      {
        heading: "ASCII codes and binary",
        body: "ASCII gives each of 128 characters a number from 0 to 127. Converting a character to binary means writing its code in base 2:\n\n| Character | Decimal | Hex | 8-bit binary |\n|---|---|---|---|\n| space | 32 | 20 | 00100000 |\n| 0 | 48 | 30 | 00110000 |\n| A | 65 | 41 | 01000001 |\n| Z | 90 | 5A | 01011010 |\n| a | 97 | 61 | 01100001 |\n| z | 122 | 7A | 01111010 |\n\nThe layout is deliberate: digits 0–9 are 48–57, so subtracting 48 gives the digit's value, and lower-case letters are exactly 32 above their capitals.",
      },
      {
        heading: "7-bit vs 8-bit output",
        body: "ASCII was designed as a 7-bit code, so every value fits in seven bits and the highest code, 127, is `1111111`. Computers store characters in 8-bit bytes, so most tools, including this one by default, add a leading 0: `01000001` rather than `1000001`.\n\nUse **7 bits** when a textbook or exercise asks for “7-bit ASCII”, or when you are working with serial protocols and old systems that transmit seven data bits. The values are the same; only the leading zero changes.",
      },
      {
        heading: "ASCII table (0-127)",
        body: "The searchable table under the converter lists all 128 codes with decimal, hex and 8-bit binary values. Type a single character to find its code, a number (decimal or hex such as `0x41`) to find its character, a full byte such as `01000001`, or part of a control character's name (“escape”, “line feed”).\n\nPrintable characters run from 32 (space) to 126 (~). The rest are control characters.",
      },
      {
        heading: "Control characters",
        body: "Codes 0–31 and 127 are not printable; they were instructions for teleprinters and terminals. A few are still used every day:\n\n| Code | Binary | Name | Used for |\n|---|---|---|---|\n| 9 | 00001001 | TAB | Tab key, tab-separated files |\n| 10 | 00001010 | LF | New line on Linux and macOS |\n| 13 | 00001101 | CR | Windows new line is CR + LF |\n| 27 | 00011011 | ESC | Terminal colour codes |\n| 0 | 00000000 | NUL | End of a string in C |\n\nTyping a tab or new line in the input converts it like any other character, and the breakdown names it.",
      },
      {
        heading: "ASCII vs Unicode",
        body: "Unicode includes ASCII as its first 128 code points, so A is 65 in both. Beyond 127 they diverge: “extended ASCII” is not one standard but many code pages (Windows-1252, ISO 8859-1 and others) that assign 128–255 differently. Modern text uses Unicode, stored as UTF-8. This converter rejects characters above 127 and tells you which ones; convert those with [text to binary (UTF-8)](/text-to-binary/) or look up their code points in the [Unicode converter](/ascii-to-unicode-converter/).",
      },
    ],
    faq: [
      {
        q: "What is the ASCII code for A in binary?",
        a: "Capital A is 65, which is `01000001` in 8-bit binary or `1000001` in 7 bits. Lower-case a is 97, `01100001`.",
      },
      {
        q: "Why do some tools show 7 bits?",
        a: "Standard ASCII only needs seven bits, because its largest code is 127. Tools that show 8 bits add a leading zero so each character fills one byte, which is how it is stored in memory.",
      },
      {
        q: "Are extended ASCII characters supported?",
        a: "Not here, because codes 128–255 mean different characters in different code pages. Use the [binary to text](/binary-to-text/) decoder with **Character set** set to Latin-1 to read old 8-bit data, or [text to binary](/text-to-binary/) for UTF-8.",
      },
    ],
    sources: [
      { label: "RFC 20: ASCII format for network interchange (ANSI X3.4-1968)", url: "https://www.rfc-editor.org/rfc/rfc20" },
      { label: "Unicode code chart: C0 Controls and Basic Latin (U+0000–U+007F)", url: "https://www.unicode.org/charts/PDF/U0000.pdf" },
    ],
    related: ["text-to-binary", "binary-to-text", "ascii-to-unicode-converter", "decimal-to-binary-converter", "binary-to-decimal-converter"],
    links: [
      { href: "/text-to-binary/", anchor: "text to binary (UTF-8)" },
      { href: "/binary-to-text/", anchor: "binary to text" },
      { href: "/ascii-to-unicode-converter/", anchor: "Unicode converter" },
      { href: "/decimal-to-binary-converter/", anchor: "decimal to binary" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Characters or decimal ASCII codes as input",
      "7-bit or 8-bit binary output",
      "Searchable 0–127 ASCII table with hex and binary",
      "Named control characters (TAB, LF, CR, ESC)",
      "Two-way: binary back to ASCII",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["ascii"], to: ["binary"] },
  },

  /* ---------------- Number systems ---------------- */
  {
    id: "binary-to-decimal-converter",
    path: "/binary-to-decimal-converter/",
    name: "Binary to Decimal Converter",
    h1: "Binary to Decimal Converter",
    title: "Binary to Decimal Converter – With Step-by-Step Working",
    metaDescription:
      "Convert binary numbers to decimal and see the working: each bit multiplied by its power of two. Supports long values, fractions and two's complement.",
    summary:
      "Convert a binary number to decimal and see the working: each bit multiplied by its power of two, then added up. Handles numbers of any length, binary fractions and two's complement.",
    category: "binary-tools",
    subgroup: "numbers",
    card: "Convert binary numbers to decimal with the working shown.",
    archetype: "transform",
    widget: "number-base",
    config: { from: 2, to: 10 },
    aliases: ["binary to decimal", "convert binary to decimal", "binary number converter", "bin to dec", "base 2 to base 10", "binary to number", "binary calculator", "two's complement to decimal"],
    keywords: ["binary", "decimal", "base 2", "steps", "homework"],
    processing: "browser",
    steps: [
      "Type the binary number in **Binary (base 2)**. Spaces, underscores and a `0b` prefix are ignored.",
      "Read the answer in **Decimal (base 10)**; hexadecimal and octal appear under **Other bases**.",
      "Keep **Show steps** ticked to see each bit's place value in **Step-by-step working**.",
      "For signed values, set **Negative numbers** to **Two's complement** and choose the **Bit width**.",
      "Press **Copy** next to any field, or **Swap** to convert decimal to binary instead.",
    ],
    example: {
      input: "101101",
      output: "Decimal: 45\nHexadecimal: 2D\nOctal: 55",
      note: "Working: 32 + 8 + 4 + 1 = 45.",
    },
    sections: [
      {
        heading: "Converting binary to decimal by hand",
        body: "Write the place value above each bit, starting with 1 on the right and doubling as you move left. Then add the place values where the bit is 1.\n\nFor `101101`:\n\n| Bit | 1 | 0 | 1 | 1 | 0 | 1 |\n|---|---|---|---|---|---|---|\n| Place value | 32 | 16 | 8 | 4 | 2 | 1 |\n| Counts? | 32 | – | 8 | 4 | – | 1 |\n\n32 + 8 + 4 + 1 = **45**. The **Step-by-step working** panel builds this table for any number up to 64 digits.",
      },
      {
        heading: "Place values and powers of two",
        body: "Each place is a power of two: the rightmost bit is 2⁰ = 1, then 2¹ = 2, 2² = 4, up to 2⁷ = 128 for the eighth bit. An n-bit number can hold values from 0 to 2ⁿ − 1:\n\n| Bits | Largest value |\n|---|---|\n| 4 | 15 |\n| 8 | 255 |\n| 16 | 65,535 |\n| 32 | 4,294,967,295 |\n| 64 | 18,446,744,073,709,551,615 |\n\nThe converter uses arbitrary-precision integers, so 64-bit and longer values are exact, not rounded as they would be in a spreadsheet.",
      },
      {
        heading: "Signed numbers and two's complement",
        body: "Computers store negative integers in two's complement: in an n-bit number, the leftmost bit is worth −2ⁿ⁻¹ instead of +2ⁿ⁻¹. In 8 bits, `11010110` is −128 + 64 + 16 + 4 + 2 = **−42**, while the same bits read as unsigned are 214.\n\nSet **Negative numbers** to **Two's complement** and pick the **Bit width** (8, 16, 32 or 64). The working then shows the negative top bit. With **Minus sign** selected, you can instead type `-1010` for −10.",
      },
      {
        heading: "Binary fractions",
        body: "Bits after the point are worth ½, ¼, ⅛ and so on. `10110.101` is 16 + 4 + 2 + 0.5 + 0.125 = **22.625**. Every binary fraction ends in decimal, because ½ divides evenly into powers of ten; the reverse is not true (0.1 in decimal never ends in binary).",
      },
      {
        heading: "Common values table",
        body: "| Binary | Decimal | Note |\n|---|---|---|\n| 1010 | 10 | |\n| 1111 | 15 | largest 4-bit value |\n| 10000 | 16 | |\n| 1100100 | 100 | |\n| 1111111 | 127 | largest 7-bit (ASCII) value |\n| 10000000 | 128 | |\n| 11111111 | 255 | largest 8-bit value |\n| 1111101000 | 1000 | |",
      },
    ],
    faq: [
      {
        q: "What is 1010 in decimal?",
        a: "10. The 1s are in the 8 and 2 places, and 8 + 2 = 10.",
      },
      {
        q: "How do I convert negative binary numbers?",
        a: "Decide whether the number is two's complement. If it is, the leftmost bit counts as negative: in 8 bits, `11111111` is −1. If the number simply has a minus sign, convert the digits and keep the sign: `-1010` is −10.",
      },
      {
        q: "What's the largest 8-bit number?",
        a: "255 (`11111111`) if unsigned. In 8-bit two's complement the range is −128 to 127.",
      },
    ],
    sources: [{ label: "Knuth, The Art of Computer Programming, Vol. 2, §4.1 Positional number systems", url: "https://www-cs-faculty.stanford.edu/~knuth/taocp.html" }],
    related: ["decimal-to-binary-converter", "binary-to-hex-converter", "binary-to-octal-converter", "binary-to-text", "hex-to-binary-converter"],
    links: [
      { href: "/decimal-to-binary-converter/", anchor: "decimal to binary" },
      { href: "/binary-to-hex-converter/", anchor: "binary to hex" },
      { href: "/binary-to-text/", anchor: "binary to text" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Exact results for numbers of any length (BigInt)",
      "Step-by-step place-value working",
      "Two's complement at 8, 16, 32 or 64 bits",
      "Binary fractions",
      "Hex and octal shown at the same time",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["binary"], to: ["decimal"] },
  },
  {
    id: "decimal-to-binary-converter",
    path: "/decimal-to-binary-converter/",
    name: "Decimal to Binary Converter",
    h1: "Decimal to Binary Converter",
    title: "Decimal to Binary Converter – With Division Steps",
    metaDescription:
      "Convert decimal numbers to binary and see the repeated division by two. Handles large integers, negative numbers (two's complement) and fractions.",
    summary:
      "Convert a decimal number to binary and see the repeated division by two that produces it. Works for large integers, negative numbers in two's complement and decimal fractions.",
    category: "binary-tools",
    subgroup: "numbers",
    card: "Convert decimal numbers to binary with the division steps.",
    archetype: "transform",
    widget: "number-base",
    config: { from: 10, to: 2 },
    aliases: ["decimal to binary", "convert decimal to binary", "number to binary", "dec to bin", "base 10 to base 2", "integer to binary", "negative decimal to binary", "denary to binary"],
    keywords: ["decimal", "binary", "division", "steps", "two's complement"],
    processing: "browser",
    steps: [
      "Type the number in **Decimal (base 10)**. Commas between thousands are ignored.",
      "Read the result in **Binary (base 2)**. Tick **Group digits** to split it into groups of four.",
      "Keep **Show steps** ticked to see each division by 2 and its remainder.",
      "For a negative number as a computer stores it, choose **Two's complement** under **Negative numbers** and set the **Bit width**.",
    ],
    example: {
      input: "156",
      output: "Binary: 10011100\nHexadecimal: 9C\nOctal: 234",
      note: "156 ÷ 2 = 78 r0, 78 ÷ 2 = 39 r0, 39 ÷ 2 = 19 r1, 19 ÷ 2 = 9 r1, 9 ÷ 2 = 4 r1, 4 ÷ 2 = 2 r0, 2 ÷ 2 = 1 r0, 1 ÷ 2 = 0 r1. Reading the remainders from the bottom up gives 10011100.",
    },
    sections: [
      {
        heading: "Division-by-two method",
        body: "Divide the number by 2, write down the remainder (0 or 1), and repeat with the quotient until it reaches 0. The binary number is the remainders read **from the last to the first**.\n\n| Division | Quotient | Remainder |\n|---|---|---|\n| 10 ÷ 2 | 5 | 0 |\n| 5 ÷ 2 | 2 | 1 |\n| 2 ÷ 2 | 1 | 0 |\n| 1 ÷ 2 | 0 | 1 |\n\nReading upwards: 10 = **1010**. A faster mental method for small numbers is to subtract the largest power of two that fits (10 − 8 = 2, 2 − 2 = 0, so bits 8 and 2 are set).",
      },
      {
        heading: "Large numbers",
        body: "The converter uses arbitrary-precision integers, so values beyond 2⁵³ (9,007,199,254,740,992), where JavaScript and spreadsheets start rounding, still convert exactly. A number needs ⌊log₂ n⌋ + 1 bits: 255 needs 8, 256 needs 9, and one million needs 20. The helper text under the binary field shows the bit count.",
      },
      {
        heading: "Negative numbers",
        body: "There are two ways to write −10 in binary:\n\n- **Minus sign:** `-1010`. Fine on paper, but computers don't store a separate sign symbol.\n- **Two's complement:** write 10 in the chosen width (`00001010`), flip every bit (`11110101`) and add 1: `11110110`. This is how processors store signed integers.\n\nThe width matters: −10 is `11110110` in 8 bits and `1111111111110110` in 16 bits. If a number does not fit (for example −200 in 8 bits, whose range is −128 to 127), the tool says so instead of wrapping around.",
      },
      {
        heading: "Decimal fractions to binary",
        body: "For the part after the point, multiply by 2 and take the whole-number part as the next bit, then repeat with what is left:\n\n0.625 × 2 = 1.25 → 1, 0.25 × 2 = 0.5 → 0, 0.5 × 2 = 1 → 1, so 0.625 = **0.101**.\n\nMost decimal fractions never finish in binary. 0.1 becomes 0.0001100110011… forever, which is why 0.1 + 0.2 isn't exactly 0.3 in most programming languages. The converter stops after 32 binary places and tells you the result was cut off.",
      },
      {
        heading: "Quick reference: 0-255",
        body: "| Decimal | Binary | Decimal | Binary |\n|---|---|---|---|\n| 0 | 0 | 16 | 10000 |\n| 1 | 1 | 32 | 100000 |\n| 2 | 10 | 64 | 1000000 |\n| 3 | 11 | 100 | 1100100 |\n| 4 | 100 | 127 | 1111111 |\n| 5 | 101 | 128 | 10000000 |\n| 8 | 1000 | 200 | 11001000 |\n| 10 | 1010 | 255 | 11111111 |",
      },
    ],
    faq: [
      {
        q: "What is 10 in binary?",
        a: "1010. Ten is 8 + 2, so the bits worth 8 and 2 are 1 and the others are 0.",
      },
      {
        q: "How do I convert a decimal fraction to binary?",
        a: "Convert the whole part by dividing by 2, then convert the fraction by repeatedly multiplying by 2 and collecting the whole-number digits. 5.75 becomes 101.11.",
      },
      {
        q: "How many bits does a number need?",
        a: "Find the smallest power of two greater than the number; its exponent is the bit count. 100 is below 128 (2⁷), so it needs 7 bits. In two's complement, add one bit for the sign.",
      },
    ],
    sources: [{ label: "Knuth, The Art of Computer Programming, Vol. 2, §4.4 Radix conversion", url: "https://www-cs-faculty.stanford.edu/~knuth/taocp.html" }],
    related: ["binary-to-decimal-converter", "hex-to-binary-converter", "text-to-binary", "binary-to-hex-converter", "octal-to-binary-converter"],
    links: [
      { href: "/binary-to-decimal-converter/", anchor: "binary to decimal" },
      { href: "/hex-to-binary-converter/", anchor: "hex to binary" },
      { href: "/text-to-binary/", anchor: "text to binary" },
    ],
    appCategory: "EducationalApplication",
    features: [
      "Repeated-division working for every conversion",
      "Exact conversion of very large integers",
      "Two's complement at 8, 16, 32 or 64 bits",
      "Decimal fractions with a cut-off warning",
      "Binary, hex and octal at once",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["decimal"], to: ["binary"] },
  },
  {
    id: "binary-to-hex-converter",
    path: "/binary-to-hex-converter/",
    name: "Binary to Hex Converter",
    h1: "Binary to Hex Converter",
    title: "Binary to Hex Converter – Binary to Hexadecimal With Steps",
    metaDescription:
      "Convert binary to hexadecimal by grouping bits into nibbles, with the working shown. Paste long values with or without spaces and copy the hex result.",
    summary:
      "Convert binary to hexadecimal by splitting the bits into groups of four (nibbles) and replacing each group with one hex digit. Long values and spaced input are fine.",
    category: "binary-tools",
    subgroup: "numbers",
    card: "Convert binary to hexadecimal by grouping bits in fours.",
    archetype: "transform",
    widget: "number-base",
    config: { from: 2, to: 16 },
    aliases: ["binary to hexadecimal", "convert binary to hex", "bin to hex", "base 2 to base 16", "binary to hex calculator", "nibble to hex", "32-bit binary to hex"],
    keywords: ["binary", "hex", "nibble", "steps"],
    processing: "browser",
    steps: [
      "Paste the binary into **Binary (base 2)**. Spaces between groups are ignored.",
      "Read the result in **Hexadecimal (base 16)**. Decimal and octal appear under **Other bases**.",
      "Tick **Keep leading zeros** to keep the full width (`00001111` → `0F` rather than `F`).",
      "Open **Step-by-step working** to see each 4-bit group and its hex digit, then press **Copy**.",
    ],
    example: {
      input: "1101011",
      output: "Hexadecimal: 6B\nDecimal: 107\nOctal: 153",
      note: "Padded to 0110 1011: 0110 = 6 and 1011 = B.",
    },
    sections: [
      {
        heading: "Grouping bits into nibbles",
        body: "Sixteen is 2⁴, so every hex digit stands for exactly four bits (a nibble). To convert:\n\n1. Split the binary into groups of four **starting from the right**.\n2. Pad the leftmost group with zeros if it is short.\n3. Replace each group with its hex digit.\n\n`1101011` → `0110 1011` → **6B**. There is no arithmetic beyond the 16-row table below, which is why programmers read hex as shorthand for binary.",
      },
      {
        heading: "Binary-hex reference table",
        body: NIBBLE_TABLE,
      },
      {
        heading: "Padding and leading zeros",
        body: "Leading zeros don't change a number's value: `00001111` and `1111` are both F. They do matter when the width is meaningful, such as a byte in a file or a register value. Tick **Keep leading zeros** and the hex result keeps one digit for every four bits you typed (`00001111` → `0F`, `0000000011111111` → `00FF`).\n\nGroup from the right, never from the left: grouping `1101011` from the left as `1101 011` would give the wrong answer.",
      },
      {
        heading: "Hex in programming and colours",
        body: "Hex appears wherever bytes are shown to people: `0xFF` in code, `%20` in URLs, MAC addresses (`3C:22:FB:…`), file signatures (PNG files start `89 50 4E 47`) and web colours. A colour such as `#FF5722` is three bytes, red FF, green 57, blue 22. The [RGB to HEX converter](/rgb-to-hex-color-converter/) converts those to decimal channel values.",
      },
    ],
    faq: [
      {
        q: "What is 11111111 in hex?",
        a: "FF. Both nibbles are 1111, which is F (15). As a decimal number it is 255.",
      },
      {
        q: "Why does hex use the letters A-F?",
        a: "Base 16 needs sixteen single-digit symbols. After 0–9, the letters A to F stand for the values 10 to 15.",
      },
      {
        q: "Do I need leading zeros?",
        a: "Not for the value. Keep them when the width is part of the meaning, such as a full byte (`0F`) or a fixed-size field; tick **Keep leading zeros** to preserve them.",
      },
    ],
    sources: [{ label: "RFC 4648 §8: Base 16 encoding", url: "https://www.rfc-editor.org/rfc/rfc4648#section-8" }],
    related: ["hex-to-binary-converter", "binary-to-decimal-converter", "binary-to-octal-converter", "rgb-to-hex-color-converter", "binary-to-text"],
    links: [
      { href: "/hex-to-binary-converter/", anchor: "hex to binary" },
      { href: "/binary-to-decimal-converter/", anchor: "binary to decimal" },
      { href: "/rgb-to-hex-color-converter/", anchor: "hex colour codes" },
    ],
    appCategory: "EducationalApplication",
    features: ["Nibble-grouping working", "Optional leading zeros", "Accepts spaces, underscores and 0b prefixes", "Exact for any length", "Decimal and octal shown too"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["binary"], to: ["hex"] },
  },
  {
    id: "hex-to-binary-converter",
    path: "/hex-to-binary-converter/",
    name: "Hex to Binary Converter",
    h1: "Hex to Binary Converter",
    title: "Hex to Binary Converter – Hexadecimal to Binary With Table",
    metaDescription:
      "Convert hexadecimal values to binary, one hex digit to four bits, with the lookup table alongside. Accepts 0x prefixes, spaces and long strings.",
    summary:
      "Convert hexadecimal to binary by replacing each hex digit with its four bits. Accepts 0x and # prefixes, upper or lower case, spaces and very long values.",
    category: "binary-tools",
    subgroup: "numbers",
    card: "Convert hexadecimal to binary, four bits per hex digit.",
    archetype: "transform",
    widget: "number-base",
    config: { from: 16, to: 2 },
    aliases: ["hexadecimal to binary", "convert hex to binary", "hex to bin", "base 16 to base 2", "0x to binary", "hex string to binary", "hex to binary table"],
    keywords: ["hex", "binary", "nibble", "0x"],
    processing: "browser",
    steps: [
      "Type or paste the value into **Hexadecimal (base 16)**. A `0x` or `#` prefix and spaces are ignored.",
      "Read the bits in **Binary (base 2)**. Tick **Group digits** to show them in fours.",
      "Tick **Keep leading zeros** so every hex digit becomes exactly four bits (`0F` → `00001111`).",
      "Check **Step-by-step working** for the digit-by-digit lookup, then press **Copy**.",
    ],
    example: {
      input: "0x1A3",
      output: "Binary: 110100011\nDecimal: 419\nOctal: 643",
      note: "1 = 0001, A = 1010, 3 = 0011. Joined: 0001 1010 0011, shown without the leading zeros unless **Keep leading zeros** is ticked.",
    },
    sections: [
      {
        heading: "Each hex digit is four bits",
        body: "Because 16 = 2⁴, each hexadecimal digit maps to exactly one group of four bits, and the groups never interact. Convert digit by digit and join the results: `C4` → `1100` + `0100` = `11000100`. Nothing has to be carried or added, so hex-to-binary is the easiest base conversion to do by hand.",
      },
      {
        heading: "Hex-binary lookup table",
        body: NIBBLE_TABLE,
      },
      {
        heading: "0x prefixes and spaces",
        body: "Programming languages mark hex with `0x` (C, JavaScript, Python), `#` (CSS colours), `&H` (Visual Basic) or a trailing `h` (assembly). The converter accepts `0x` and `#` and ignores spaces and underscores, so `0xDEAD_BEEF`, `#ff8800` and `de ad be ef` all work. Hex is not case-sensitive: `ff` and `FF` are the same value.",
      },
      {
        heading: "Hex dumps and byte strings",
        body: "A hex dump such as `48 65 6C 6C 6F` is a list of bytes. Paste it and the converter treats the digits as one long number; tick **Keep leading zeros** and **Group digits** so each byte keeps its full 8 bits. To read those bytes as text instead, convert them to binary and paste the result into [binary to text](/binary-to-text/) (48 65 6C 6C 6F is “Hello”).",
      },
    ],
    faq: [
      {
        q: "What is F in binary?",
        a: "1111. F is 15, the largest value one hex digit can hold, so all four bits are 1.",
      },
      {
        q: "How do I convert 0x1A3 to binary?",
        a: "Drop the 0x prefix and convert each digit: 1 = 0001, A = 1010, 3 = 0011. The result is 000110100011, or 110100011 without leading zeros.",
      },
      {
        q: "Is hex case-sensitive?",
        a: "No. A–F and a–f mean the same values. Style guides differ: CSS colours are often lower case, while many assemblers and datasheets use upper case.",
      },
    ],
    sources: [{ label: "RFC 4648 §8: Base 16 encoding", url: "https://www.rfc-editor.org/rfc/rfc4648#section-8" }],
    related: ["binary-to-hex-converter", "decimal-to-binary-converter", "binary-to-text", "octal-to-binary-converter", "binary-to-decimal-converter"],
    links: [
      { href: "/binary-to-hex-converter/", anchor: "binary to hex" },
      { href: "/decimal-to-binary-converter/", anchor: "decimal to binary" },
      { href: "/binary-to-text/", anchor: "binary to text" },
    ],
    appCategory: "EducationalApplication",
    features: ["Digit-by-digit lookup working", "Accepts 0x and # prefixes, spaces and underscores", "Optional four bits per digit", "Decimal and octal at the same time", "Two's complement mode for signed values"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
    formats: { from: ["hex"], to: ["binary"] },
  },
  {
    id: "binary-to-octal-converter",
    path: "/binary-to-octal-converter/",
    name: "Binary to Octal Converter",
    h1: "Binary to Octal Converter",
    title: "Binary to Octal Converter – Group Bits in Threes",
    metaDescription:
      "Convert binary numbers to octal by grouping bits in threes, with each step shown. Useful for Unix file permissions and number-system homework.",
    summary:
      "Convert binary to octal by splitting the bits into groups of three from the right and replacing each group with one octal digit, with every step shown.",
    category: "binary-tools",
    subgroup: "numbers",
    card: "Convert binary to octal by grouping bits in threes.",
    archetype: "transform",
    widget: "number-base",
    config: { from: 2, to: 8 },
    aliases: ["convert binary to octal", "bin to oct", "base 2 to base 8", "binary to octal table", "binary octal converter", "binary to base 8"],
    keywords: ["binary", "octal", "chmod", "steps"],
    processing: "browser",
    steps: [
      "Type the bits into **Binary (base 2)**.",
      "Read the result in **Octal (base 8)**; decimal and hex appear under **Other bases**.",
      "Open **Step-by-step working** to see each group of three bits and its octal digit.",
      "Press **Swap** to convert octal back to binary, or **Copy** to copy a result.",
    ],
    example: {
      input: "111101101",
      output: "Octal: 755\nDecimal: 493\nHexadecimal: 1ED",
      note: "111 = 7, 101 = 5, 101 = 5. These are the rwxr-xr-x permission bits.",
    },
    sections: [
      {
        heading: "Grouping bits in threes",
        body: "Eight is 2³, so one octal digit equals three bits. Split the binary number into threes **from the right**, pad the leftmost group with zeros, and replace each group with its digit:\n\n`1101011` → `001 101 011` → **153**.\n\nFractions work the same way after the point, but grouped from the left and padded on the right: `0.11` → `0.110` → 0.6.",
      },
      {
        heading: "Binary-octal table",
        body: OCTAL_TABLE,
      },
      {
        heading: "Octal and Unix file permissions",
        body: "Unix permissions are nine bits: read, write and execute for the owner, the group and everyone else. Grouping them in threes is exactly an octal conversion, which is why `chmod` takes octal numbers:\n\n| Bits | rwx | Octal |\n|---|---|---|\n| 111 101 101 | rwx r-x r-x | 755 |\n| 110 100 100 | rw- r-- r-- | 644 |\n| 111 000 000 | rwx --- --- | 700 |\n\nEach position is read = 4, write = 2, execute = 1.",
      },
      {
        heading: "Checking your answer via decimal",
        body: "To check an octal result, convert both numbers to decimal. 755₈ is 7 × 64 + 5 × 8 + 5 = 493, and 111101101₂ is 256 + 128 + 64 + 32 + 8 + 4 + 1 = 493. The decimal field under **Other bases** shows this value as you type, and [binary to decimal](/binary-to-decimal-converter/) shows the full working.",
      },
    ],
    faq: [
      {
        q: "What is 111 in octal?",
        a: "7. Three bits make exactly one octal digit, and 111 is 4 + 2 + 1.",
      },
      {
        q: "Why is octal used for chmod permissions?",
        a: "Each permission group (owner, group, others) has three bits (read, write, execute), and three bits are one octal digit, so three octal digits describe all nine bits compactly.",
      },
      {
        q: "How do I pad a binary number?",
        a: "Add zeros on the left until the length is a multiple of three. 1011 becomes 001 011, which is 13 in octal. Leading zeros don't change the value.",
      },
    ],
    sources: [{ label: "POSIX chmod: symbolic and octal modes (The Open Group)", url: "https://pubs.opengroup.org/onlinepubs/9799919799/utilities/chmod.html" }],
    related: ["octal-to-binary-converter", "binary-to-decimal-converter", "binary-to-hex-converter", "decimal-to-binary-converter"],
    links: [
      { href: "/octal-to-binary-converter/", anchor: "octal to binary" },
      { href: "/binary-to-decimal-converter/", anchor: "binary to decimal" },
      { href: "/binary-to-hex-converter/", anchor: "binary to hex" },
    ],
    appCategory: "EducationalApplication",
    features: ["Three-bit grouping working", "Binary fractions", "Decimal and hex shown at the same time", "Exact for numbers of any length"],
    indexable: true,
    updated: UPDATED,
    priority: 3,
    formats: { from: ["binary"], to: ["octal"] },
  },
  {
    id: "octal-to-binary-converter",
    path: "/octal-to-binary-converter/",
    name: "Octal to Binary Converter",
    h1: "Octal to Binary Converter",
    title: "Octal to Binary Converter – Each Digit to Three Bits",
    metaDescription:
      "Convert octal numbers to binary, three bits per digit, with the working and a lookup table. Try permission values like 755 or 644 to see the bits.",
    summary:
      "Convert octal numbers to binary by replacing each digit with its three bits. Try a chmod value such as 755 or 644 to see which permission bits are set.",
    category: "binary-tools",
    subgroup: "numbers",
    card: "Convert octal to binary, three bits per digit.",
    archetype: "transform",
    widget: "number-base",
    config: { from: 8, to: 2 },
    aliases: ["convert octal to binary", "oct to bin", "base 8 to base 2", "octal to binary table", "chmod to binary", "755 in binary"],
    keywords: ["octal", "binary", "permissions", "chmod"],
    processing: "browser",
    steps: [
      "Type the octal number into **Octal (base 8)**. Only digits 0–7 are allowed; a `0o` prefix is fine.",
      "Read the bits in **Binary (base 2)**. Tick **Keep leading zeros** for exactly three bits per digit.",
      "See the digit-by-digit lookup under **Step-by-step working**, then press **Copy**.",
    ],
    example: {
      input: "644",
      output: "Binary: 110100100\nDecimal: 420\nHexadecimal: 1A4",
      note: "6 = 110 (rw-), 4 = 100 (r--), 4 = 100 (r--).",
    },
    sections: [
      {
        heading: "Each octal digit is three bits",
        body: "Write each digit as three bits and join them. 755 → `111` `101` `101` = `111101101`. Because 8 = 2³, the groups are independent; there is nothing to carry. Drop leading zeros from the first group if you want the shortest form (octal 3 is `11`, not `011`), or tick **Keep leading zeros** to keep the full width.",
      },
      {
        heading: "Octal-binary table",
        body: OCTAL_TABLE,
      },
      {
        heading: "Reading chmod values in binary",
        body: "In a permission such as 755, each digit is one class of user (owner, group, others), and each of its three bits is one permission: read (4), write (2), execute (1).\n\n| Octal | Binary | Meaning |\n|---|---|---|\n| 7 | 111 | read, write, execute |\n| 6 | 110 | read, write |\n| 5 | 101 | read, execute |\n| 4 | 100 | read only |\n| 0 | 000 | no access |\n\nSo 644 = `110 100 100` = rw-r--r--, the usual setting for web files, and 755 = rwxr-xr-x for folders and scripts.",
      },
      {
        heading: "Octal to decimal and hex",
        body: "The other fields update at the same time. Octal 755 is 493 in decimal (7 × 64 + 5 × 8 + 5) and 1ED in hex. To go from octal to hex by hand, convert to binary first and regroup the bits in fours: `1 1110 1101` = 1ED. The [hex to binary converter](/hex-to-binary-converter/) does the reverse grouping.",
      },
    ],
    faq: [
      {
        q: "What is 7 in binary?",
        a: "111. It is 4 + 2 + 1, the largest value three bits can hold.",
      },
      {
        q: "What does 755 mean in binary?",
        a: "111 101 101: the owner can read, write and execute (111), and the group and everyone else can read and execute (101).",
      },
      {
        q: "Can octal contain the digit 8?",
        a: "No. Octal uses only 0–7, just as decimal stops at 9. The converter flags 8 or 9 as invalid octal digits.",
      },
    ],
    sources: [{ label: "POSIX chmod: symbolic and octal modes (The Open Group)", url: "https://pubs.opengroup.org/onlinepubs/9799919799/utilities/chmod.html" }],
    related: ["binary-to-octal-converter", "decimal-to-binary-converter", "hex-to-binary-converter", "binary-to-decimal-converter"],
    links: [
      { href: "/binary-to-octal-converter/", anchor: "binary to octal" },
      { href: "/decimal-to-binary-converter/", anchor: "decimal to binary" },
      { href: "/hex-to-binary-converter/", anchor: "hex to binary" },
    ],
    appCategory: "EducationalApplication",
    features: ["Digit-to-three-bits working", "Optional leading zeros", "Decimal and hex shown at the same time", "Rejects invalid digits 8 and 9 with a clear message"],
    indexable: true,
    updated: UPDATED,
    priority: 3,
    formats: { from: ["octal"], to: ["binary"] },
  },
];
