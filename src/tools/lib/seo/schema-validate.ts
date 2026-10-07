/*
 * JSON-LD checks: syntax (via parseJson), @context and @type, required and recommended properties for the types
 * Google documents rich results for, and value formats (dates, absolute URLs, prices).
 * Requirements follow Google Search Central's structured data documentation; this is not a full schema.org
 * vocabulary validator, and the page says so.
 */
import { lineCol, parseJson, type JsonError } from "./json-parse";

export type Severity = "error" | "warning" | "info";

export interface Finding {
  severity: Severity;
  path: string;
  message: string;
}

export interface NodeReport {
  path: string;
  types: string[];
  findings: Finding[];
}

export interface BlockReport {
  index: number;
  /** 1-based line in the original input where this block starts. */
  startLine: number;
  raw: string;
  syntax: JsonError | null;
  nodes: NodeReport[];
  findings: Finding[];
}

type Rule = { required?: string[]; recommended?: string[]; note?: string };

/** "a|b" = at least one of. */
const RULES: Record<string, Rule> = {
  Article: { recommended: ["headline", "image", "datePublished", "dateModified", "author"] },
  NewsArticle: { recommended: ["headline", "image", "datePublished", "dateModified", "author"] },
  BlogPosting: { recommended: ["headline", "image", "datePublished", "dateModified", "author"] },
  Product: { required: ["name", "offers|review|aggregateRating"], recommended: ["image", "description", "brand", "sku|gtin|gtin13|gtin12|gtin8|mpn"] },
  Offer: { required: ["price|priceSpecification"], recommended: ["priceCurrency", "availability", "url"] },
  AggregateOffer: { required: ["lowPrice", "priceCurrency"], recommended: ["highPrice", "offerCount"] },
  AggregateRating: { required: ["ratingValue", "ratingCount|reviewCount"], recommended: ["bestRating"] },
  Review: { required: ["author", "reviewRating"], recommended: ["datePublished"] },
  Rating: { required: ["ratingValue"] },
  Event: { required: ["name", "startDate", "location"], recommended: ["endDate", "eventStatus", "eventAttendanceMode", "image", "description", "offers", "organizer", "performer"] },
  LocalBusiness: { required: ["name", "address"], recommended: ["telephone", "url", "openingHoursSpecification|openingHours", "geo", "priceRange", "image"] },
  Organization: { recommended: ["name", "url", "logo"] },
  Person: { required: ["name"] },
  BreadcrumbList: { required: ["itemListElement"] },
  ListItem: { required: ["position"] },
  FAQPage: { required: ["mainEntity"], note: "Google stopped showing FAQ rich results in 2026. The markup is still valid schema.org but no longer earns a rich result." },
  Question: { required: ["name", "acceptedAnswer|suggestedAnswer"] },
  Answer: { required: ["text"] },
  WebSite: { recommended: ["name", "url"] },
  Recipe: { required: ["name", "image"], recommended: ["author", "datePublished", "description", "recipeIngredient", "recipeInstructions", "totalTime", "recipeYield"] },
  VideoObject: { required: ["name", "thumbnailUrl", "uploadDate"], recommended: ["description", "duration", "contentUrl|embedUrl"] },
  JobPosting: { required: ["title", "description", "datePosted", "hiringOrganization", "jobLocation|jobLocationType"], recommended: ["validThrough", "employmentType", "baseSalary"] },
  SoftwareApplication: { required: ["name", "offers", "aggregateRating|review"], recommended: ["applicationCategory", "operatingSystem"] },
  WebApplication: { required: ["name"], recommended: ["offers", "applicationCategory"] },
  Course: { required: ["name", "description"], recommended: ["provider"] },
  HowTo: { note: "Google no longer shows HowTo rich results (2023). The markup is valid but earns nothing in Search." },
  PostalAddress: { recommended: ["streetAddress", "addressLocality", "postalCode", "addressCountry"] },
};

const LOCAL_BUSINESS = new Set(
  "LocalBusiness AnimalShelter AutomotiveBusiness AutoRepair AutoDealer ChildCare Dentist DryCleaningOrLaundry EmergencyService EmploymentAgency EntertainmentBusiness FinancialService AccountingService BankOrCreditUnion InsuranceAgency FoodEstablishment Bakery BarOrPub Brewery CafeOrCoffeeShop FastFoodRestaurant IceCreamShop Restaurant Winery GovernmentOffice HealthAndBeautyBusiness BeautySalon DaySpa HairSalon NailSalon TattooParlor HomeAndConstructionBusiness Electrician GeneralContractor HVACBusiness HousePainter Locksmith MovingCompany Plumber RoofingContractor InternetCafe LegalService Attorney Notary Library LodgingBusiness Hotel Motel BedAndBreakfast Hostel MedicalBusiness MedicalClinic Optician Pharmacy Physician ProfessionalService RadioStation RealEstateAgent RecyclingCenter SelfStorage ShoppingCenter SportsActivityLocation ExerciseGym Store BikeStore BookStore ClothingStore ComputerStore ConvenienceStore ElectronicsStore Florist FurnitureStore GardenStore GroceryStore HardwareStore HobbyShop HomeGoodsStore JewelryStore LiquorStore MobilePhoneStore PetStore ShoeStore SportingGoodsStore ToyStore TravelAgency TouristInformationCenter".split(
    " ",
  ),
);

const KNOWN = new Set([
  ...LOCAL_BUSINESS,
  ...Object.keys(RULES),
  ..."Thing CreativeWork WebPage AboutPage ContactPage CollectionPage ProfilePage QAPage SearchResultsPage ItemPage MedicalWebPage ItemList ImageObject AudioObject MediaObject Organization Corporation NGO EducationalOrganization CollegeOrUniversity School OnlineBusiness OnlineStore NewsMediaOrganization Place PostalAddress GeoCoordinates GeoShape ContactPoint OpeningHoursSpecification Offer AggregateOffer Brand ProductGroup ProductModel Event MusicEvent BusinessEvent EducationEvent Festival SportsEvent TheaterEvent ExhibitionEvent SocialEvent Course CourseInstance HowToStep HowToSection HowToDirection HowToTip TechArticle Report ScholarlyArticle SearchAction EntryPoint SiteNavigationElement WPHeader WPFooter WPSideBar MobileApplication VideoGame Book Movie TVSeries Dataset DataDownload DataCatalog MonetaryAmount PriceSpecification UnitPriceSpecification CompoundPriceSpecification QuantitativeValue PropertyValue Service Language DefinedTerm DefinedTermSet ClaimReview CriticReview EmployerAggregateRating Duration SpeakableSpecification VirtualLocation Country City State AdministrativeArea Audience OfferShippingDetails ShippingDeliveryTime MerchantReturnPolicy DefinedRegion Episode PodcastSeries PodcastEpisode MusicRecording MusicAlbum MusicGroup Photograph Painting VisualArtwork Comment DiscussionForumPosting SocialMediaPosting Occupation EducationalOccupationalCredential Role OrganizationRole Quotation Clip BroadcastEvent LiveBlogPosting Menu MenuItem MenuSection NutritionInformation Trip TouristAttraction LandmarksOrHistoricalBuildings Airport Park Museum MovieTheater StadiumOrArena Accommodation Room Apartment House Residence Vehicle Car IndividualProduct SomeProducts Action ReadAction WatchAction BuyAction OrderAction ReserveAction".split(
    " ",
  ),
]);
const KNOWN_LOWER = new Map([...KNOWN].map((t) => [t.toLowerCase(), t]));

const DATE_PROPS = new Set(["datePublished", "dateModified", "dateCreated", "startDate", "endDate", "uploadDate", "datePosted", "validThrough", "priceValidUntil", "validFrom", "availabilityStarts", "availabilityEnds", "birthDate", "foundingDate"]);
const URL_PROPS = new Set(["url", "logo", "item", "sameAs", "thumbnailUrl", "contentUrl", "embedUrl", "image", "@id", "mainEntityOfPage", "hasMap"]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const ISO_DURATION = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

function typesOf(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

function stripVocab(t: string) {
  return t.replace(/^https?:\/\/schema\.org\//i, "").replace(/^schema:/i, "");
}

function has(node: Record<string, unknown>, key: string): boolean {
  return key.split("|").some((k) => {
    const v = node[k];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}

function ruleFor(t: string): Rule | undefined {
  if (RULES[t]) return RULES[t];
  if (LOCAL_BUSINESS.has(t)) return RULES.LocalBusiness;
  return undefined;
}

function isSchemaContext(ctx: unknown): boolean {
  if (typeof ctx === "string") return /^https?:\/\/schema\.org\/?$/i.test(ctx.trim());
  if (Array.isArray(ctx)) return ctx.some(isSchemaContext);
  if (ctx && typeof ctx === "object") {
    const vocab = (ctx as Record<string, unknown>)["@vocab"];
    return typeof vocab === "string" && /^https?:\/\/schema\.org\/?$/i.test(vocab.trim());
  }
  return false;
}

function checkValue(key: string, v: unknown, path: string, out: Finding[]) {
  if (DATE_PROPS.has(key) && typeof v === "string" && !ISO_DATE.test(v.trim()))
    out.push({ severity: "warning", path, message: `${key} “${v}” isn't an ISO 8601 date. Use 2026-09-12 or 2026-09-12T19:30:00+01:00.` });
  if (URL_PROPS.has(key) && typeof v === "string" && v.trim() && key !== "@id" && !/^https?:\/\//i.test(v.trim()))
    out.push({ severity: "warning", path, message: `${key} “${v}” is not an absolute URL. Use the full address starting with https://.` });
  if ((key === "price" || key === "lowPrice" || key === "highPrice") && v !== undefined) {
    const s = String(v).trim();
    if (!/^\d+(\.\d+)?$/.test(s)) out.push({ severity: "warning", path, message: `${key} “${s}” should be a plain number such as 19.99, without currency symbols or thousands separators.` });
  }
  if (key === "priceCurrency" && typeof v === "string" && !/^[A-Z]{3}$/.test(v.trim()))
    out.push({ severity: "warning", path, message: `priceCurrency “${v}” should be a 3-letter ISO 4217 code such as USD, EUR or GBP.` });
  if ((key === "ratingValue" || key === "bestRating" || key === "worstRating") && v !== undefined && Number.isNaN(Number(v)))
    out.push({ severity: "warning", path, message: `${key} “${String(v)}” should be a number.` });
  if ((key === "ratingCount" || key === "reviewCount") && v !== undefined && !/^\d+$/.test(String(v).trim()))
    out.push({ severity: "warning", path, message: `${key} “${String(v)}” should be a whole number.` });
  if ((key === "duration" || key === "totalTime" || key === "cookTime" || key === "prepTime") && typeof v === "string" && !ISO_DURATION.test(v.trim()))
    out.push({ severity: "warning", path, message: `${key} “${v}” should be an ISO 8601 duration such as PT1H30M.` });
  if ((key === "availability" || key === "itemCondition" || key === "eventStatus" || key === "eventAttendanceMode") && typeof v === "string" && !/^https?:\/\/schema\.org\/\w+$/i.test(v.trim()))
    out.push({ severity: "warning", path, message: `${key} “${v}” should be a schema.org URL such as https://schema.org/${key === "availability" ? "InStock" : key === "itemCondition" ? "NewCondition" : key === "eventStatus" ? "EventScheduled" : "OfflineEventAttendanceMode"}.` });
}

function walk(node: unknown, path: string, nodes: NodeReport[], parentKey = "") {
  if (Array.isArray(node)) {
    node.forEach((x, i) => walk(x, `${path}[${i + 1}]`, nodes, parentKey));
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const rawTypes = typesOf(obj);
  const types = rawTypes.map(stripVocab);
  const findings: Finding[] = [];
  const label = types.length ? `${path}${path ? " › " : ""}${types.join(", ")}` : path || "(top level)";
  const isEntity = types.length > 0 || Object.keys(obj).some((k) => !k.startsWith("@"));
  if (isEntity && !types.length && !obj["@id"] && parentKey !== "@context")
    findings.push({ severity: parentKey ? "info" : "error", path: label, message: parentKey ? "Nested object without @type. Add one (e.g. Person, Organization, PostalAddress) so its properties are understood." : "Missing @type. Every top-level item needs a type such as Article or Product." });
  for (const t of types) {
    if (!KNOWN.has(t)) {
      const fix = KNOWN_LOWER.get(t.toLowerCase());
      if (fix) findings.push({ severity: "error", path: label, message: `@type “${t}” should be “${fix}”: type names are case-sensitive.` });
      else findings.push({ severity: "info", path: label, message: `“${t}” isn't in our list of common types. Check the spelling at schema.org/${encodeURIComponent(t)}.` });
    }
    const r = ruleFor(t);
    if (!r) continue;
    for (const k of r.required ?? [])
      if (!has(obj, k)) findings.push({ severity: "error", path: label, message: `Missing required property ${k.split("|").join(" or ")} for ${t} rich results.` });
    const nestedOk = !parentKey || t === "Offer" || t === "AggregateOffer" || t === "AggregateRating";
    for (const k of nestedOk ? (r.recommended ?? []) : [])
      if (!has(obj, k)) findings.push({ severity: "warning", path: label, message: `Missing recommended property ${k.split("|").join(" or ")}.` });
    if (r.note) findings.push({ severity: "info", path: label, message: r.note });
  }
  if (types.includes("BreadcrumbList") && Array.isArray(obj.itemListElement)) {
    const items = obj.itemListElement as Record<string, unknown>[];
    items.forEach((it, i) => {
      if (!it || typeof it !== "object") return;
      const item = it.item as Record<string, unknown> | string | undefined;
      const hasName = typeof it.name === "string" || (item && typeof item === "object" && typeof item.name === "string");
      if (!hasName) findings.push({ severity: "error", path: `${label} › item ${i + 1}`, message: "Each breadcrumb needs a name." });
      if (!item && i < items.length - 1) findings.push({ severity: "error", path: `${label} › item ${i + 1}`, message: "Each breadcrumb except the last needs an item (URL)." });
      if (Number(it.position) !== i + 1) findings.push({ severity: "warning", path: `${label} › item ${i + 1}`, message: `position is ${String(it.position ?? "missing")}; expected ${i + 1}.` });
    });
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === "@context" || k === "@type") continue;
    const values = Array.isArray(v) ? v : [v];
    for (const x of values) if (typeof x !== "object" || x === null) checkValue(k, x, label, findings);
  }
  if (types.length || findings.length) nodes.push({ path: label, types, findings });
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("@") && k !== "@graph") continue;
    if (v && typeof v === "object") walk(v, k === "@graph" ? `${path || ""}` : `${label} › ${k}`, nodes, k === "@graph" ? "" : k);
  }
}

export function validateJsonLd(raw: string, index = 0, startLine = 1): BlockReport {
  const report: BlockReport = { index, startLine, raw, syntax: null, nodes: [], findings: [] };
  const parsed = parseJson(raw);
  if (!parsed.ok) {
    report.syntax = { ...parsed.error, line: parsed.error.line + startLine - 1 };
    return report;
  }
  const v = parsed.value;
  const tops = Array.isArray(v) ? v : [v];
  tops.forEach((top, i) => {
    if (!top || typeof top !== "object" || Array.isArray(top)) {
      report.findings.push({ severity: "error", path: `item ${i + 1}`, message: "Top-level JSON-LD must be an object (or a list of objects)." });
      return;
    }
    const o = top as Record<string, unknown>;
    if (!("@context" in o)) report.findings.push({ severity: "error", path: tops.length > 1 ? `item ${i + 1}` : "(top level)", message: 'Missing @context. Add "@context": "https://schema.org".' });
    else if (!isSchemaContext(o["@context"])) report.findings.push({ severity: "error", path: "(top level)", message: `@context is ${JSON.stringify(o["@context"])}; it should be "https://schema.org".` });
  });
  walk(v, "", report.nodes);
  return report;
}

/** Find JSON-LD blocks in pasted text: either raw JSON or HTML containing <script type="application/ld+json">. */
export function extractBlocks(input: string): { raw: string; startLine: number }[] {
  const t = input.trim();
  if (!t) return [];
  if (!/<script/i.test(input)) {
    const lead = input.length - input.trimStart().length;
    return [{ raw: t, startLine: lineCol(input, lead).line }];
  }
  const out: { raw: string; startLine: number }[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    const inner = m[1];
    const innerStart = m.index + m[0].indexOf(inner, m[0].indexOf(">") + 1);
    const lead = inner.length - inner.trimStart().length;
    out.push({ raw: inner.trim(), startLine: lineCol(input, innerStart + lead).line });
  }
  return out;
}

export function countFindings(blocks: BlockReport[]) {
  let errors = 0,
    warnings = 0,
    infos = 0;
  for (const b of blocks) {
    if (b.syntax) errors++;
    for (const f of [...b.findings, ...b.nodes.flatMap((n) => n.findings)]) {
      if (f.severity === "error") errors++;
      else if (f.severity === "warning") warnings++;
      else infos++;
    }
  }
  return { errors, warnings, infos };
}
