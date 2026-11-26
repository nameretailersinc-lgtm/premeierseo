---
{
  "title": "How to Create a QR Code for a Website That Scans Reliably",
  "metaTitle": "How to Make a QR Code for a Website That Scans Well",
  "metaDescription": "Make a QR code for a website that keeps working: choose the right link, static or dynamic code, safe colors, print size and logo settings, then test it.",
  "excerpt": "Creating the code takes a minute. Choosing a link that will last, sizing it for print and testing it are what keep it working.",
  "category": "QR codes",
  "focusKeyword": "qr code for website",
  "secondaryKeywords": ["turn a link into a qr code", "create a qr code for a url"],
  "tags": ["qr code", "print", "links"],
  "relatedTools": ["qr-code-generator", "barcode-generator", "review-link-generator", "url-slug-generator"],
  "cover": { "headline": "A QR code that scans", "motif": "qr" },
  "coverAlt": "Illustration of a website address being turned into a QR code",
  "faqs": [
    { "q": "Does a static QR code expire?", "a": "The image itself has no expiry, because the address is stored inside it. It stops being useful if the page it points to is removed or moved without a redirect." },
    { "q": "Can I change where a printed code goes?", "a": "Not for a static code. If you point it at a page on your own site, you can later change that page or redirect it." }
  ]
}
---
A QR code for a website is a link drawn as a pattern. Phones read the pattern and offer to open the address. Making one is quick. The mistakes that matter happen after it is printed.

## Choose the link first

- **Use an address you control.** If you might change the destination later, create a page or redirect on your own domain and encode that.
- **Keep it short.** Longer addresses create denser codes that are harder to scan when small.
- **Use HTTPS** and open the link on mobile data to check it works outside your own network.
- **Add campaign parameters now** if you want visits to appear separately in your analytics. They cannot be added to a printed static code.

## Static or dynamic

A **static** code contains your address. Nothing sits in the middle. A **dynamic** code contains a provider's redirect address, which lets you change the destination and count scans, but depends on that provider continuing to run the redirect. Choose with that dependency in mind.

## Create the code

1. Open the [QR Code Generator](/qr-code-generator/). Its codes are static.
2. Choose **URL** and enter the address.
3. Keep dark modules on a light background.
4. Download **SVG** for print, or **PNG** for screens and documents.

![The QR code generator with a website address entered and the code previewed](/blog-images/how-to-create-a-qr-code-for-a-website-example.jpg "The preview updates as you type. Scan it before downloading.")

## Add a logo carefully

A logo covers part of the pattern, so the code relies on error correction to recover it. The generator switches to the highest level, **H**, when you add a logo and limits how large it can be. A small, simple logo leaves more spare capacity for glare, scratches and imperfect printing.

## Size and spacing for print

- Keep a blank margin four modules wide around the code. The generator includes it; do not let a design crop it.
- For close scanning, such as a business card, start at about 2 × 2 cm.
- For signs, a common rule of thumb is a width of about one tenth of the scanning distance.

These are starting points, not guarantees. Curved surfaces, glossy paper and poor light all make scanning harder.

## Test before you print the whole run

1. Print one copy at the final size on the final material.
2. Scan it with more than one phone, including an older one if you can.
3. Stand where people will stand.
4. Confirm the page that opens is correct and readable on a phone.

Write next to the code what it opens, for example "Scan to see the menu", and print the short address underneath for people who cannot or prefer not to scan. If you later move the page, set up a [permanent redirect](/blog/301-vs-302-redirects/) so printed codes keep working.
