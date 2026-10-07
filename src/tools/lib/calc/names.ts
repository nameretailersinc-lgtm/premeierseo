/*
 * Small embedded datasets for test data. Fake people: common given names and surnames per
 * country, generic street names, real cities with their region and postal area, phone numbers
 * only from ranges regulators reserve for fiction, and RFC 2606 example domains for email.
 */
import { randomBelow, randomInt } from "../text/random";

const pick = <T,>(a: readonly T[]): T => a[randomBelow(a.length)];
const split = (s: string) => s.trim().split(/\s*,\s*/);

export type Country = "US" | "GB" | "CA" | "AU" | "IN";
export type Gender = "any" | "female" | "male";

interface CountryData {
  name: string;
  female: string[];
  male: string[];
  last: string[];
  streets: string[];
  cities: { city: string; region: string; postal: () => string; area?: string }[];
  phone: ((area?: string) => string) | null;
  address: (num: number, street: string) => string;
}

const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
const digit = () => String(randomBelow(10));
const letter = () => L[randomBelow(L.length)];

const US_STREETS = split("Maple Street, Oak Avenue, Pine Road, Cedar Lane, Elm Street, Lakeview Drive, Hillside Avenue, Park Place, Sunset Boulevard, Ridge Road, Meadow Lane, River Road, Highland Avenue, Willow Way, Chestnut Street, Orchard Court, Birch Drive, Spring Street");

export const COUNTRIES: Record<Country, CountryData> = {
  US: {
    name: "United States",
    female: split("Emma, Olivia, Ava, Sophia, Isabella, Mia, Charlotte, Amelia, Harper, Evelyn, Abigail, Emily, Ella, Grace, Chloe, Madison, Lily, Hannah, Zoe, Nora"),
    male: split("Liam, Noah, Oliver, Elijah, James, William, Benjamin, Lucas, Henry, Alexander, Mason, Michael, Ethan, Daniel, Jacob, Logan, Jackson, Sebastian, Jack, Owen"),
    last: split("Smith, Johnson, Williams, Brown, Jones, Garcia, Miller, Davis, Rodriguez, Martinez, Hernandez, Lopez, Wilson, Anderson, Thomas, Taylor, Moore, Jackson, Martin, Lee, Thompson, White, Harris, Clark, Lewis, Walker, Hall, Young, Allen, King"),
    streets: US_STREETS,
    cities: [
      ["New York", "NY", "10001", "212"],
      ["Los Angeles", "CA", "90012", "213"],
      ["Chicago", "IL", "60601", "312"],
      ["Houston", "TX", "77002", "713"],
      ["Phoenix", "AZ", "85004", "602"],
      ["Philadelphia", "PA", "19103", "215"],
      ["San Diego", "CA", "92101", "619"],
      ["Dallas", "TX", "75201", "214"],
      ["Denver", "CO", "80202", "303"],
      ["Seattle", "WA", "98101", "206"],
      ["Boston", "MA", "02108", "617"],
      ["Atlanta", "GA", "30303", "404"],
      ["Portland", "OR", "97204", "503"],
      ["Minneapolis", "MN", "55401", "612"],
      ["Columbus", "OH", "43215", "614"],
    ].map(([city, region, zip, area]) => ({ city, region, postal: () => zip, area })),
    // NANP: 555-0100 to 555-0199 are reserved for fictional use.
    phone: (area) => `+1 ${area ?? "212"}-555-01${String(randomBelow(100)).padStart(2, "0")}`,
    address: (n, s) => `${n} ${s}`,
  },
  GB: {
    name: "United Kingdom",
    female: split("Olivia, Amelia, Isla, Ava, Ivy, Freya, Lily, Florence, Mia, Willow, Rosie, Sophia, Isabella, Grace, Daisy, Sienna, Poppy, Elsie, Emily, Evie"),
    male: split("Noah, Oliver, George, Arthur, Leo, Harry, Oscar, Archie, Henry, Theodore, Freddie, Jack, Charlie, Theo, Alfie, Jacob, Thomas, William, Lucas, Edward"),
    last: split("Smith, Jones, Taylor, Brown, Williams, Wilson, Johnson, Davies, Robinson, Wright, Thompson, Evans, Walker, White, Roberts, Green, Hall, Wood, Jackson, Clarke, Patel, Hughes, Edwards, Hill"),
    streets: split("High Street, Station Road, Church Lane, Victoria Road, Park Avenue, Mill Lane, King Street, Manor Road, The Crescent, Green Lane, School Lane, Orchard Close, Meadow View, Chapel Street, Springfield Road"),
    cities: [
      ["London", "Greater London", "N1"],
      ["Leeds", "West Yorkshire", "LS1"],
      ["Manchester", "Greater Manchester", "M1"],
      ["Bristol", "Bristol", "BS1"],
      ["Birmingham", "West Midlands", "B1"],
      ["Liverpool", "Merseyside", "L1"],
      ["Sheffield", "South Yorkshire", "S1"],
      ["Nottingham", "Nottinghamshire", "NG1"],
      ["Edinburgh", "Scotland", "EH1"],
      ["Glasgow", "Scotland", "G1"],
      ["Cardiff", "Wales", "CF10"],
    ].map(([city, region, out]) => ({ city, region, postal: () => `${out} ${digit()}${letter()}${letter()}` })),
    // Ofcom drama range: 07700 900000 to 07700 900999.
    phone: () => `07700 900${String(randomBelow(1000)).padStart(3, "0")}`,
    address: (n, s) => `${n} ${s}`,
  },
  CA: {
    name: "Canada",
    female: split("Olivia, Charlotte, Emma, Amelia, Sophia, Chloé, Léa, Alice, Florence, Maeve, Hannah, Ava, Ella, Abigail, Emily, Juliette, Zoé, Rose"),
    male: split("Noah, Liam, William, Thomas, Jacob, Leo, Lucas, Benjamin, Oliver, Theodore, Logan, Nathan, Félix, Samuel, Jack, Owen, Gabriel, Ethan"),
    last: split("Smith, Brown, Tremblay, Martin, Roy, Wilson, MacDonald, Gagnon, Johnson, Taylor, Côté, Campbell, Anderson, Leblanc, Lee, Thompson, White, Gauthier, Bouchard, Morin"),
    streets: split("Maple Avenue, King Street, Queen Street, Lakeshore Road, Pine Crescent, Birch Drive, Rue Principale, Rue des Érables, Main Street, Elm Street, Spruce Court, Ridge Road"),
    cities: [
      ["Toronto", "ON", "M5H", "416"],
      ["Montréal", "QC", "H2Y", "514"],
      ["Vancouver", "BC", "V6B", "604"],
      ["Calgary", "AB", "T2P", "403"],
      ["Ottawa", "ON", "K1P", "613"],
      ["Edmonton", "AB", "T5J", "780"],
      ["Winnipeg", "MB", "R3C", "204"],
      ["Halifax", "NS", "B3J", "902"],
      ["Québec", "QC", "G1R", "418"],
    ].map(([city, region, fsa, area]) => ({ city, region, postal: () => `${fsa} ${digit()}${letter()}${digit()}`, area })),
    phone: (area) => `+1 ${area ?? "416"}-555-01${String(randomBelow(100)).padStart(2, "0")}`,
    address: (n, s) => `${n} ${s}`,
  },
  AU: {
    name: "Australia",
    female: split("Charlotte, Olivia, Amelia, Isla, Mia, Ava, Grace, Willow, Harper, Chloe, Ella, Zoe, Matilda, Ruby, Sienna, Evie, Mila, Hazel"),
    male: split("Oliver, Noah, Jack, Henry, Leo, William, Thomas, Charlie, Lucas, Hudson, Theodore, James, Harrison, Archie, Lachlan, Hunter, Max, Isaac"),
    last: split("Smith, Jones, Williams, Brown, Wilson, Taylor, Johnson, White, Martin, Anderson, Thompson, Nguyen, Thomas, Walker, Harris, Lee, Ryan, Robinson, Kelly, King"),
    streets: split("Wattle Street, Banksia Avenue, Acacia Drive, Kookaburra Lane, Bay Road, Ocean Parade, Station Street, Hill Street, Park Road, Gum Tree Close, Jacaranda Crescent, Bottlebrush Way"),
    cities: [
      ["Sydney", "NSW", "2000", "02"],
      ["Melbourne", "VIC", "3000", "03"],
      ["Brisbane", "QLD", "4000", "07"],
      ["Perth", "WA", "6000", "08"],
      ["Adelaide", "SA", "5000", "08"],
      ["Hobart", "TAS", "7000", "03"],
      ["Canberra", "ACT", "2600", "02"],
      ["Darwin", "NT", "0800", "08"],
    ].map(([city, region, pc, area]) => ({ city, region, postal: () => pc, area })),
    // ACMA: (0X) 5550 xxxx is reserved for creative works in every region.
    phone: (area) => `(${area ?? "02"}) 5550 ${String(randomBelow(10000)).padStart(4, "0")}`,
    address: (n, s) => `${n} ${s}`,
  },
  IN: {
    name: "India",
    female: split("Aadhya, Ananya, Diya, Ishita, Kavya, Meera, Priya, Saanvi, Riya, Pooja, Neha, Sneha, Anjali, Divya, Lakshmi, Fatima, Sara, Zara, Nisha, Shreya"),
    male: split("Aarav, Vihaan, Arjun, Aditya, Rohan, Rahul, Karan, Vikram, Sai, Ishaan, Kabir, Rajesh, Amit, Suresh, Arvind, Imran, Faisal, Joseph, Thomas, Siddharth"),
    last: split("Sharma, Verma, Patel, Singh, Kumar, Gupta, Reddy, Rao, Nair, Iyer, Menon, Das, Bose, Chatterjee, Mukherjee, Joshi, Mehta, Shah, Khan, Ansari, Fernandes, Pillai, Agarwal, Kulkarni"),
    streets: split("Lotus Residency, Green Park Apartments, Shanti Nagar, Gandhi Colony, Sunrise Enclave, Lake View Society, Rose Garden Layout, Krishna Towers, Silver Oak Residency, Station Road"),
    cities: [
      ["Mumbai", "Maharashtra", "400001"],
      ["New Delhi", "Delhi", "110001"],
      ["Bengaluru", "Karnataka", "560001"],
      ["Chennai", "Tamil Nadu", "600001"],
      ["Hyderabad", "Telangana", "500001"],
      ["Kolkata", "West Bengal", "700001"],
      ["Pune", "Maharashtra", "411001"],
      ["Ahmedabad", "Gujarat", "380001"],
      ["Jaipur", "Rajasthan", "302001"],
      ["Kochi", "Kerala", "682001"],
    ].map(([city, region, pin]) => ({ city, region, postal: () => pin })),
    // No officially reserved fictional mobile range is published for India, so none is generated.
    phone: null,
    address: (n, s) => `Flat ${n}, ${s}`,
  },
};

const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toLowerCase();

export interface FakePerson {
  firstName: string;
  lastName: string;
  gender: "female" | "male";
  email: string;
  username: string;
  phone: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  birthDate: string;
}

const DOMAINS = ["example.com", "example.net", "example.org"];

export function fakePerson(country: Country, gender: Gender): FakePerson {
  const c = COUNTRIES[country];
  const g: "female" | "male" = gender === "any" ? (randomBelow(2) ? "female" : "male") : gender;
  const firstName = pick(g === "female" ? c.female : c.male);
  const lastName = pick(c.last);
  const city = pick(c.cities);
  const n = randomInt(1, 99);
  const y = randomInt(1950, 2006);
  const m = randomInt(1, 12);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = randomInt(1, dim);
  const num = country === "IN" ? `${randomInt(1, 12)}0${randomInt(1, 9)}` : String(randomInt(1, country === "US" || country === "CA" ? 1999 : 250));
  return {
    firstName,
    lastName,
    gender: g,
    email: `${ascii(firstName)}.${ascii(lastName)}${n}@${pick(DOMAINS)}`,
    username: `${ascii(firstName)}${ascii(lastName).slice(0, 1)}${randomInt(10, 9999)}`,
    phone: c.phone ? c.phone(city.area) : "",
    street: c.address(country === "IN" ? Number(`${num}`) : Number(num), pick(c.streets)),
    city: city.city,
    region: city.region,
    postalCode: city.postal(),
    country: c.name,
    birthDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  };
}

/* ---------------- Boy names ---------------- */

export type Origin = "English" | "Hebrew" | "Greek" | "Latin" | "Arabic" | "Sanskrit" | "Irish" | "Welsh" | "Germanic" | "Spanish" | "Slavic" | "Persian" | "Turkish" | "Japanese";

export interface BoyName {
  name: string;
  origin: Origin;
  meaning: string;
}

/* name|origin|meaning (meaning left empty where the etymology is uncertain or disputed) */
const BOY_RAW = `
Aaron|Hebrew|
Abraham|Hebrew|father of many (traditional reading)
Adam|Hebrew|man; related to adamah, earth
Adrian|Latin|from Hadria, a town in northern Italy
Aidan|Irish|little fire
Albert|Germanic|noble and bright
Alexander|Greek|defender of men
Alfred|English|elf counsel
Andrew|Greek|manly
Anthony|Latin|
Arthur|Welsh|
Asher|Hebrew|happy, blessed
August|Latin|venerable, great
Axel|Germanic|Scandinavian form of Absalom, father of peace
Benjamin|Hebrew|son of the right hand
Bernard|Germanic|brave as a bear
Caleb|Hebrew|
Carlos|Spanish|Spanish form of Charles, free man
Charles|Germanic|free man
Christopher|Greek|bearing Christ
Connor|Irish|
Daniel|Hebrew|God is my judge
David|Hebrew|beloved
Declan|Irish|
Dominic|Latin|of the Lord
Dylan|Welsh|
Edward|English|rich guardian
Edwin|English|rich friend
Eli|Hebrew|ascended
Elijah|Hebrew|my God is Yahweh
Ethan|Hebrew|firm, enduring
Ezra|Hebrew|help
Felix|Latin|lucky, successful
Finn|Irish|fair, white
Francis|Latin|Frenchman
Frederick|Germanic|peaceful ruler
Gabriel|Hebrew|God is my strength
George|Greek|farmer
Gideon|Hebrew|
Harold|English|army ruler
Henry|Germanic|ruler of the home
Hugo|Germanic|mind, spirit
Isaac|Hebrew|he will laugh
Ivan|Slavic|Russian form of John, God is gracious
Jacob|Hebrew|supplanter, or held by the heel
James|Hebrew|English form of Jacob, via Latin Iacomus
Jason|Greek|to heal
Javier|Spanish|from Basque Etxeberria, new house
Joel|Hebrew|Yahweh is God
John|Hebrew|God is gracious
Jonah|Hebrew|dove
Jonathan|Hebrew|God has given
Joseph|Hebrew|he will add
Joshua|Hebrew|Yahweh is salvation
Julian|Latin|from the Roman family name Julius
Kevin|Irish|kind birth
Laurence|Latin|from Laurentum, a Roman town
Leo|Latin|lion
Leon|Greek|lion
Leonard|Germanic|brave as a lion
Levi|Hebrew|joined, attached
Liam|Irish|short form of Uilliam (William)
Lucas|Latin|from Lucania, a region of Italy
Luke|Greek|from Lucania, a region of Italy
Marcus|Latin|probably from Mars, the Roman god
Mateo|Spanish|Spanish form of Matthew, gift of God
Matthew|Hebrew|gift of God
Maximilian|Latin|greatest
Micah|Hebrew|who is like Yahweh?
Michael|Hebrew|who is like God?
Milan|Slavic|gracious, dear
Nathan|Hebrew|he gave
Nathaniel|Hebrew|God has given
Nicholas|Greek|victory of the people
Noah|Hebrew|rest, comfort
Oliver|Latin|
Oscar|Irish|
Otto|Germanic|wealth, fortune
Owen|Welsh|
Pablo|Spanish|Spanish form of Paul, small
Patrick|Latin|nobleman, patrician
Paul|Latin|small, humble
Peter|Greek|stone, rock
Philip|Greek|lover of horses
Rafael|Hebrew|God has healed
Raymond|Germanic|counsel and protection
Reuben|Hebrew|behold, a son
Rhys|Welsh|ardour, enthusiasm
Richard|Germanic|strong ruler
Robert|Germanic|bright fame
Roland|Germanic|famous land
Ronan|Irish|little seal
Samuel|Hebrew|
Santiago|Spanish|Saint James
Sebastian|Greek|from Sebastos, venerable
Simon|Hebrew|he has heard
Stephen|Greek|crown, wreath
Theodore|Greek|gift of God
Thomas|Hebrew|twin (from Aramaic)
Timothy|Greek|honouring God
Tobias|Hebrew|Yahweh is good
Victor|Latin|conqueror
Vincent|Latin|conquering
Vladimir|Slavic|
Walter|Germanic|ruler of the army
William|Germanic|will and helmet (protection)
Zachary|Hebrew|Yahweh has remembered
Bogdan|Slavic|given by God
Dmitri|Greek|Russian form of Demetrius, of Demeter
Nikolai|Greek|Russian form of Nicholas, victory of the people
Mason|English|stoneworker
Carter|English|transporter of goods by cart
Cooper|English|barrel maker
Tyler|English|tile maker
Parker|English|park keeper
Bradley|English|broad clearing
Wesley|English|western meadow
Ashton|English|ash-tree town
Hunter|English|one who hunts
Ahmed|Arabic|most commendable
Ali|Arabic|high, exalted
Amir|Arabic|prince, commander
Bilal|Arabic|
Faisal|Arabic|judge, one who separates right from wrong
Hamza|Arabic|
Hassan|Arabic|handsome, good
Ibrahim|Arabic|Arabic form of Abraham
Idris|Arabic|
Kareem|Arabic|generous
Khalid|Arabic|eternal
Mustafa|Arabic|chosen
Muhammad|Arabic|praised
Omar|Arabic|
Rashid|Arabic|rightly guided
Salim|Arabic|safe, sound
Tariq|Arabic|night visitor, morning star
Yusuf|Arabic|Arabic form of Joseph
Zayd|Arabic|growth, increase
Aarav|Sanskrit|
Aditya|Sanskrit|belonging to Aditi; a name of the sun
Akash|Sanskrit|sky
Anand|Sanskrit|joy, bliss
Arjun|Sanskrit|bright, white
Arnav|Sanskrit|ocean
Aryan|Sanskrit|noble
Dev|Sanskrit|god
Ishaan|Sanskrit|lord, ruler
Kiran|Sanskrit|ray of light
Krishna|Sanskrit|dark, black
Neel|Sanskrit|blue
Raj|Sanskrit|king, rule
Rishi|Sanskrit|sage, seer
Rohan|Sanskrit|ascending
Sanjay|Sanskrit|victorious
Surya|Sanskrit|sun
Varun|Sanskrit|Vedic god of water and the sky
Vihaan|Sanskrit|dawn
Vivek|Sanskrit|discernment, wisdom
Yash|Sanskrit|fame, glory
Kabir|Arabic|great
Arash|Persian|
Cyrus|Persian|
Darius|Persian|
Kian|Persian|
Emre|Turkish|friend, lover
Kaan|Turkish|ruler, khan
Haruto|Japanese|
Ren|Japanese|
Sora|Japanese|
`;

export const BOY_NAMES: readonly BoyName[] = BOY_RAW.trim()
  .split("\n")
  .map((l) => {
    const [name, origin, meaning] = l.split("|");
    return { name, origin: origin as Origin, meaning: meaning ?? "" };
  });

export const ORIGINS: Origin[] = Array.from(new Set(BOY_NAMES.map((b) => b.origin))).sort() as Origin[];
