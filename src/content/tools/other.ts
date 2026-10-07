import type { ToolDef } from "@/lib/types";

/*
 * Generators and utilities. Titles, H1s, descriptions and H2 outlines follow
 * docs/keyword-map.json (two descriptions corrected to match what the tools really do:
 * url-opener has no timed delay, find-facebook-id works offline only). Examples are real
 * outputs of src/tools/lib/calc/* run with tsx; random outputs are one actual run.
 */

const UPDATED = "2026-09-30";

export const OTHER_TOOLS: ToolDef[] = [
  /* ---------------- Codes: QR and barcodes ---------------- */
  {
    id: "qr-code-generator",
    path: "/qr-code-generator/",
    name: "QR Code Generator",
    h1: "QR Code Generator",
    title: "QR Code Generator – URL, Wi-Fi and Text QR Codes",
    metaDescription:
      "Create static QR codes for links, Wi-Fi, text, email and phone numbers. Set error correction and size, and download a PNG. Static codes never expire.",
    summary:
      "Create a QR code for a link, Wi-Fi network, text, email, phone number or contact card, and download it as PNG or SVG. The codes are static, so they work for as long as the content does.",
    category: "other-tools",
    subgroup: "codes",
    card: "Make QR codes for links, Wi-Fi, contacts and text as PNG or SVG.",
    archetype: "generator",
    widget: "qr-code",
    aliases: ["qr code maker", "create qr code", "qr generator", "wifi qr code", "qr code for url", "qr code for link", "vcard qr code", "qr code svg", "free qr code", "qr kod"],
    keywords: ["qr", "wifi", "vcard", "menu", "poster", "link"],
    processing: "browser",
    limits: [
      "Static codes only: the content is stored in the image, so it can't be edited after printing and scans can't be counted.",
      "No logo overlay. If you add a logo yourself, use error correction H and test the code.",
    ],
    steps: [
      "Choose the **QR code type**: **URL**, **Text**, **Wi-Fi**, **Email**, **Phone** or **Contact (vCard)**.",
      "Fill in the fields. The code updates as you type.",
      "Open **Size, colors and error correction** to set the **Error correction** level, **Image size**, **Quiet zone** and colors.",
      "Scan the preview with your phone, then press **PNG** or **SVG** to download it.",
    ],
    example: {
      title: "A link at error correction M",
      input: "URL: https://www.example.com/menu · Error correction M · Image size 512",
      output: "Version 3 · 29 × 29 modules · 28 bytes\nPNG: 518 × 518 px (14 px per module, including a 4-module quiet zone)",
      note: "The PNG is rounded to a whole number of pixels per module so the edges stay sharp; the SVG scales to any size.",
    },
    sections: [
      {
        heading: "Static vs dynamic QR codes",
        body: "A **static** QR code stores the content itself (the URL, the Wi-Fi details) in the pattern. Every code made here is static: nothing is hosted, so it can't expire, be switched off or start showing ads, and it keeps working as long as the link it points to does.\n\nA **dynamic** code stores a short redirect address on a provider's server. That lets you change the destination and count scans, but the code stops working if the subscription or the provider ends. For a code you can update without that dependency, point a static code at a page on your own website and change the page.",
      },
      {
        heading: "Wi-Fi, email and contact codes",
        body: "- **Wi-Fi** uses the `WIFI:T:WPA;S:name;P:password;;` format that iOS and Android cameras recognize; scanning offers to join the network. Special characters (`; , : \\ \"`) are escaped for you.\n- **Email** creates a `mailto:` link with an optional subject and message.\n- **Phone** creates a `tel:` link. Include the country code so it dials correctly abroad.\n- **Contact (vCard)** stores a vCard 3.0 card; phones offer to save it as a contact.\n\nThe Wi-Fi password sits in the code as plain text, so anyone who scans it can read it. Use a guest network for codes on public display.",
      },
      {
        heading: "Error correction and logos",
        body: "QR codes include Reed–Solomon error correction, so part of a code can be dirty, scratched or covered and still scan. The QR standard (ISO/IEC 18004) defines four levels:\n\n| Level | Recovers about |\n|---|---|\n| L | 7% |\n| M | 15% |\n| Q | 25% |\n| H | 30% |\n\nHigher levels make the pattern denser, so use **M** for screens and clean prints, and **Q** or **H** for outdoor signs or if you'll place a small logo over the center. The generator doesn't add logos; if you add one in a design tool, keep it well under the recovery limit and test the result.",
      },
      {
        heading: "Size and print guidelines",
        body: "- **Minimum size:** about 2 × 2 cm (0.8 in) for a code scanned at arm's length, such as on a business card.\n- **Distance rule of thumb:** make the code at least one-tenth of the scanning distance wide: 30 cm across for a poster read from 3 m.\n- **Quiet zone:** keep a blank margin of 4 modules on every side. The default setting includes it.\n- **Contrast:** dark modules on a light background. Many scanners can't read inverted (light-on-dark) codes, and the generator warns when contrast falls below 4.5:1.\n\nFor print, download the **SVG**: it stays sharp at any size. Short URLs make simpler codes that are easier to scan small.",
      },
      {
        heading: "Testing before you print",
        body: "Scan the preview with at least two phones (one iPhone, one Android) and from the distance people will use. Check that the link opens the right page over mobile data, not just on office Wi-Fi.\n\nPrint a single test copy at the final size and on the final material: glossy or curved surfaces cause glare and distortion. Codes that link to an address you control can be fixed later; codes with typos in the content can't.",
      },
    ],
    faq: [
      {
        q: "Do these QR codes expire?",
        a: "No. They're static: the content is inside the image and nothing is hosted. A code keeps working as long as the website, network or phone number it contains does.",
      },
      {
        q: "Can I track scans?",
        a: "Not with a static code, because scanning goes straight to your link. Add UTM parameters to the URL (for example `?utm_source=poster`) and count the visits in your analytics instead.",
      },
      {
        q: "What size should a printed QR code be?",
        a: "At least 2 × 2 cm for close scanning, and about one-tenth of the scanning distance for signs. Keep the 4-module quiet zone around it.",
      },
      {
        q: "Is the content I enter sent anywhere?",
        a: "No. The QR code is generated in your browser. Wi-Fi passwords and contact details aren't saved or sent.",
      },
    ],
    sources: [
      { label: "DENSO WAVE: QR code error correction levels", url: "https://www.qrcode.com/en/about/error_correction.html" },
      { label: "DENSO WAVE: QR code standardization (ISO/IEC 18004)", url: "https://www.qrcode.com/en/about/standards.html" },
    ],
    related: ["barcode-generator", "url-opener", "password-generator", "find-facebook-id", "image-resizer"],
    links: [
      { href: "/barcode-generator/", anchor: "barcode generator" },
      { href: "/review-link-generator/", anchor: "Google review QR code" },
      { href: "/url-opener/", anchor: "bulk URL opener" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["URL, text, Wi-Fi, email, phone and vCard QR codes", "Error correction L, M, Q or H", "PNG and SVG downloads with adjustable size and quiet zone", "Color choice with a contrast warning"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "barcode-generator",
    path: "/barcode-generator/",
    name: "Barcode Generator",
    h1: "Barcode Generator",
    title: "Barcode Generator – Code 128, EAN-13 and UPC Barcodes",
    metaDescription:
      "Create Code 128, EAN-13, UPC-A and other barcodes with check digits calculated for you, and download them as PNG or SVG for labels and packaging.",
    summary:
      "Create Code 128, EAN-13, UPC-A, EAN-8, ITF-14 and Code 39 barcodes, with GS1 check digits worked out and shown, and download them as SVG or PNG.",
    category: "other-tools",
    subgroup: "codes",
    card: "Create EAN-13, UPC-A and Code 128 barcodes with the check digit added.",
    archetype: "generator",
    widget: "barcode",
    aliases: ["barcode maker", "create barcode", "code 128 generator", "ean 13 generator", "upc barcode generator", "ean-13 check digit", "itf-14 generator", "code 39 generator", "bar code generator"],
    keywords: ["barcode", "ean", "upc", "gtin", "label", "inventory", "sku"],
    processing: "browser",
    limits: ["The generator draws barcodes for numbers you supply. It can't issue GS1-registered product numbers."],
    steps: [
      "Choose the **Barcode type**.",
      "Type the **Value**. For EAN-13, UPC-A, EAN-8 and ITF-14, enter the digits without the check digit and it's added for you.",
      "Adjust **Bar width** and **Height**, and choose whether to show the number under the bars.",
      "Press **SVG** for print and design work, or **PNG** for documents and web pages.",
    ],
    example: {
      title: "EAN-13 check digit",
      input: "EAN-13 · 400638133393",
      output: "4006381333931\nWeighted sum = 89; check digit = (10 − 89 mod 10) mod 10 = 1",
    },
    sections: [
      {
        heading: "Choosing a barcode type",
        body: "| Type | Holds | Typical use |\n|---|---|---|\n| EAN-13 | 13 digits | Retail products worldwide |\n| UPC-A | 12 digits | Retail products in the US and Canada |\n| EAN-8 | 8 digits | Small packs with little label space |\n| ITF-14 | 14 digits | Outer cartons and cases (GTIN-14) |\n| Code 128 | Letters, digits, symbols | Shipping, inventory, asset tags, serial numbers |\n| Code 39 | A–Z, 0–9 and a few symbols | Older industrial and ID systems |\n\nFor internal labels (stock locations, asset numbers), **Code 128** is the usual choice: it's compact and holds any text you need. Retail products need EAN or UPC numbers from GS1.",
      },
      {
        heading: "EAN and UPC check digits",
        body: "The last digit of every EAN, UPC and ITF-14 number is a check digit that lets scanners catch misreads. GS1's method:\n\n1. Starting from the rightmost data digit, multiply digits alternately by 3 and 1.\n2. Add the results.\n3. The check digit is the amount needed to reach the next multiple of 10: (10 − sum mod 10) mod 10.\n\nFor 400638133393 the weighted sum is 89, so the check digit is 1 and the full EAN-13 is 4006381333931. Enter a full number and the generator verifies the check digit instead, and tells you the correct one if it's wrong.",
      },
      {
        heading: "Do you need GS1-registered numbers?",
        body: "For products sold through retailers or marketplaces, yes. EAN-13 and UPC-A numbers (GTINs) are only unique because GS1 member organizations issue company prefixes; a number you invent may belong to another company's product, and major retailers and marketplaces check GTINs against the GS1 registry.\n\nYou don't need GS1 numbers for barcodes used only inside your business: warehouse locations, asset tags, library or membership cards. Use Code 128 with your own numbering for those.",
      },
      {
        heading: "Print size and quiet zones",
        body: "- **EAN-13** is about 37.29 × 25.93 mm at 100% magnification; GS1 allows 80% to 200% for most retail packaging.\n- **Quiet zones**: leave blank space on both sides of the bars: 11 modules on the left and 7 on the right of an EAN-13, 9 on each side of a UPC-A, and at least 10 times the narrowest bar for Code 128 and ITF-14.\n- **Bar height**: don't shorten (truncate) retail barcodes; it makes them harder to scan in any direction.\n- **Colors**: black bars on a white background scan best. Red bars don't work, because many scanners use red light.\n\nDownload the **SVG** for print so bar widths stay exact, and test a printed sample with a scanner.",
      },
    ],
    faq: [
      {
        q: "Can I make a barcode for a retail product myself?",
        a: "You can draw it here, but the number must be a GTIN licensed from GS1 (or your country's GS1 office) for retail use. The barcode image itself doesn't need to be bought.",
      },
      {
        q: "What's the difference between EAN-13 and UPC-A?",
        a: "UPC-A has 12 digits and EAN-13 has 13. A UPC-A number is the same as an EAN-13 with a leading 0, and checkout scanners worldwide read both.",
      },
      {
        q: "What size should a barcode be?",
        a: "Retail EAN-13 codes are normally printed at 80% to 200% of the 37.29 × 25.93 mm nominal size, with full quiet zones. Internal Code 128 labels can be smaller if your scanners read them reliably.",
      },
    ],
    sources: [
      { label: "GS1 General Specifications", url: "https://www.gs1.org/standards/barcodes-epcrfid-id-keys/gs1-general-specifications" },
      { label: "GS1: Check digit calculator", url: "https://www.gs1.org/services/check-digit-calculator" },
      { label: "GS1: How to get a barcode", url: "https://www.gs1.org/standards/get-barcodes" },
    ],
    related: ["qr-code-generator", "credit-card-generator", "password-generator", "fake-name-generator"],
    links: [
      { href: "/qr-code-generator/", anchor: "QR code generator" },
      { href: "/generate-list-of-numbers/", anchor: "generate sequential numbers" },
    ],
    appCategory: "BusinessApplication",
    features: ["Code 128, EAN-13, UPC-A, EAN-8, ITF-14 and Code 39", "GS1 check digit added or verified, with the working shown", "SVG and PNG downloads", "Adjustable bar width, height and text"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  /* ---------------- Security: passwords ---------------- */
  {
    id: "password-generator",
    path: "/password-generator/",
    name: "Password Generator",
    h1: "Password Generator",
    title: "Password Generator – Strong Random Passwords and Passphrases",
    metaDescription:
      "Create strong random passwords or memorable passphrases in your browser with a cryptographically secure generator. Set length, symbols and exclusions.",
    summary:
      "Create strong random passwords or memorable passphrases in your browser, with the strength shown in bits of entropy. Nothing is stored or sent anywhere.",
    category: "other-tools",
    subgroup: "security",
    card: "Generate strong random passwords and passphrases with Web Crypto.",
    archetype: "generator",
    widget: "password",
    aliases: ["random password generator", "strong password generator", "secure password generator", "passphrase generator", "password maker", "pasword generator", "16 character password", "password without symbols", "diceware"],
    keywords: ["password", "passphrase", "security", "entropy", "random"],
    processing: "browser",
    steps: [
      "A password is ready when the page loads. Press **Copy** to use it, or **Regenerate** for another.",
      "Set the **Length** with the slider or the number box, and choose which **Characters** to include.",
      "Tick **Exclude look-alike characters** if the password will be read or typed by hand.",
      "For something memorable, switch **Type** to **Passphrase** and choose the number of **Words** and a **Separator**.",
    ],
    example: {
      title: "Defaults (one run)",
      input: "Password · 16 characters · all four character sets\nPassphrase · 6 words · hyphen",
      output: "q91RB_9$p-)StUD5 (90 characters, 103.9 bits)\njigsaw-cliff-polar-waffle-fig-hermit (1,451 words, 63.0 bits)",
      note: "Each press of Regenerate gives a different result; these are one real run.",
    },
    sections: [
      {
        heading: "Length vs complexity",
        body: "Strength comes from the number of possible passwords, measured in bits of entropy: length × log₂(characters to choose from).\n\n| Password | Bits |\n|---|---|\n| 8 characters, lowercase only | 37.6 |\n| 8 characters, all 94 printable ASCII | 52.4 |\n| 12 characters, letters and digits | 71.5 |\n| 16 characters, letters and digits | 95.3 |\n| 16 characters, all four sets here (90) | 103.9 |\n\nAdding length beats adding symbols: four extra letters-and-digits characters add 23.8 bits, while widening an 8-character letters-and-digits password to all 94 printable characters adds only 4.8. NIST SP 800-63B now asks services to require at least 15 characters when a password is the only sign-in factor.",
      },
      {
        heading: "Passphrases",
        body: "A passphrase strings random words together, such as `jigsaw-cliff-polar-waffle-fig-hermit`. Each word drawn from this generator's list of 1,451 common words adds 10.5 bits, so:\n\n- 4 words ≈ 42 bits: too weak for anything important.\n- 5 words ≈ 52.5 bits.\n- 6 words ≈ 63 bits: a good choice for a password manager's master password or a device you type into often.\n\nThe words must be chosen randomly, as here; a phrase you think up yourself is far easier to guess. **Capitalize each word** adds no strength because attackers try it; **Add a number** adds about 5.9 bits for six words.",
      },
      {
        heading: "Excluding look-alike characters",
        body: "**Exclude look-alike characters** removes `I l 1 | O 0 o`, which are easy to confuse in many fonts. Use it for passwords that will be read aloud, printed, or typed from a phone screen, such as Wi-Fi keys. It shrinks the pool from 90 to 83 characters, so a 16-character password drops from 103.9 to 102.0 bits: add a character if that matters to you.\n\nIf a site rejects certain symbols, untick **Symbols** and add three or four characters of length instead.",
      },
      {
        heading: "How the passwords are generated (Web Crypto)",
        body: "Characters are picked with `crypto.getRandomValues`, the browser's cryptographically secure random number generator, never `Math.random`. Each pick uses rejection sampling, so every character in the pool is exactly equally likely (no modulo bias). With **Use every selected type at least once**, passwords missing a selected type are discarded and drawn again, which keeps the result uniform among passwords that meet the rule.\n\nGeneration happens on your device. Passwords aren't saved in your browser, sent to our server or logged; only your option choices (length, sets) are remembered.",
      },
      {
        heading: "Storing passwords safely",
        body: "Use a different password for every account, and keep them in a password manager (built into most browsers and phones, or a dedicated app) rather than a document or notes app. Then you need to remember only one strong passphrase.\n\nTurn on two-step verification or passkeys where offered. NIST's guidance is to change a password when there's evidence it was compromised, not on a schedule. Check whether an email address appears in known breaches with a service such as Have I Been Pwned.",
      },
    ],
    faq: [
      {
        q: "How long should a password be?",
        a: "At least 15 characters for accounts protected by a password alone, as NIST SP 800-63B now requires services to accept. With a password manager, 16 to 20 random characters cost you nothing extra.",
      },
      {
        q: "Are generated passwords stored?",
        a: "No. They exist only on this page in your browser and disappear when you leave or regenerate. Only non-secret settings such as length are remembered.",
      },
      {
        q: "Are passphrases as secure as random passwords?",
        a: "Per character they're weaker, but a six-word random passphrase (about 63 bits) is stronger than a random 10-character letters-and-digits password (about 60 bits) and much easier to type and remember.",
      },
    ],
    sources: [
      { label: "NIST SP 800-63B-4: Digital Identity Guidelines, Authentication (passwords)", url: "https://pages.nist.gov/800-63-4/sp800-63b.html" },
      { label: "MDN: Crypto.getRandomValues()", url: "https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues" },
    ],
    related: ["qr-code-generator", "credit-card-generator", "fake-name-generator", "barcode-generator"],
    links: [
      { href: "/random-string-generator/", anchor: "random string generator" },
      { href: "/encryption-generator/", anchor: "encryption key generator" },
      { href: "/hash-generator/", anchor: "hash generator" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["crypto.getRandomValues with rejection sampling", "Length 4–128 with slider and number field", "Passphrases from a 1,451-word list", "Entropy in bits, look-alike exclusion, up to 50 at once"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  /* ---------------- Test data for developers ---------------- */
  {
    id: "credit-card-generator",
    path: "/credit-card-generator/",
    name: "Test Card Number Generator",
    h1: "Test Credit Card Number Generator",
    title: "Test Credit Card Number Generator – Luhn-Valid Dummy Cards",
    metaDescription:
      "Generate Luhn-valid dummy card numbers for testing form validation. They aren't real accounts and won't pass payment authorization. For developers and QA.",
    summary:
      "Generate Luhn-valid dummy card numbers with real network prefixes for testing form validation, and check any number's Luhn checksum. They aren't real cards and can't be used to pay.",
    category: "other-tools",
    subgroup: "testdata",
    card: "Generate Luhn-valid test card numbers for checking payment form validation.",
    archetype: "generator",
    widget: "test-data",
    config: { mode: "cards" },
    aliases: ["test credit card numbers", "dummy card numbers", "luhn generator", "fake credit card generator", "test card numbers", "luhn validator", "credit card validator", "visa test number", "card number generator"],
    keywords: ["luhn", "qa", "testing", "payment form", "validation", "developer"],
    processing: "browser",
    limits: [
      "For testing form validation only. The numbers are random digits with a valid checksum: they have no expiry date, security code or account, and gateways decline them.",
      "To test real payment flows, use your payment provider's sandbox and its official test cards.",
    ],
    steps: [
      "Choose a **Card network (prefix)** and the **Quantity**.",
      "Press **Generate numbers**. Untick **Group digits with spaces** to get plain digits.",
      "Press **Copy all**, **CSV** or **JSON** to use them in your tests.",
      "Paste any number into the **Luhn validator** to check its checksum and prefix.",
    ],
    example: {
      title: "Three Visa-prefix test numbers (one run) and a validator check",
      input: "Visa · Quantity 3\nValidator: 4242 4242 4242 4242 and 4242 4242 4242 4243",
      output: "4387 7257 9634 3223\n4233 7923 1759 8624\n4004 5766 3281 2803\n4242 4242 4242 4242 passes (Visa prefix, 16 digits)\n4242 4242 4242 4243 fails: the last digit would need to be 2",
    },
    sections: [
      {
        heading: "What these numbers are and aren't",
        body: "These are **test numbers**: a network prefix followed by random digits and a check digit, so they pass the same Luhn check that payment forms run before submitting. They're useful for testing input masks, card-type detection, validation messages and database fields.\n\nThey aren't issued by any bank, have no expiry date or security code, and aren't linked to an account. A payment gateway will decline them at authorization. Using made-up numbers to obtain goods, services or free trials is fraud in most countries; this page is for software testing only.",
      },
      {
        heading: "How the Luhn check works",
        body: "The Luhn algorithm (ISO/IEC 7812-1) catches single-digit typos and most swapped neighbors:\n\n1. Starting from the right, double every second digit (the check digit itself is not doubled).\n2. If doubling gives more than 9, subtract 9.\n3. Add all the digits. The number is valid when the total is a multiple of 10.\n\nFor 4242 4242 4242 4242 the total is 80, so it passes; change the last digit to 3 and the total is 81, so it fails. The generator works backwards: it picks every digit except the last, then chooses the last digit that makes the total a multiple of 10.",
      },
      {
        heading: "Card prefixes by network",
        body: "The first digits (the IIN or BIN) identify the network and card length:\n\n| Network | Prefix | Length |\n|---|---|---|\n| Visa | 4 | 16 |\n| Mastercard | 51–55, 2221–2720 | 16 |\n| American Express | 34, 37 | 15 |\n| Discover | 6011, 644–649, 65 | 16 |\n| JCB | 3528–3589 | 16 |\n| Diners Club International | 36 | 14 |\n| UnionPay | 62 | 16 |\n\nSome networks also issue other lengths (Visa 13 or 19 digits, for example). Make your form accept 12 to 19 digits and rely on the gateway for the final check.",
      },
      {
        heading: "Use your gateway's official test cards",
        body: "To test payments end to end (authorization, 3-D Secure, declines, refunds), use the sandbox and published test cards from your provider. Stripe documents numbers such as 4242 4242 4242 4242 with outcomes for each, and PayPal's sandbox has its own card generator. Those numbers trigger predictable responses in test mode and are rejected in live mode.\n\nNever use real customer card numbers in test environments; PCI DSS requires that live card data stays out of development and testing.",
      },
    ],
    faq: [
      {
        q: "Can these numbers be used to buy things?",
        a: "No. They aren't connected to any account and have no expiry date or security code, so authorization fails. They're for checking that your forms validate input correctly.",
      },
      {
        q: "Why do payment gateways reject them?",
        a: "Gateways ask the issuing bank to authorize each payment. No bank issued these numbers, so the request is declined. In test mode, gateways accept only their own published test cards.",
      },
      {
        q: "Where are Stripe or PayPal test cards?",
        a: "In their developer documentation: Stripe's testing guide lists cards by brand and outcome, and PayPal's sandbox card testing page generates test cards for its sandbox.",
      },
    ],
    sources: [
      { label: "Stripe Docs: Testing (test card numbers)", url: "https://docs.stripe.com/testing" },
      { label: "PayPal Developer: Card testing in the sandbox", url: "https://developer.paypal.com/tools/sandbox/card-testing/" },
      { label: "ISO/IEC 7812-1: Identification cards (Luhn check digit, Annex B)", url: "https://www.iso.org/standard/70484.html" },
    ],
    related: ["fake-name-generator", "password-generator", "barcode-generator", "boy-name-generator"],
    links: [
      { href: "/uuid-generator/", anchor: "UUID generator" },
      { href: "/random-number-generator/", anchor: "random number generator" },
      { href: "/fake-name-generator/", anchor: "fake name generator" },
    ],
    appCategory: "DeveloperApplication",
    features: ["Luhn-valid numbers with seven network prefixes", "Up to 100 at once, grouped or plain", "CSV and JSON export", "Luhn validator with network detection and the expected check digit"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "fake-name-generator",
    path: "/fake-name-generator/",
    name: "Fake Name Generator",
    h1: "Fake Name Generator",
    title: "Fake Name Generator – Random Test Identities by Country",
    metaDescription:
      "Generate fictional names with matching test emails, phone formats and addresses by country for forms, demos and QA databases. Export as CSV or JSON.",
    summary:
      "Generate fictional people for forms, demos and test databases: names with matching example.com emails, phone numbers from ranges reserved for fiction, and addresses for five countries. Export as CSV or JSON.",
    category: "other-tools",
    subgroup: "testdata",
    card: "Generate fictional test people with emails, phones and addresses by country.",
    archetype: "generator",
    widget: "test-data",
    config: { mode: "names" },
    aliases: ["random name generator", "fake identity generator", "random person generator", "test user generator", "fake address generator", "dummy data generator", "mock user data", "random names by country", "fake people generator"],
    keywords: ["test data", "qa", "mock", "seed data", "demo", "csv"],
    processing: "browser",
    isNew: true,
    steps: [
      "Choose a **Country** and **Gender**.",
      "Tick the **Fields** you need: email, username, phone, address and date of birth.",
      "Set **How many** (up to 500) and press **Generate people**.",
      "Press **Copy CSV**, **CSV** or **JSON** to use the data.",
    ],
    example: {
      title: "Two people (one run)",
      input: "United Kingdom; United States · email, phone and address",
      output: "Ava Hughes · ava.hughes63@example.net · 07700 900096 · 54 Victoria Road, Sheffield, South Yorkshire S1 9ZE\nHannah Garcia · hannah.garcia59@example.net · +1 612-555-0175 · 308 Elm Street, Minneapolis, MN 55401",
    },
    sections: [
      {
        heading: "Choosing country and gender",
        body: "Five countries are supported: the **United States**, **United Kingdom**, **Canada**, **Australia** and **India**. Each has its own list of common given names and surnames, street names, cities with their real state or region, and the local postal code and phone formats.\n\n**Gender** filters the first-name list; **Any** mixes both. Names are popular, everyday names combined at random, so a generated name can match a real person's name by coincidence, as any common name does. That's why the other fields are deliberately unusable.",
      },
      {
        heading: "Fields you can include",
        body: "- **Email** uses `example.com`, `example.net` or `example.org`, domains reserved by RFC 2606 that can never receive mail.\n- **Phone** uses numbers regulators reserve for fiction: 555-0100 to 555-0199 in the US and Canada, Ofcom's 07700 900000–900999 drama range in the UK, and ACMA's (0X) 5550 xxxx range in Australia. India has no published fictional range, so its phone field is left blank.\n- **Address** combines an invented street with a real city, region and postal area so address forms accept it.\n- **Username** and **Date of birth** (1950–2006) are random.",
      },
      {
        heading: "Exporting test data",
        body: "**CSV** gives one row per person with separate columns (first_name, last_name, gender, email, street, city, region, postal_code, country…), ready for a spreadsheet or a database import. **JSON** gives an array of objects with the same keys for seed scripts and API mocks. **Copy CSV** puts the same CSV on your clipboard.\n\nUp to 500 people per batch; press **Generate people** again for more. For unique IDs to go with each record, use the [UUID generator](/uuid-generator/).",
      },
      {
        heading: "Using fake data responsibly",
        body: "Fictional data is for software testing, demos, screenshots and training material. Don't use it to deceive people or organizations: creating accounts under a false identity breaks most services' terms and can be illegal, for example on official, financial or age-restricted services.\n\nKeep test data out of production systems, and never mix real customers' personal data into test environments; data-protection laws such as the GDPR apply to real people's data wherever it's stored.",
      },
    ],
    faq: [
      {
        q: "Are these real people?",
        a: "No. Each record combines a common first name and surname at random with an example.com email, a reserved fictional phone number and an invented street. A name may match a real person's, as common names do, but the details don't belong to anyone.",
      },
      {
        q: "Can I generate hundreds at once?",
        a: "Yes, up to 500 per batch, and you can export them as CSV or JSON.",
      },
      {
        q: "Which countries are supported?",
        a: "The United States, United Kingdom, Canada, Australia and India, each with local names, cities, postal codes and (except India) fictional phone numbers.",
      },
    ],
    sources: [
      { label: "RFC 2606: Reserved top-level DNS names (example.com)", url: "https://www.rfc-editor.org/rfc/rfc2606" },
      { label: "Ofcom: Telephone numbers for use in TV and radio drama", url: "https://www.ofcom.org.uk/phones-and-broadband/phone-numbers/numbers-for-drama" },
      { label: "ACMA: Phone numbers for use in TV shows, films and creative works", url: "https://www.acma.gov.au/phone-numbers-use-tv-shows-films-and-creative-works" },
    ],
    related: ["credit-card-generator", "password-generator", "boy-name-generator", "barcode-generator"],
    links: [
      { href: "/credit-card-generator/", anchor: "test credit card numbers" },
      { href: "/uuid-generator/", anchor: "UUID generator" },
      { href: "/random-string-generator/", anchor: "random string generator" },
    ],
    appCategory: "DeveloperApplication",
    features: ["Five countries with local name, address and phone formats", "example.com emails and regulator-reserved fictional phone numbers", "Choose fields; up to 500 records per batch", "CSV and JSON export"],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },
  {
    id: "boy-name-generator",
    path: "/boy-name-generator/",
    name: "Boy Name Generator",
    h1: "Boy Name Generator",
    title: "Boy Name Generator – Ideas by First Letter, Length, Origin",
    metaDescription:
      "Browse boy name ideas filtered by starting letter, length and origin (English, Arabic, Sanskrit, Greek and more). Tap a name to copy it or save a shortlist.",
    summary:
      "Browse boy name ideas filtered by first letter, length and origin, with the meaning shown where the name's history is well established. Tap a name to copy it, or star it for a shortlist.",
    category: "other-tools",
    subgroup: "utilities",
    card: "Browse boy names by first letter, length and origin, and build a shortlist.",
    archetype: "generator",
    widget: "test-data",
    config: { mode: "boy-names" },
    aliases: ["baby boy names", "boy names", "boys name generator", "unique boy names", "short boy names", "boy names by origin", "baby name generator", "boy names starting with a"],
    keywords: ["baby", "names", "meaning", "origin", "shortlist"],
    processing: "browser",
    steps: [
      "Use **Starts with**, **Length** and **Origin** to narrow the list, or leave them on **Any**.",
      "Press **Shuffle** for a new random order, or set **Order** to **A to Z**.",
      "Tap a name to copy it. Press the star to add it to your **Shortlist**.",
      "Press **Copy** on the shortlist to share it. Your shortlist stays in this browser.",
    ],
    example: {
      title: "Filtered list",
      input: "Starts with A · Origin Sanskrit",
      output: "Aarav · Sanskrit\nAditya · Sanskrit · belonging to Aditi; a name of the sun\nAkash · Sanskrit · sky\nAnand · Sanskrit · joy, bliss\nArjun · Sanskrit · bright, white\nArnav · Sanskrit · ocean\nAryan · Sanskrit · noble",
      note: "Shown A to Z. Aarav has no meaning listed because its derivation isn't settled.",
    },
    sections: [
      {
        heading: "Filtering by letter and length",
        body: "**Starts with** lists only the letters that names in the list begin with. **Length** counts letters: short names (3–4 letters, such as Leo, Finn or Omar) are easy to spell in any language; long names (7 letters and more, such as Sebastian or Theodore) often come with a ready-made short form.\n\nSay a shortlisted first name aloud with your surname: names ending in the sound your surname starts with tend to run together.",
      },
      {
        heading: "Names by origin",
        body: "**Origin** is the language a name comes from, not the countries where it's used today. Many names travelled: James comes from Hebrew through Latin, Liam is an Irish short form of the Germanic William, and Kabir is Arabic but widely used in India.\n\nOrigins in the list: Arabic, English, Germanic, Greek, Hebrew, Irish, Japanese, Latin, Persian, Sanskrit, Slavic, Spanish, Turkish and Welsh. The list is a modest, curated set of about 170 names, not a complete dictionary.",
      },
      {
        heading: "Meanings and sources",
        body: "Meanings are given only where the etymology is well established in standard references such as the *Oxford Dictionary of First Names* and Behind the Name. Where scholars disagree (Oliver, Arthur, Caleb) or the meaning depends on how the name is written (Japanese names, whose meaning comes from the kanji chosen), the meaning is left blank rather than guessed.\n\nPopular \"meaning\" lists online often repeat unsourced folk etymologies. If a meaning matters to your family, check it in a dictionary of names for that language.",
      },
      {
        heading: "Building a shortlist",
        body: "Press the star next to any name to add it to the **Shortlist** panel. The shortlist is saved in this browser only, so it's still there next time you visit on the same device, and nothing is sent to us. Press **Copy** to paste the list into a message, or **Clear** to start again.\n\nTo pick one at random from a final list, paste it into the [random line picker](/random-line-picker/).",
      },
    ],
    faq: [
      {
        q: "Where do the names and meanings come from?",
        a: "From a curated list compiled for this page. Meanings follow standard name dictionaries and are left blank where the origin is uncertain or disputed.",
      },
      {
        q: "Can I filter by origin?",
        a: "Yes. Choose from 14 origins, including Arabic, Hebrew, Sanskrit, Greek, Latin and Irish, and combine it with a first letter and length.",
      },
      {
        q: "Can I save favourites?",
        a: "Yes. Star a name to add it to your shortlist, which is kept in this browser. Use **Copy** to send it to someone else.",
      },
    ],
    sources: [{ label: "Behind the Name: the etymology and history of first names", url: "https://www.behindthename.com/" }],
    related: ["fake-name-generator", "random-line-picker", "password-generator", "url-opener"],
    links: [{ href: "/random-line-picker/", anchor: "pick one at random from your shortlist" }],
    appCategory: "UtilitiesApplication",
    features: ["About 170 boy names with origin", "Meanings only where the etymology is well established", "Filters for first letter, length and origin", "Tap to copy and a saved shortlist"],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },
  /* ---------------- Other utilities ---------------- */
  {
    id: "url-opener",
    path: "/url-opener/",
    name: "Bulk URL Opener",
    h1: "Bulk URL Opener",
    title: "Bulk URL Opener – Open Multiple URLs at Once",
    metaDescription:
      "Paste a list of links and open them in new tabs in batches. Duplicates and invalid URLs are removed first, and any tabs your browser blocks are listed.",
    summary:
      "Paste a list of links and open them in new tabs, a batch at a time. Duplicates and invalid entries are removed first, and any tab your browser blocks is listed so you can open it by hand.",
    category: "other-tools",
    subgroup: "utilities",
    card: "Open a list of URLs in new tabs in batches, with blocked tabs listed.",
    archetype: "transform",
    widget: "url-opener",
    aliases: ["open multiple urls", "bulk url opener", "multiple url opener", "open multiple links at once", "open urls in tabs", "url opener", "link opener", "mass url opener"],
    keywords: ["tabs", "links", "bulk", "popup", "batch"],
    processing: "browser",
    limits: ["Browsers open one tab per click unless you allow pop-ups for this site. Most mobile browsers open only one."],
    steps: [
      "Paste your links into **URLs (one per line)**. Bare domains get https:// added.",
      "Choose **Tabs per click**: 5, 10, 20 or **All at once**.",
      "Press **Open first 10**, then **Open next 10** until the list is done.",
      "If tabs are blocked, allow pop-ups for this site and press **Start again**, or click the blocked links in **Links**.",
    ],
    example: {
      title: "Cleaning a list",
      input: "https://example.com/\nexample.org\nhttps://www.iana.org/domains/reserved\nhttps://example.com/\nnot a link",
      output: "3 to open: https://example.com/, https://example.org/, https://www.iana.org/domains/reserved\n1 duplicate removed · 1 skipped (not a link)",
    },
    sections: [
      {
        heading: "Allowing pop-ups",
        body: "Browsers block pages from opening several tabs from one click, to stop pop-up spam. The first tab usually opens; the rest are blocked unless you allow pop-ups for this site:\n\n- **Chrome and Edge:** click the blocked pop-up icon at the right of the address bar, choose **Always allow pop-ups and redirects**, then **Done**.\n- **Firefox:** in the yellow bar, choose **Options** and **Allow pop-ups for this site**.\n- **Safari (Mac):** **Safari → Settings for This Website → Pop-up Windows → Allow**.\n\nThe tool detects each blocked tab and marks it **Blocked**, so you know exactly which links still need opening.",
      },
      {
        heading: "Delay and batch size",
        body: "There's no timed delay between tabs: browsers count a tab opened after a delay as a pop-up with no click behind it and block it even more readily. Instead, each click opens a batch. **Tabs per click** sets how many: 10 is a comfortable number to review before moving on, and **All at once** opens the whole list.\n\nOpening dozens of heavy pages together can slow your computer, because every tab loads at the same time. Smaller batches also make it easier to keep track of where you are.",
      },
      {
        heading: "Cleaning the list",
        body: "Before anything opens, the list is tidied up:\n\n- One URL per line; spaces or commas between URLs on the same line also work.\n- `example.org` becomes `https://example.org/`.\n- Exact duplicates are removed, keeping the first.\n- Lines that aren't web addresses, and links that aren't http or https (such as `ftp:` or `javascript:`), are skipped and listed.\n\nTo check where links lead without opening them, use the [HTTP status checker](/http-status-checker/) instead.",
      },
      {
        heading: "Browser limits on tabs",
        body: "There's no fixed limit on the list, but each open tab uses memory: around 100–300 MB for a typical modern page. Twenty tabs is fine on most computers; a few hundred will slow most machines. Browsers may also put background tabs to sleep and reload them when you switch to them.\n\nOn phones, most browsers open only one tab per tap whatever the settings, and tab limits are lower. The **Links** list works as a tap-through list instead.",
      },
    ],
    faq: [
      {
        q: "Why do only some tabs open?",
        a: "Your browser's pop-up blocker allows one new tab per click from a web page. Allow pop-ups for this site, press **Start again**, and the full batch will open.",
      },
      {
        q: "Is there a limit on URLs?",
        a: "Not in the tool. The practical limit is your computer's memory; open large lists in batches of 10 or 20.",
      },
      {
        q: "Does it work on mobile?",
        a: "Partly. Mobile browsers usually open one tab per tap, so use the numbered **Links** list to open each one.",
      },
    ],
    sources: [
      { label: "Google Chrome Help: Block or allow pop-ups in Chrome", url: "https://support.google.com/chrome/answer/95472" },
      { label: "Mozilla Support: Pop-up blocker settings in Firefox", url: "https://support.mozilla.org/kb/pop-blocker-settings-exceptions-troubleshooting" },
    ],
    related: ["remove-duplicate-lines", "qr-code-generator", "find-facebook-id", "sort-text-lines"],
    links: [
      { href: "/http-status-checker/", anchor: "check the URLs' status instead" },
      { href: "/remove-duplicate-lines/", anchor: "remove duplicate lines" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["Opens links in batches of 5, 10, 20 or all", "Removes duplicates and non-http(s) entries", "Detects and lists tabs blocked by the browser", "Numbered link list for manual opening"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "find-facebook-id",
    path: "/find-facebook-id/",
    name: "Find Facebook Page ID",
    h1: "Find Facebook Page ID",
    title: "Find Facebook ID – Get a Page or Profile's Numeric ID",
    metaDescription:
      "Extract the numeric ID of a Facebook Page or profile from a URL or pasted page source, or use the manual method in Page settings. Nothing is sent to Facebook.",
    summary:
      "Pull the numeric ID of a Facebook Page, profile or group out of a URL or the page's source code, or follow the manual steps. It works offline and never contacts Facebook.",
    category: "other-tools",
    subgroup: "utilities",
    card: "Extract a Facebook Page or profile's numeric ID from a URL or page source.",
    archetype: "analyzer",
    widget: "facebook-id",
    aliases: ["facebook id finder", "facebook page id", "find facebook page id", "facebook profile id", "fb id finder", "facebook numeric id", "find my facebook id", "facebook group id"],
    keywords: ["facebook", "page id", "profile id", "pixel", "graph api"],
    processing: "browser",
    limits: ["Usernames (facebook.com/name) don't contain the ID, and this tool doesn't look anything up online. Use the page source or Page settings for those."],
    steps: [
      "Paste a Facebook URL into **Facebook URL or page source**. If the URL ends in a username, open the page on a computer, press **Ctrl+U**, copy all of the source and paste that instead.",
      "Read the IDs under **Numeric IDs found**, with the pattern each came from and how often it appeared.",
      "Press **Copy ID**, or **Check on Facebook** to confirm it opens the right Page or profile.",
    ],
    example: {
      title: "URLs that contain an ID",
      input: "https://www.facebook.com/profile.php?id=100064581837321\nhttps://www.facebook.com/people/Jane-Example/100089123456789/",
      output: "100064581837321 · likely a page or profile · from profile.php?id= URL\n100089123456789 · likely a profile · from /people/name/ID URL",
    },
    sections: [
      {
        heading: "Finding the ID from a URL",
        body: "Some Facebook addresses include the numeric ID, and the tool reads it directly:\n\n- `facebook.com/profile.php?id=100064581837321` (profiles and newer Pages without a username)\n- `facebook.com/people/Name/100089123456789/`\n- `facebook.com/Page-Name-123456789012345/` and `facebook.com/pages/Name/ID/` (older Page URLs)\n- `facebook.com/groups/987654321098765`\n- `fb://page/…` and `fb://profile/…` app links\n\nAddresses ending in a username, such as `facebook.com/nasa`, don't contain the number. Resolving a username needs Facebook's servers, and this tool doesn't contact them.",
      },
      {
        heading: "Manual method: About section and page source",
        body: "**If you manage the Page:** open it while logged in as an admin, go to **About → Page transparency**, and copy the **Page ID**. Meta Business Suite shows it in the Page's settings too.\n\n**For any public Page or profile:** open it in a desktop browser, press **Ctrl+U** (**⌘+Option+U** on a Mac) to view the source, select all, copy and paste it into the box. The tool searches for fields such as `\"pageID\"`, `\"profile_id\"` and `fb://page/` app links. IDs belonging to the account you were logged in with (`USER_ID`, `actorID`) are recognized and ignored, so they aren't mistaken for the Page's ID.",
      },
      {
        heading: "Page ID vs profile ID vs username",
        body: "- A **username** (vanity URL) is the readable part of the address, such as `nasa`. It can be changed.\n- A **profile ID** identifies a personal account; a **Page ID** identifies a business or public-figure Page; a **group ID** identifies a group. These numbers don't change when the username does.\n\nIntegrations usually want the number: Graph API calls and several Meta Business settings refer to the Page ID. Make sure you copy the Page's ID, not your own profile's, when setting these up.",
      },
      {
        heading: "Why some IDs can't be looked up",
        body: "Facebook's Graph API no longer returns a Page's ID from its username without an access token from an approved app, and Facebook pages block automated fetching. Tools that claim to look up any username either use an access token you have to supply or scrape Facebook against its terms.\n\nThis tool avoids both: it reads only what you paste. If the source you paste comes from a private profile or a page you can't see, the ID won't be in it.",
      },
    ],
    faq: [
      {
        q: "Where do I find my Facebook Page ID?",
        a: "Open your Page, go to **About** and then **Page transparency**; the Page ID is listed there. You can also paste the Page's source into this tool.",
      },
      {
        q: "Can I find a private profile's ID?",
        a: "Only if the ID appears in a URL or page source you can see, such as a profile.php?id= link. The tool can't reveal anything Facebook doesn't show you.",
      },
      {
        q: "Why did the lookup fail?",
        a: "Most likely the URL uses a username, which doesn't contain the number. Paste the full page source from a desktop browser, or use the Page transparency method.",
      },
    ],
    sources: [{ label: "Meta for Developers: Graph API Page reference", url: "https://developers.facebook.com/docs/graph-api/reference/page/" }],
    related: ["url-opener", "qr-code-generator", "fake-name-generator", "remove-duplicate-lines"],
    links: [
      { href: "/open-graph-checker/", anchor: "check how links look on Facebook" },
      { href: "/qr-code-generator/", anchor: "QR code generator" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["Reads IDs from profile, people, pages, group and fb:// URLs", "Searches pasted page source for Page and profile ID fields", "Ignores the logged-in viewer's own ID", "Works offline; never contacts Facebook"],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },
];
