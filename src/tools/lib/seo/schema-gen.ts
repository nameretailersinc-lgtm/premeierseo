/*
 * JSON-LD generator: one form spec per type, and a builder that drops empty fields.
 * "required" and "recommended" follow Google's structured data documentation for rich results.
 */

export type FieldKind = "text" | "textarea" | "url" | "date" | "datetime" | "number" | "select" | "lines";

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  recommended?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface RepeatSpec {
  key: string;
  label: string;
  itemLabel: string;
  fields: FieldSpec[];
  min: number;
}

export interface TypeSpec {
  id: SchemaType;
  label: string;
  note?: string;
  fields: FieldSpec[];
  repeats?: RepeatSpec[];
}

export type SchemaType = "Article" | "BlogPosting" | "Organization" | "LocalBusiness" | "Product" | "FAQPage" | "BreadcrumbList" | "Event" | "Person" | "WebSite";

export type Values = Record<string, string>;
export type RepeatValues = Record<string, Values[]>;

const S = "https://schema.org/";
const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x.replace(/([a-z])([A-Z])/g, "$1 $2") }));

const ADDRESS: FieldSpec[] = [
  { key: "street", label: "Street address", kind: "text" },
  { key: "locality", label: "Town or city", kind: "text" },
  { key: "region", label: "Region, state or county", kind: "text" },
  { key: "postalCode", label: "Postal code", kind: "text" },
  { key: "country", label: "Country code", kind: "text", placeholder: "US, GB, DE…", help: "Two-letter ISO 3166-1 code." },
];

const articleFields: FieldSpec[] = [
  { key: "headline", label: "Headline", kind: "text", recommended: true },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "url", label: "Page URL", kind: "url" },
  { key: "image", label: "Image URLs (one per line)", kind: "lines", recommended: true, help: "Google prefers several images in 16:9, 4:3 and 1:1, each at least 50,000 pixels (e.g. 1200 × 675)." },
  { key: "datePublished", label: "Date published", kind: "datetime", recommended: true },
  { key: "dateModified", label: "Date modified", kind: "datetime", recommended: true },
  { key: "authorType", label: "Author is a", kind: "select", options: opt("Person", "Organization") },
  { key: "authorName", label: "Author name", kind: "text", recommended: true },
  { key: "authorUrl", label: "Author profile URL", kind: "url" },
  { key: "publisherName", label: "Publisher name", kind: "text" },
  { key: "publisherLogo", label: "Publisher logo URL", kind: "url" },
];

export const SCHEMA_TYPES: TypeSpec[] = [
  { id: "Article", label: "Article", fields: articleFields },
  { id: "BlogPosting", label: "Blog post", fields: articleFields },
  {
    id: "Organization",
    label: "Organization",
    fields: [
      { key: "name", label: "Name", kind: "text", recommended: true },
      { key: "url", label: "Website URL", kind: "url", recommended: true },
      { key: "logo", label: "Logo URL", kind: "url", recommended: true, help: "At least 112 × 112 px, on a URL Google can crawl." },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "email", label: "Email", kind: "text" },
      { key: "telephone", label: "Phone (with country code)", kind: "text", placeholder: "+44 113 496 0000" },
      { key: "sameAs", label: "Profiles elsewhere (one URL per line)", kind: "lines", help: "Wikipedia, LinkedIn, social profiles." },
      ...ADDRESS,
    ],
  },
  {
    id: "LocalBusiness",
    label: "Local business",
    fields: [
      { key: "subtype", label: "Business type", kind: "select", options: opt("LocalBusiness", "Restaurant", "Bakery", "CafeOrCoffeeShop", "BarOrPub", "Store", "Dentist", "MedicalClinic", "Physician", "LegalService", "AccountingService", "AutoRepair", "HairSalon", "BeautySalon", "Plumber", "Electrician", "HomeAndConstructionBusiness", "RealEstateAgent", "Hotel", "ExerciseGym"), help: "The most specific type that fits." },
      { key: "name", label: "Business name", kind: "text", required: true },
      { key: "street", label: "Street address", kind: "text", required: true },
      ...ADDRESS.slice(1),
      { key: "telephone", label: "Phone (with country code)", kind: "text", recommended: true, placeholder: "+44 113 496 0000" },
      { key: "url", label: "Website URL", kind: "url", recommended: true },
      { key: "image", label: "Photo URL", kind: "url", recommended: true },
      { key: "priceRange", label: "Price range", kind: "text", placeholder: "££ or 10–30 GBP" },
      { key: "latitude", label: "Latitude", kind: "number", recommended: true, placeholder: "53.7997" },
      { key: "longitude", label: "Longitude", kind: "number", recommended: true, placeholder: "-1.5492" },
    ],
    repeats: [
      {
        key: "hours",
        label: "Opening hours",
        itemLabel: "Hours",
        min: 0,
        fields: [
          { key: "days", label: "Days", kind: "select", options: [
            { value: "Monday,Tuesday,Wednesday,Thursday,Friday", label: "Monday to Friday" },
            { value: "Saturday,Sunday", label: "Saturday and Sunday" },
            { value: "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday", label: "Every day" },
            ...["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => ({ value: d, label: d })),
          ] },
          { key: "opens", label: "Opens", kind: "text", placeholder: "09:00" },
          { key: "closes", label: "Closes", kind: "text", placeholder: "17:30" },
        ],
      },
    ],
  },
  {
    id: "Product",
    label: "Product",
    note: "Only use values that are visible on the page. Ratings must come from real customer reviews shown on the page; never add made-up ratings.",
    fields: [
      { key: "name", label: "Product name", kind: "text", required: true },
      { key: "description", label: "Description", kind: "textarea", recommended: true },
      { key: "image", label: "Image URLs (one per line)", kind: "lines", recommended: true },
      { key: "brand", label: "Brand", kind: "text", recommended: true },
      { key: "sku", label: "SKU", kind: "text" },
      { key: "gtin", label: "GTIN / EAN / UPC", kind: "text" },
      { key: "price", label: "Price", kind: "number", required: true, help: "Numbers only, e.g. 19.99. Offers, reviews or ratings: at least one is required." },
      { key: "priceCurrency", label: "Currency", kind: "text", recommended: true, placeholder: "USD, EUR, GBP" },
      { key: "availability", label: "Availability", kind: "select", options: opt("InStock", "OutOfStock", "PreOrder", "BackOrder", "LimitedAvailability", "Discontinued") },
      { key: "condition", label: "Condition", kind: "select", options: opt("NewCondition", "UsedCondition", "RefurbishedCondition") },
      { key: "offerUrl", label: "Product page URL", kind: "url" },
      { key: "priceValidUntil", label: "Price valid until", kind: "date" },
      { key: "ratingValue", label: "Average rating (real reviews only)", kind: "number", placeholder: "4.6" },
      { key: "reviewCount", label: "Number of reviews", kind: "number" },
    ],
  },
  {
    id: "FAQPage",
    label: "FAQ page",
    note: "Google stopped showing FAQ rich results in 2026. FAQPage is still valid schema.org markup, but adding it no longer changes how the page looks in Google.",
    fields: [],
    repeats: [
      {
        key: "faq",
        label: "Questions",
        itemLabel: "Question",
        min: 1,
        fields: [
          { key: "q", label: "Question", kind: "text", required: true },
          { key: "a", label: "Answer", kind: "textarea", required: true },
        ],
      },
    ],
  },
  {
    id: "BreadcrumbList",
    label: "Breadcrumbs",
    fields: [],
    repeats: [
      {
        key: "crumbs",
        label: "Breadcrumb trail, from the homepage down",
        itemLabel: "Level",
        min: 2,
        fields: [
          { key: "name", label: "Name", kind: "text", required: true },
          { key: "url", label: "URL", kind: "url", help: "Optional on the last item (the current page)." },
        ],
      },
    ],
  },
  {
    id: "Event",
    label: "Event",
    fields: [
      { key: "name", label: "Event name", kind: "text", required: true },
      { key: "startDate", label: "Start date and time", kind: "datetime", required: true, help: "Include the time zone offset, e.g. 2026-11-14T19:30+00:00." },
      { key: "endDate", label: "End date and time", kind: "datetime", recommended: true },
      { key: "attendance", label: "Attendance", kind: "select", options: opt("OfflineEventAttendanceMode", "OnlineEventAttendanceMode", "MixedEventAttendanceMode") },
      { key: "status", label: "Status", kind: "select", options: opt("EventScheduled", "EventPostponed", "EventRescheduled", "EventMovedOnline", "EventCancelled") },
      { key: "description", label: "Description", kind: "textarea", recommended: true },
      { key: "image", label: "Image URL", kind: "url", recommended: true },
      { key: "venue", label: "Venue name", kind: "text", required: true, help: "Location is required: a venue for in-person events or a URL for online ones." },
      ...ADDRESS,
      { key: "onlineUrl", label: "Online event URL", kind: "url" },
      { key: "organizer", label: "Organizer name", kind: "text", recommended: true },
      { key: "organizerUrl", label: "Organizer URL", kind: "url" },
      { key: "performer", label: "Performer", kind: "text" },
      { key: "price", label: "Ticket price", kind: "number", recommended: true },
      { key: "priceCurrency", label: "Currency", kind: "text", placeholder: "GBP" },
      { key: "ticketUrl", label: "Ticket URL", kind: "url" },
      { key: "availability", label: "Ticket availability", kind: "select", options: opt("InStock", "SoldOut", "PreOrder") },
      { key: "validFrom", label: "Tickets on sale from", kind: "datetime" },
    ],
  },
  {
    id: "Person",
    label: "Person",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "jobTitle", label: "Job title", kind: "text" },
      { key: "worksFor", label: "Works for (organization)", kind: "text" },
      { key: "url", label: "Profile or website URL", kind: "url" },
      { key: "image", label: "Photo URL", kind: "url" },
      { key: "description", label: "Short bio", kind: "textarea" },
      { key: "sameAs", label: "Profiles elsewhere (one URL per line)", kind: "lines" },
    ],
  },
  {
    id: "WebSite",
    label: "Website",
    note: "Used for the site name Google shows in results. The sitelinks search box was retired in November 2024, so no SearchAction is added.",
    fields: [
      { key: "name", label: "Site name", kind: "text", required: true },
      { key: "alternateName", label: "Other names (one per line)", kind: "lines", help: "Acronyms or shorter versions people use." },
      { key: "url", label: "Homepage URL", kind: "url", required: true },
    ],
  },
];

const v = (x: Values, k: string) => (x[k] ?? "").trim();
const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

function prune(o: unknown): unknown {
  if (Array.isArray(o)) {
    const a = o.map(prune).filter((x) => x !== undefined);
    return a.length ? a : undefined;
  }
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      const p = prune(val);
      if (p !== undefined) out[k] = p;
    }
    const meaningful = Object.keys(out).filter((k) => k !== "@type");
    return meaningful.length ? out : undefined;
  }
  if (o === "" || o === null || o === undefined) return undefined;
  return o;
}

const num = (s: string) => (s && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s || undefined);
const oneOrMany = (a: string[]) => (a.length === 0 ? undefined : a.length === 1 ? a[0] : a);

function address(x: Values) {
  return { "@type": "PostalAddress", streetAddress: v(x, "street"), addressLocality: v(x, "locality"), addressRegion: v(x, "region"), postalCode: v(x, "postalCode"), addressCountry: v(x, "country").toUpperCase() };
}

export function buildSchema(type: SchemaType, x: Values, r: RepeatValues = {}): Record<string, unknown> {
  const base = { "@context": "https://schema.org" };
  let data: Record<string, unknown>;
  switch (type) {
    case "Article":
    case "BlogPosting":
      data = {
        "@type": type,
        headline: v(x, "headline"),
        description: v(x, "description"),
        mainEntityOfPage: v(x, "url"),
        image: oneOrMany(lines(v(x, "image"))),
        datePublished: v(x, "datePublished"),
        dateModified: v(x, "dateModified"),
        author: { "@type": v(x, "authorType") || "Person", name: v(x, "authorName"), url: v(x, "authorUrl") },
        publisher: { "@type": "Organization", name: v(x, "publisherName"), logo: v(x, "publisherLogo") ? { "@type": "ImageObject", url: v(x, "publisherLogo") } : undefined },
      };
      break;
    case "Organization":
      data = { "@type": "Organization", name: v(x, "name"), url: v(x, "url"), logo: v(x, "logo"), description: v(x, "description"), email: v(x, "email"), telephone: v(x, "telephone"), sameAs: lines(v(x, "sameAs")), address: address(x) };
      break;
    case "LocalBusiness":
      data = {
        "@type": v(x, "subtype") || "LocalBusiness",
        name: v(x, "name"),
        image: v(x, "image"),
        url: v(x, "url"),
        telephone: v(x, "telephone"),
        priceRange: v(x, "priceRange"),
        address: address(x),
        geo: v(x, "latitude") && v(x, "longitude") ? { "@type": "GeoCoordinates", latitude: num(v(x, "latitude")), longitude: num(v(x, "longitude")) } : undefined,
        openingHoursSpecification: (r.hours ?? [])
          .filter((h) => v(h, "opens") && v(h, "closes"))
          .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: oneOrMany(v(h, "days").split(",").filter(Boolean)), opens: v(h, "opens"), closes: v(h, "closes") })),
      };
      break;
    case "Product": {
      const offer = v(x, "price")
        ? {
            "@type": "Offer",
            price: num(v(x, "price")),
            priceCurrency: v(x, "priceCurrency").toUpperCase(),
            availability: v(x, "availability") ? S + v(x, "availability") : undefined,
            itemCondition: v(x, "condition") ? S + v(x, "condition") : undefined,
            url: v(x, "offerUrl"),
            priceValidUntil: v(x, "priceValidUntil"),
          }
        : undefined;
      data = {
        "@type": "Product",
        name: v(x, "name"),
        description: v(x, "description"),
        image: oneOrMany(lines(v(x, "image"))),
        brand: v(x, "brand") ? { "@type": "Brand", name: v(x, "brand") } : undefined,
        sku: v(x, "sku"),
        gtin: v(x, "gtin"),
        offers: offer,
        aggregateRating: v(x, "ratingValue") && v(x, "reviewCount") ? { "@type": "AggregateRating", ratingValue: num(v(x, "ratingValue")), reviewCount: num(v(x, "reviewCount")) } : undefined,
      };
      break;
    }
    case "FAQPage":
      data = {
        "@type": "FAQPage",
        mainEntity: (r.faq ?? []).filter((f) => v(f, "q") && v(f, "a")).map((f) => ({ "@type": "Question", name: v(f, "q"), acceptedAnswer: { "@type": "Answer", text: v(f, "a") } })),
      };
      break;
    case "BreadcrumbList": {
      const crumbs = (r.crumbs ?? []).filter((c) => v(c, "name"));
      data = {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: v(c, "name"), item: v(c, "url") || undefined })),
      };
      break;
    }
    case "Event": {
      const online = v(x, "onlineUrl");
      const place = v(x, "venue") ? { "@type": "Place", name: v(x, "venue"), address: address(x) } : undefined;
      const locs = [place, online ? { "@type": "VirtualLocation", url: online } : undefined].filter(Boolean);
      data = {
        "@type": "Event",
        name: v(x, "name"),
        startDate: v(x, "startDate"),
        endDate: v(x, "endDate"),
        eventAttendanceMode: v(x, "attendance") ? S + v(x, "attendance") : undefined,
        eventStatus: v(x, "status") ? S + v(x, "status") : undefined,
        description: v(x, "description"),
        image: v(x, "image"),
        location: locs.length > 1 ? locs : locs[0],
        organizer: v(x, "organizer") ? { "@type": "Organization", name: v(x, "organizer"), url: v(x, "organizerUrl") } : undefined,
        performer: v(x, "performer") ? { "@type": "Person", name: v(x, "performer") } : undefined,
        offers: v(x, "price")
          ? { "@type": "Offer", price: num(v(x, "price")), priceCurrency: v(x, "priceCurrency").toUpperCase(), url: v(x, "ticketUrl"), availability: v(x, "availability") ? S + v(x, "availability") : undefined, validFrom: v(x, "validFrom") }
          : undefined,
      };
      break;
    }
    case "Person":
      data = { "@type": "Person", name: v(x, "name"), jobTitle: v(x, "jobTitle"), worksFor: v(x, "worksFor") ? { "@type": "Organization", name: v(x, "worksFor") } : undefined, url: v(x, "url"), image: v(x, "image"), description: v(x, "description"), sameAs: lines(v(x, "sameAs")) };
      break;
    case "WebSite":
      data = { "@type": "WebSite", name: v(x, "name"), alternateName: oneOrMany(lines(v(x, "alternateName"))), url: v(x, "url") };
      break;
  }
  const pruned = (prune(data) as Record<string, unknown>) ?? { "@type": type };
  return { ...base, ...pruned };
}

export function toScript(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj, null, 2).replace(/<\/script/gi, "<\\/script");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

/** Missing required fields for the form (generator-side hints; the validator does the full check). */
export function missingRequired(spec: TypeSpec, x: Values, r: RepeatValues): string[] {
  const out = spec.fields.filter((f) => f.required && !v(x, f.key)).map((f) => f.label);
  for (const rep of spec.repeats ?? []) {
    const filled = (r[rep.key] ?? []).filter((row) => rep.fields.filter((f) => f.required).every((f) => v(row, f.key)));
    if (filled.length < rep.min) out.push(`${rep.label} (at least ${rep.min})`);
  }
  return out;
}

export const SCHEMA_EXAMPLES: Partial<Record<SchemaType, { values: Values; repeats?: RepeatValues }>> = {
  Article: {
    values: {
      headline: "How to make a sourdough starter",
      description: "Seven days, two ingredients, one jar.",
      url: "https://www.example.com/baking/sourdough-starter/",
      image: "https://www.example.com/images/starter-16x9.jpg\nhttps://www.example.com/images/starter-1x1.jpg",
      datePublished: "2026-09-12",
      dateModified: "2026-09-20",
      authorType: "Person",
      authorName: "Ana Baker",
      authorUrl: "https://www.example.com/about/ana/",
      publisherName: "Bread Notes",
      publisherLogo: "https://www.example.com/logo.png",
    },
  },
  LocalBusiness: {
    values: { subtype: "Bakery", name: "Bread Notes Bakery", street: "12 Example Street", locality: "Leeds", postalCode: "LS1 1AA", country: "GB", telephone: "+44 113 496 0000", url: "https://www.example.com/", priceRange: "££", latitude: "53.7997", longitude: "-1.5492" },
    repeats: { hours: [{ days: "Monday,Tuesday,Wednesday,Thursday,Friday", opens: "07:00", closes: "17:00" }, { days: "Saturday", opens: "08:00", closes: "14:00" }] },
  },
  Product: { values: { name: "Stone-ground rye flour, 1 kg", description: "Wholegrain rye milled weekly.", image: "https://www.example.com/images/rye-flour.jpg", brand: "Bread Notes", sku: "RYE-1KG", price: "4.50", priceCurrency: "GBP", availability: "InStock", condition: "NewCondition", offerUrl: "https://www.example.com/shop/rye-flour/" } },
  FAQPage: { values: {}, repeats: { faq: [{ q: "How long does a starter take?", a: "About 7 days at room temperature." }, { q: "Can I use tap water?", a: "Yes, if it's safe to drink. Leave chlorinated water out overnight first." }] } },
  BreadcrumbList: { values: {}, repeats: { crumbs: [{ name: "Home", url: "https://www.example.com/" }, { name: "Baking", url: "https://www.example.com/baking/" }, { name: "Sourdough starter", url: "" }] } },
  Event: { values: { name: "Sourdough basics workshop", startDate: "2026-11-14T10:00+00:00", endDate: "2026-11-14T13:00+00:00", attendance: "OfflineEventAttendanceMode", status: "EventScheduled", venue: "Bread Notes Bakery", street: "12 Example Street", locality: "Leeds", postalCode: "LS1 1AA", country: "GB", organizer: "Bread Notes", price: "45", priceCurrency: "GBP", ticketUrl: "https://www.example.com/workshops/", availability: "InStock" } },
  Organization: { values: { name: "Bread Notes", url: "https://www.example.com/", logo: "https://www.example.com/logo.png", sameAs: "https://www.instagram.com/example\nhttps://www.linkedin.com/company/example" } },
  Person: { values: { name: "Ana Baker", jobTitle: "Head baker", worksFor: "Bread Notes", url: "https://www.example.com/about/ana/" } },
  WebSite: { values: { name: "Bread Notes", alternateName: "BN Baking", url: "https://www.example.com/" } },
};
SCHEMA_EXAMPLES.BlogPosting = SCHEMA_EXAMPLES.Article;
