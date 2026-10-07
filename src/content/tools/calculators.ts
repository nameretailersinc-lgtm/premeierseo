import type { ToolDef } from "@/lib/types";

/*
 * Calculator tools. Titles, H1s, descriptions and H2 outlines follow docs/keyword-map.json.
 * Every example is the real output of src/tools/lib/calc/* (run with tsx). Rates are dated
 * and sourced; nothing here is financial, tax or medical advice.
 */

const UPDATED = "2026-09-30";

export const CALCULATOR_TOOLS: ToolDef[] = [
  /* ---------------- Money and shopping ---------------- */
  {
    id: "gst-calculator",
    path: "/gst-calculator/",
    name: "GST Calculator",
    h1: "GST Calculator",
    title: "GST Calculator – Add or Remove GST (CGST, SGST, IGST)",
    metaDescription:
      "Add GST to a price or remove it from a GST-inclusive amount at any rate, with the CGST/SGST or IGST split shown and the formula used for each.",
    summary:
      "Add GST to a net price or take it out of a GST-inclusive total, with the CGST and SGST (or IGST) split and the working shown. Any rate works, so it also handles VAT.",
    category: "calculator-tools",
    subgroup: "money",
    card: "Add or remove GST at any rate and see the CGST, SGST or IGST split.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "gst" },
    aliases: ["gst calc", "gst calculator india", "reverse gst calculator", "remove gst", "gst inclusive calculator", "cgst sgst calculator", "igst calculator", "18% gst", "vat calculator", "add gst"],
    keywords: ["tax", "invoice", "india", "vat", "inclusive", "exclusive"],
    processing: "browser",
    limits: [
      "Rates are entered by you. The rate buttons show India's slabs as checked on 5 October 2026; confirm the rate for your item's HSN or SAC code before invoicing.",
      "Amounts are shown to 2 decimal places. Invoices may round each tax line separately, so totals can differ by a paisa or cent.",
    ],
    steps: [
      "Choose **Add GST** if your price excludes tax, or **Remove GST** if it already includes tax.",
      "Type the amount, then pick a rate button (**5%**, **18%**, **40%**, **3%** or **0.25%**) or type any rate in **GST or VAT rate**.",
      "Under **Type of supply (India)**, choose **Within a state** for CGST + SGST or **Between states** for IGST.",
      "Read the net amount, tax and total, with the formula underneath. Press **Copy result** to copy the line.",
    ],
    example: {
      title: "Adding and removing 18% GST",
      input: "Add GST: net price 1,000 at 18%, within a state\nRemove GST: total 1,180 at 18%",
      output: "Add: GST 180.00 (CGST 90.00 + SGST 90.00), total 1,180.00\nRemove: net price 1,000.00, GST 180.00",
      note: "Removing GST divides by 1.18. Taking 18% off 1,180 would give 967.60, which is wrong: the tax was 18% of the net price, not of the total.",
    },
    sections: [
      {
        heading: "Adding GST to a price",
        body: "When a price is quoted before tax (exclusive), multiply it by the rate to get the tax and add it on:\n\n- GST = Net price × Rate ÷ 100\n- Total = Net price + GST, or Net price × (1 + Rate ÷ 100)\n\nAt 18%, a net price of 2,500 carries 450 of GST and a total of 2,950. Businesses registered for GST quote and record the net price, the rate and each tax line separately on a tax invoice.",
      },
      {
        heading: "Removing GST from an inclusive price",
        body: "Shop prices (MRP in India) and most consumer quotes already include GST. To find the price before tax, divide by 1 plus the rate:\n\n- Net price = Total × 100 ÷ (100 + Rate)\n- GST = Total − Net price\n\nFor a total of 1,050 at 5%: 1,050 × 100 ÷ 105 = 1,000, so the GST is 50. A common mistake is to take the rate off the total (1,050 − 5% = 997.50); that understates the net price because the tax was calculated on the smaller, pre-tax amount.",
      },
      {
        heading: "CGST, SGST and IGST",
        body: "The rate is the same whichever way it's split; only who collects it changes.\n\n- **Intra-state supply** (seller and place of supply in the same state): the tax is split equally into **CGST** (central) and **SGST** (state). In a union territory without a legislature, UTGST replaces SGST. 18% becomes 9% + 9%.\n- **Inter-state supply** (different states), imports, and supplies to SEZ units: the full rate is charged as **IGST**. 18% stays 18%.\n\nThe place of supply rules in the IGST Act decide which applies, so check them for services, online sales and goods shipped to a third party.",
      },
      {
        heading: "Current GST rate slabs",
        body: "From 22 September 2025, after the 56th GST Council meeting, the 12% and 28% slabs were removed and most items moved to 5% or 18%. Rates checked on 5 October 2026:\n\n| Rate | Examples |\n|---|---|\n| Nil | Many unprocessed foods, UHT milk, paneer; individual life and health insurance is exempt |\n| 5% | Many daily-use goods, such as soap, hair oil and toothpaste |\n| 18% | The standard rate for most goods and services, including small cars, air conditioners and televisions |\n| 40% | Luxury and \"sin\" goods: aerated drinks, large cars and motorcycles over 350 cc; tobacco and pan masala from 1 February 2026 |\n| 3% | Gold, silver and jewellery |\n| 0.25% | Rough diamonds |\n\nRates apply to an item's HSN (goods) or SAC (services) code, so look up your code in the official rate notifications rather than relying on a category name.",
      },
      {
        heading: "GST formulas",
        body: "| Task | Formula | 18% example |\n|---|---|---|\n| Add GST | Total = Net × (1 + r ÷ 100) | 1,000 → 1,180 |\n| GST on a net price | GST = Net × r ÷ 100 | 1,000 → 180 |\n| Remove GST | Net = Total × 100 ÷ (100 + r) | 1,180 → 1,000 |\n| GST inside a total | GST = Total × r ÷ (100 + r) | 1,180 → 180 |\n| CGST and SGST | each = GST ÷ 2 | 90 + 90 |\n\nThe same formulas work for VAT and other sales taxes: type the rate (for example 20% UK VAT) and ignore the supply-type split.",
      },
    ],
    faq: [
      {
        q: "How do I calculate GST backwards from a total?",
        a: "Divide the total by 1 plus the rate as a decimal. For 18%, divide by 1.18: 1,180 ÷ 1.18 = 1,000 before tax, so the GST is 180. Choose **Remove GST** and the calculator does this for you.",
      },
      {
        q: "When is IGST charged instead of CGST and SGST?",
        a: "IGST applies when the supplier's location and the place of supply are in different states or union territories, and on imports. Within one state, the same total rate is split into CGST and SGST.",
      },
      {
        q: "Are the 12% and 28% GST rates still used?",
        a: "Not for most goods and services. The 56th GST Council merged them into 5%, 18% and a 40% rate from 22 September 2025. Tobacco and pan masala stayed on the old structure until 1 February 2026, when they moved to 40%. If you still need an old rate for an earlier invoice, type it in the rate box.",
      },
      {
        q: "Can I use this for VAT outside India?",
        a: "Yes. Type your VAT or sales tax rate, choose **Add GST** or **Remove GST**, and set the currency. The CGST/SGST split only matters in India.",
      },
    ],
    sources: [
      { label: "PIB: Recommendations of the 56th meeting of the GST Council (3 September 2025)", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555" },
      { label: "GST Council: FAQs on the decisions of the 56th GST Council", url: "https://gstcouncil.gov.in/sites/default/files/2025-09/faq.pdf" },
      { label: "CBIC: GST rates for goods and services", url: "https://cbic-gst.gov.in/gst-goods-services-rates.html" },
    ],
    related: ["discount-calculator", "percentage-calculator", "loan-emi-calculator", "adsense-calculator"],
    links: [
      { href: "/percentage-calculator/", anchor: "percentage calculator" },
      { href: "/discount-calculator/", anchor: "discount calculator" },
      { href: "/loan-emi-calculator/", anchor: "EMI calculator" },
    ],
    appCategory: "FinanceApplication",
    features: [
      "Add GST to a net price or remove it from an inclusive total",
      "CGST + SGST or IGST split",
      "India rate slabs (5%, 18%, 40%, 3%, 0.25%) plus any custom rate",
      "Currency selector; formula shown with your numbers",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "discount-calculator",
    path: "/discount-calculator/",
    name: "Discount Calculator",
    h1: "Discount Calculator",
    title: "Discount Calculator – Sale Price and Percent Off",
    metaDescription:
      "Work out the sale price after a percentage discount, the percent off between two prices, or stacked discounts such as 20% + 10%. Shows the saving.",
    summary:
      "Work out what you pay after a percentage discount, how much percent off a sale price really is, or the true total of stacked discounts such as 20% then 10%.",
    category: "calculator-tools",
    subgroup: "money",
    card: "Find a sale price, the percent off, or the real total of stacked discounts.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "discount" },
    aliases: ["percent off calculator", "sale price calculator", "discount percentage calculator", "20% off calculator", "double discount calculator", "price after discount", "discount calc", "percentage off"],
    keywords: ["sale", "coupon", "shopping", "saving", "markdown"],
    processing: "browser",
    steps: [
      "Choose **Sale price**, **Percent off** or **Stacked discounts**.",
      "Enter the **Original price** and the discount (or the sale price, for **Percent off**).",
      "Optionally add **Sales tax or VAT** to see the price at the till, and pick a **Currency**.",
      "Read what you pay and the saving, with the formula below. Press **Copy result** to copy it.",
    ],
    example: {
      title: "30% off, then 20% + 10% stacked",
      input: "Original price 2,499 with 30% off\nOriginal price 100 with 20% then 10% off",
      output: "You pay 1,749.30 (saving 749.70)\nYou pay 72.00: an effective 28% off, not 30%",
    },
    sections: [
      {
        heading: "Sale price from a percentage",
        body: "Multiply the original price by what's left after the discount:\n\n- Sale price = Original × (1 − Discount ÷ 100)\n- Saving = Original × Discount ÷ 100\n\n25% off 80 is 80 × 0.75 = 60, a saving of 20. A quick mental check: 10% of a price is the price with the decimal point moved one place left (10% of 80 = 8), so 20% is double that and 5% is half.",
      },
      {
        heading: "Finding the discount percentage",
        body: "When a tag shows only the old and new prices, the percent off is the saving divided by the original price:\n\n- Percent off = (Original − Sale) ÷ Original × 100\n\nA price cut from 1,200 to 900 is (1,200 − 900) ÷ 1,200 × 100 = 25% off. Always divide by the original price. Dividing by the sale price (300 ÷ 900 = 33%) answers a different question: how much more the full price is than the sale price.",
      },
      {
        heading: "Stacked (double) discounts",
        body: "\"20% off plus an extra 10%\" means the second discount applies to the already-reduced price, so the percentages multiply rather than add:\n\n- Final = Original × (1 − d₁ ÷ 100) × (1 − d₂ ÷ 100)\n- Effective discount = 1 − (1 − d₁ ÷ 100) × (1 − d₂ ÷ 100)\n\n20% then 10% gives 0.8 × 0.9 = 0.72 of the price: 28% off, not 30%. The order of the two discounts doesn't change the result. **Stacked discounts** accepts up to three.",
      },
      {
        heading: "Discount plus tax",
        body: "Where sales tax or VAT is added at the till, it's normally charged on the discounted price, so the discount also reduces the tax. The calculator applies the optional tax rate after the discount:\n\n- Price paid = Sale price × (1 + Tax ÷ 100)\n\nIn countries where shelf prices already include VAT or GST (the UK, the EU, India), leave the tax box empty: the discount is taken off the tax-inclusive price. To see the tax inside a price, use the [GST calculator](/gst-calculator/).",
      },
    ],
    faq: [
      {
        q: "Is 20% + 10% off the same as 30% off?",
        a: "No. The extra 10% is taken off the reduced price, so the total discount is 28%. On a price of 100 you pay 72, not 70.",
      },
      {
        q: "How do I calculate the percentage off?",
        a: "Subtract the sale price from the original, divide by the original and multiply by 100. From 1,200 to 900: 300 ÷ 1,200 × 100 = 25%.",
      },
      {
        q: "Is tax added before or after the discount?",
        a: "Usually after: the tax is calculated on what you actually pay. Store coupons that the retailer funds normally reduce the taxable price; some manufacturer coupons don't, depending on local rules.",
      },
    ],
    related: ["percentage-calculator", "gst-calculator", "loan-emi-calculator", "adsense-calculator"],
    links: [
      { href: "/percentage-calculator/", anchor: "percentage calculator" },
      { href: "/gst-calculator/", anchor: "GST calculator" },
    ],
    appCategory: "FinanceApplication",
    features: ["Sale price and saving from a percentage", "Percent off between two prices", "Up to three stacked discounts with the effective rate", "Optional sales tax after the discount"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "percentage-calculator",
    path: "/percentage-calculator/",
    name: "Percentage Calculator",
    h1: "Percentage Calculator",
    title: "Percentage Calculator – Percent Of, Change and Difference",
    metaDescription:
      "Calculate X% of a number, what percent one number is of another, percentage increase or decrease, and percentage difference, with each formula shown.",
    summary:
      "Work out X% of a number, what percent one number is of another, the percentage change between two values, or the percentage difference, with the formula shown for each.",
    category: "calculator-tools",
    subgroup: "money",
    card: "Work out percent of, percent change and percentage difference with formulas.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "percentage" },
    aliases: ["percent calculator", "percentage increase calculator", "percentage change calculator", "percentage difference calculator", "what percent of", "percentage of marks", "percentage calc", "percentege calculator", "% calculator"],
    keywords: ["percent", "marks", "increase", "decrease", "growth"],
    processing: "browser",
    steps: [
      "Choose a calculation: **X% of Y**, **X is what % of Y**, **% change**, **% difference** or **Increase / decrease**.",
      "Type the two numbers into the boxes. The result updates as you type.",
      "Read the answer and the formula with your numbers underneath. Press **Copy result** to copy it.",
    ],
    example: {
      title: "Four common questions",
      input: "15% of 240\n45 is what % of 60\n% change from 80 to 100\n% difference between 80 and 100",
      output: "36\n75%\n+25% (increase)\n22.2222%",
      note: "A change from 100 back to 80 is −20%, not −25%: the percentage change is always measured from the starting value.",
    },
    sections: [
      {
        heading: "X percent of Y",
        body: "\"Percent\" means \"per hundred\", so X% of Y is X ÷ 100 × Y. 15% of 240 = 0.15 × 240 = 36.\n\nPercentages are reversible: X% of Y equals Y% of X. 8% of 50 is the same as 50% of 8, which is 4, a handy shortcut for mental arithmetic.",
      },
      {
        heading: "X is what percent of Y",
        body: "Divide the part by the whole and multiply by 100: X ÷ Y × 100. 45 out of 60 is 45 ÷ 60 × 100 = 75%.\n\nThe whole (Y) can't be zero. If the part is bigger than the whole the answer is over 100%, which is correct: 90 is 150% of 60.",
      },
      {
        heading: "Percentage increase and decrease",
        body: "**Percentage change** compares a new value with an old one:\n\n- % change = (New − Old) ÷ |Old| × 100\n\nFrom 80 to 100 is +25%; from 100 to 80 is −20%. The two differ because each is measured from its own starting value. A 50% fall followed by a 50% rise leaves you at 75% of where you started.\n\n**Increase / decrease** goes the other way: 240 increased by 15% is 240 × 1.15 = 276. To undo a percentage increase, divide rather than subtract: 276 ÷ 1.15 = 240.",
      },
      {
        heading: "Percentage difference vs percentage change",
        body: "Use **percentage change** when one value clearly comes first (last year vs this year, old price vs new price). Use **percentage difference** when neither value is the reference, for example two shops' prices or two lab measurements:\n\n- % difference = |A − B| ÷ ((A + B) ÷ 2) × 100\n\nIt divides by the average of the two values, so swapping A and B gives the same answer. 80 and 100 differ by 20 ÷ 90 × 100 = 22.22%.\n\nDon't confuse either with **percentage points**: a rate rising from 4% to 5% is a rise of 1 percentage point, but a 25% increase.",
      },
      {
        heading: "Percentage of marks",
        body: "Choose **X is what % of Y**, enter the marks you scored as X and the maximum marks as Y. 432 out of 500 is 432 ÷ 500 × 100 = 86.4%.\n\nFor an overall percentage across subjects, add up all the marks scored and all the maximum marks first, then divide. Averaging the subject percentages gives a different answer when subjects have different maximum marks. Some boards and universities use their own conversions (for example CGPA × 9.5 under CBSE's former grading scheme), so check your institution's rule before quoting a converted figure.",
      },
    ],
    faq: [
      {
        q: "How do I calculate percentage increase?",
        a: "Subtract the old value from the new value, divide by the old value and multiply by 100. From 80 to 100: 20 ÷ 80 × 100 = 25%.",
      },
      {
        q: "What's the difference between percentage change and percentage difference?",
        a: "Percentage change measures from a starting value, so its direction matters. Percentage difference compares two values against their average and is the same whichever comes first.",
      },
      {
        q: "How do I work out my exam percentage?",
        a: "Divide total marks obtained by total maximum marks and multiply by 100. Use **X is what % of Y** with your marks as X and the maximum as Y.",
      },
    ],
    related: ["discount-calculator", "gst-calculator", "adsense-calculator", "loan-emi-calculator", "bmi-calculator"],
    links: [
      { href: "/discount-calculator/", anchor: "discount calculator" },
      { href: "/gst-calculator/", anchor: "GST calculator" },
      { href: "/adsense-calculator/", anchor: "AdSense calculator" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["X% of Y and X as a percent of Y", "Percentage change, increase and decrease", "Symmetric percentage difference", "Formula with your numbers under every result"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  /* ---------------- Loans ---------------- */
  {
    id: "loan-emi-calculator",
    path: "/loan-emi-calculator/",
    name: "Loan EMI Calculator",
    h1: "Loan EMI Calculator",
    title: "EMI Calculator – Home, Car and Personal Loan EMI",
    metaDescription:
      "Calculate your monthly EMI, total interest and total payment for any loan amount, rate and tenure, with a month-by-month amortization schedule.",
    summary:
      "Calculate the monthly EMI, total interest and total repayment for a home, car or personal loan, and see how every payment splits between interest and principal.",
    category: "calculator-tools",
    subgroup: "loans",
    card: "Calculate a loan's monthly EMI, total interest and amortization schedule.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "emi" },
    aliases: ["emi calculator", "home loan emi calculator", "car loan emi calculator", "personal loan emi calculator", "emi calc", "loan calculator", "amortization schedule", "amortisation calculator", "monthly installment calculator", "emi formula"],
    keywords: ["loan", "mortgage", "interest", "tenure", "installment"],
    processing: "browser",
    limits: [
      "Assumes a fixed rate for the whole tenure, monthly payments and monthly reducing-balance interest. Your lender's figure can differ slightly because of processing fees, insurance or the day-count method.",
    ],
    steps: [
      "Enter the **Loan amount**, the yearly **Interest rate** and the **Tenure**.",
      "Switch **Tenure in** between **Years** and **Months** if needed, and choose a **Currency**.",
      "Read the **Monthly EMI**, total interest and total of all payments, with the formula underneath.",
      "Scroll to **Amortization schedule**, view it **By year** or **By month**, and press **CSV** to download it.",
    ],
    example: {
      title: "Home loan: 10,00,000 at 8.5% for 20 years",
      input: "Loan amount 1,000,000 · Interest rate 8.5% p.a. · Tenure 20 years",
      output: "Monthly EMI 8,678.23\nTotal interest 1,082,775.76\nTotal of all payments 2,082,775.76",
      note: "In month 1, 7,083.33 of the EMI is interest and only 1,594.90 repays principal. By the last month, interest is 61.04.",
    },
    sections: [
      {
        heading: "The EMI formula",
        body: "An equated monthly instalment (EMI) is the fixed payment that repays a reducing-balance loan exactly over its tenure:\n\n`EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)`\n\n- **P** = principal (the amount borrowed)\n- **r** = monthly interest rate = annual rate ÷ 12 ÷ 100 (8.5% → 0.0070833)\n- **n** = number of monthly payments (20 years → 240)\n\nEach month, interest is charged on the outstanding balance only, and the rest of the EMI reduces the balance. At 0% interest the formula reduces to P ÷ n.",
      },
      {
        heading: "Amortization schedule",
        body: "The schedule lists every payment with its interest part, principal part and remaining balance:\n\n- Interest this month = Balance × r\n- Principal this month = EMI − Interest\n- New balance = Balance − Principal\n\nEarly payments are mostly interest because the balance is at its largest. On the 10,00,000 example, the first year's payments total 1,04,138.79, of which 84,236.50 is interest and only 19,902.29 reduces the loan. The final payment is adjusted by a few paise so the balance ends at exactly zero.",
      },
      {
        heading: "How rate and tenure change the EMI",
        body: "Same 10,00,000 loan, different terms:\n\n| Rate | Tenure | EMI | Total interest |\n|---|---|---|---|\n| 8.5% | 15 years | 9,847.40 | 7,72,531.20 |\n| 8.5% | 20 years | 8,678.23 | 10,82,775.76 |\n| 8.5% | 25 years | 8,052.27 | 14,15,681.25 |\n| 7.5% | 20 years | 8,055.93 | 9,33,423.66 |\n| 9.5% | 20 years | 9,321.31 | 12,37,114.85 |\n\nStretching 20 years to 25 cuts the EMI by 626 a month but adds over 3.3 lakh of interest. One percentage point on the rate changes the 20-year total by roughly 1.5 lakh.",
      },
      {
        heading: "Prepayments",
        body: "A part-prepayment goes straight to principal, so all later interest is charged on a smaller balance. Lenders then either keep the EMI and shorten the tenure, or keep the tenure and lower the EMI. Keeping the EMI saves more interest.\n\nOn the example loan, the balance after 5 years is 8,81,271.83. Prepaying 2,00,000 then and keeping the EMI at 8,678.23 clears the loan in about 115 more months instead of 180; keeping the tenure instead lowers the EMI to 6,708.75. In India, RBI rules stop banks and NBFCs charging prepayment penalties on floating-rate loans to individuals for non-business purposes; check your loan agreement for fixed-rate loans.",
      },
      {
        heading: "Fixed vs floating rates",
        body: "With a **fixed rate**, the EMI and the schedule above hold for the agreed period. With a **floating rate**, the rate moves with a benchmark (in India, usually the repo-linked lending rate), and the lender changes either the EMI or the tenure when it resets. Indian lenders must tell you about a reset and let you choose between a higher EMI and a longer tenure, within limits.\n\nTo see the effect of a rate change, enter the outstanding balance, the new rate and the remaining months.",
      },
    ],
    faq: [
      {
        q: "How is EMI calculated?",
        a: "With the reducing-balance formula EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where r is the monthly rate and n the number of months. The calculator shows the formula with your numbers.",
      },
      {
        q: "Does a longer tenure cost more in total?",
        a: "Yes. The EMI falls, but you pay interest for more months. On 10,00,000 at 8.5%, 25 years costs 14,15,681.25 in interest against 7,72,531.20 over 15 years.",
      },
      {
        q: "How does a prepayment reduce EMI?",
        a: "It lowers the outstanding principal. If you ask the lender to keep the tenure, the EMI is recalculated on the smaller balance; if you keep the EMI, the loan finishes sooner and you save more interest.",
      },
      {
        q: "Why is my bank's EMI slightly different?",
        a: "Banks may charge interest from the disbursement date, use a daily-balance method, or add insurance and fees to the loan. The difference is usually a few rupees a month.",
      },
    ],
    sources: [
      { label: "Reserve Bank of India: Pre-payment Charges on Loans Directions, 2025", url: "https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=12878&Mode=0" },
    ],
    related: ["percentage-calculator", "gst-calculator", "discount-calculator", "age-calculator"],
    links: [
      { href: "/percentage-calculator/", anchor: "percentage calculator" },
      { href: "/gst-calculator/", anchor: "GST calculator" },
    ],
    appCategory: "FinanceApplication",
    features: ["Monthly EMI from amount, rate and tenure", "Total interest and total repayment", "Yearly or monthly amortization schedule", "Schedule download as CSV"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  /* ---------------- Health ---------------- */
  {
    id: "bmi-calculator",
    path: "/bmi-calculator/",
    name: "BMI Calculator",
    h1: "BMI Calculator",
    title: "BMI Calculator – Body Mass Index in kg/cm or lb/ft",
    metaDescription:
      "Calculate body mass index from height and weight in metric or imperial units and see the adult WHO category, with BMI's limits explained plainly.",
    summary:
      "Calculate body mass index (BMI) for adults aged 20 and over from height and weight in centimeters and kilograms or feet, inches and pounds, and see the WHO weight category.",
    category: "calculator-tools",
    subgroup: "health",
    card: "Calculate adult BMI in metric or imperial units and see the WHO category.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "bmi" },
    aliases: ["body mass index calculator", "bmi calc", "bmi calculator kg cm", "bmi calculator feet inches", "bmi chart", "bmi for women", "bmi for men", "healthy weight calculator", "bmi checker"],
    keywords: ["weight", "height", "obesity", "overweight", "health"],
    processing: "browser",
    limits: [
      "For adults aged 20 and over. Not for children, teens or during pregnancy.",
      "BMI is a screening measure, not a diagnosis. It doesn't measure body fat, muscle or where fat is carried. Talk to a doctor about your own health.",
    ],
    steps: [
      "Choose **Metric (cm, kg)** or **Imperial (ft, in, lb)**. Your choice is remembered.",
      "Enter your **Height** and **Weight**.",
      "Read **Your BMI** and its WHO category, the weight range that gives a BMI of 18.5–24.9 at your height, and the formula.",
      "Tick **Also show WHO action points for Asian adults** to see the lower Asian cut-offs alongside.",
    ],
    example: {
      title: "Metric and imperial",
      input: "175 cm, 70 kg\n5 ft 9 in, 160 lb",
      output: "BMI 22.9 (Healthy weight); healthy range at 175 cm: 56.7–76.3 kg\nBMI 23.6 (Healthy weight)",
    },
    sections: [
      {
        heading: "Adult BMI categories",
        body: "BMI is weight in kilograms divided by height in meters squared. The World Health Organization classifies adults as:\n\n| BMI | Category |\n|---|---|\n| Below 18.5 | Underweight |\n| 18.5–24.9 | Healthy (normal) weight |\n| 25.0–29.9 | Overweight (pre-obesity) |\n| 30.0–34.9 | Obesity class I |\n| 35.0–39.9 | Obesity class II |\n| 40.0 and above | Obesity class III |\n\nThe same cut-offs apply to men and women. The US CDC uses them from age 20.",
      },
      {
        heading: "Metric and imperial units",
        body: "- **Metric:** BMI = kg ÷ m². 70 kg at 1.75 m: 70 ÷ 3.0625 = 22.9.\n- **Imperial:** BMI = 703 × lb ÷ in². 160 lb at 69 in: 703 × 160 ÷ 4,761 = 23.6.\n\nThe 703 factor comes from the unit conversions (1 lb = 0.45359237 kg, 1 in = 0.0254 m); its exact value is 703.07. The calculator converts imperial inputs exactly, then rounds the BMI to one decimal place, as BMI charts do. A category is decided on the rounded value, so 24.96 shows as 25.0, Overweight.",
      },
      {
        heading: "Lower cut-offs for Asian adults",
        body: "At the same BMI, many Asian populations have a higher percentage of body fat and a higher risk of type 2 diabetes and heart disease. A 2004 WHO expert consultation kept the international categories but proposed extra public-health **action points**: 23 (increased risk) and 27.5 (high risk). Several countries use lower cut-offs in their own guidance; for example, India's 2009 consensus guidelines treat 23–24.9 as overweight and 25 or more as obesity.\n\nTick the Asian action points option to see where your BMI falls on that scale.",
      },
      {
        heading: "Children and teens: BMI-for-age percentiles",
        body: "Adult categories don't apply to anyone under 20 (CDC) or under 19 (WHO). Children's body fat changes with age and differs between boys and girls, so their BMI is compared with growth charts and expressed as a **percentile** for their age and sex. In the CDC charts, the 85th percentile and above is overweight and the 95th and above is obesity.\n\nThis calculator doesn't calculate percentiles. Use the CDC's child and teen BMI calculator or the WHO growth reference, and discuss the result with a pediatrician.",
      },
      {
        heading: "What BMI doesn't measure",
        body: "BMI uses only height and weight, so it can't tell muscle from fat or show where fat is stored.\n\n- Muscular people (athletes, manual workers) can have a high BMI with little body fat.\n- Older adults can have a normal BMI with low muscle and more fat.\n- Fat around the waist carries more health risk than the same weight elsewhere. A waist measurement, or waist-to-height ratio below 0.5, adds useful information.\n\nBMI is a quick screening number for groups and a starting point for a conversation with a health professional, not a verdict on an individual's health.",
      },
    ],
    faq: [
      {
        q: "Is BMI accurate for athletes?",
        a: "Often not. Muscle is denser than fat, so a muscular athlete can be classed as overweight with a healthy body-fat level. Body-fat or waist measurements are more informative for them.",
      },
      {
        q: "Why are Asian BMI cut-offs lower?",
        a: "Studies found that many Asian populations have more body fat and higher diabetes and heart-disease risk at a given BMI, so WHO proposed action points at 23 and 27.5.",
      },
      {
        q: "Can I use this for children?",
        a: "No. Under 20, BMI has to be compared with age- and sex-specific growth charts. Use the CDC child and teen BMI calculator or ask a pediatrician.",
      },
    ],
    sources: [
      { label: "WHO: Obesity and overweight fact sheet", url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight" },
      { label: "CDC: Adult BMI categories", url: "https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" },
      { label: "CDC: Child and teen BMI calculator", url: "https://www.cdc.gov/bmi/child-teen-calculator/index.html" },
      { label: "WHO Expert Consultation (2004). Appropriate body-mass index for Asian populations. The Lancet, 363", url: "https://doi.org/10.1016/S0140-6736(03)15268-3" },
    ],
    related: ["age-calculator", "percentage-calculator", "hours-calculator", "chronological-age-calculator"],
    links: [
      { href: "/age-calculator/", anchor: "age calculator" },
      { href: "/percentage-calculator/", anchor: "percentage calculator" },
    ],
    appCategory: "HealthApplication",
    features: ["Metric and imperial inputs", "WHO adult categories with your position on a scale", "Healthy weight range for your height", "Optional WHO action points for Asian adults"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  /* ---------------- Websites and file sizes ---------------- */
  {
    id: "adsense-calculator",
    path: "/adsense-calculator/",
    name: "AdSense Calculator",
    h1: "AdSense Calculator",
    title: "AdSense Calculator – Estimate Earnings From RPM or CPC",
    metaDescription:
      "Estimate AdSense earnings from page views using either page RPM or CTR and CPC, per day, month and year. Enter your own figures for a useful estimate.",
    summary:
      "Estimate AdSense earnings per day, month and year from your page views and either your page RPM or your click-through rate and cost per click.",
    category: "calculator-tools",
    subgroup: "web",
    card: "Estimate AdSense earnings from page views and your own RPM or CPC.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "adsense" },
    aliases: ["adsense revenue calculator", "adsense earnings calculator", "rpm calculator", "page rpm calculator", "adsense income calculator", "ad revenue calculator", "adsence calculator", "cpc calculator"],
    keywords: ["adsense", "rpm", "cpc", "ctr", "blog income", "website revenue"],
    processing: "browser",
    limits: [
      "An estimate from the numbers you enter, not a prediction. Real earnings change daily with advertiser demand, season, country and topic.",
      "The CTR × CPC method counts click revenue only; most sites also earn from impressions, which page RPM already includes.",
    ],
    steps: [
      "Choose **Page RPM** (recommended if you have AdSense data) or **CTR × CPC**.",
      "Enter **Page views per day** and either your page RPM or your page CTR and cost per click.",
      "Pick a **Currency** to match your AdSense reports.",
      "Read the estimate per day, month and year, with the formula below. **Example values** fills in sample numbers to try it.",
    ],
    example: {
      title: "Example values (not typical earnings)",
      input: "10,000 page views a day at a page RPM of 5.00\n10,000 page views a day, CTR 1.5%, CPC 0.40",
      output: "50.00 a day · 1,500.00 a month · 18,250.00 a year\n60.00 a day (implied page RPM 6.00)",
    },
    sections: [
      {
        heading: "RPM-based vs CTR x CPC estimates",
        body: "**Page RPM** is AdSense's estimated earnings per 1,000 page views. It already includes clicks, impressions and every ad on the page, so it's the most reliable input:\n\n- Earnings = Page views ÷ 1,000 × Page RPM\n\n**CTR × CPC** builds the estimate from clicks:\n\n- Earnings = Page views × CTR ÷ 100 × CPC\n- Implied page RPM = CTR ÷ 100 × CPC × 1,000\n\nUse it to test \"what if\" changes (a higher-paying topic, better ad placement), but remember it leaves out impression-based revenue.",
      },
      {
        heading: "Where to find your real RPM",
        body: "In AdSense, open **Reports**, choose a date range of at least 28 days, and read **Page RPM** alongside page views and estimated earnings. Break the report down by **Country** and **Site** or **URL channel**: a site's average hides large differences between pages and audiences.\n\nIf you don't have an AdSense account yet, there is no reliable RPM to plug in. Figures quoted online are averages across unrelated sites, so treat any estimate from them as a rough range, not a forecast.",
      },
      {
        heading: "Why earnings vary by country and niche",
        body: "AdSense is an auction. Advertisers bid more for audiences who are likely to buy, so:\n\n- **Topic** matters: finance, insurance, software and legal pages attract higher bids than entertainment or general news.\n- **Visitor country** matters: traffic from countries with high advertising spend usually earns more per view.\n- **Season** matters: bids rise before major shopping periods and often fall in January.\n- **Page layout and speed** matter: ads that load late or sit below the fold are seen less, which lowers RPM.",
      },
      {
        heading: "Daily, monthly and yearly projections",
        body: "The calculator multiplies the daily figure by 30 for a month and 365 for a year. Real months vary because traffic and RPM rise and fall through the week and the year, so use the monthly figure as a planning number.\n\nAdSense pays from finalized earnings, which can be lower than the estimates in your reports after invalid traffic is removed, and a payment is made once your balance reaches the payment threshold for your currency.",
      },
    ],
    faq: [
      {
        q: "How much does AdSense pay per 1,000 views?",
        a: "That is your page RPM, and it varies by site. You'll find it in your AdSense reports. Any single \"average\" figure is misleading because RPM depends on topic, country and season.",
      },
      {
        q: "What's the difference between RPM and CPM?",
        a: "CPM is what advertisers pay per 1,000 ad impressions. RPM is what you, the publisher, earn per 1,000 page views (or impressions), after Google's share and across all ads on the page.",
      },
      {
        q: "Why is my RPM lower than estimates?",
        a: "Common reasons are traffic from lower-paying countries, a low-bid topic, ads seen by few visitors, ad blockers, or seasonal dips. Compare RPM by country and page in your reports to find the cause.",
      },
    ],
    sources: [
      { label: "Google AdSense Help: Page RPM", url: "https://support.google.com/adsense/answer/112030" },
      { label: "Google AdSense Help: Revenue per thousand impressions (RPM)", url: "https://support.google.com/adsense/answer/190515" },
    ],
    related: ["percentage-calculator", "mb-to-kb-converter", "discount-calculator", "word-counter"],
    links: [
      { href: "/percentage-calculator/", anchor: "percentage calculator" },
      { href: "/website-speed-checker/", anchor: "website speed test" },
    ],
    appCategory: "BusinessApplication",
    features: ["Estimate from page RPM or from CTR × CPC", "Daily, monthly and yearly figures", "Implied RPM from CTR and CPC", "Currency selector; no built-in averages"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "mb-to-kb-converter",
    path: "/mb-to-kb-converter/",
    name: "MB to KB Converter",
    h1: "MB to KB Converter",
    title: "MB to KB Converter – File Size Units (1024 vs 1000)",
    metaDescription:
      "Convert between bytes, KB, MB and GB in both binary (1 MB = 1024 KB) and decimal (1 MB = 1000 KB) conventions, and see why file sizes differ.",
    summary:
      "Convert file sizes between bytes, KB, MB and GB in both conventions side by side: decimal (1 MB = 1,000 KB) and binary (1 MB = 1,024 KB, as Windows shows).",
    category: "calculator-tools",
    subgroup: "web",
    card: "Convert MB, KB and GB in both the 1,000 and 1,024 conventions.",
    archetype: "calculator",
    widget: "calculator",
    config: { mode: "mb-kb" },
    aliases: ["mb to kb", "kb to mb", "convert mb to kb", "file size converter", "gb to mb", "mb to gb", "how many kb in a mb", "mib to mb", "megabytes to kilobytes", "bytes converter"],
    keywords: ["file size", "kilobyte", "megabyte", "gigabyte", "kibibyte", "mebibyte"],
    processing: "browser",
    steps: [
      "Type a **Size** and choose its **Unit**.",
      "If the unit is KB, MB, GB or TB, choose whether it's **Decimal** (1,000) or **Binary** (1,024). Use binary for sizes shown by Windows.",
      "Read the size in KB at the top and the full table in both conventions. Press **Copy result** to copy it.",
    ],
    example: {
      title: "2 MB both ways",
      input: "2 MB (decimal)\n2 MB (binary, as Windows shows)",
      output: "2,000 KB · 1,953.125 KiB · 2,000,000 bytes\n2,048 KiB · 2,097.152 KB · 2,097,152 bytes",
    },
    sections: [
      {
        heading: "1 MB = 1024 KB or 1000 KB?",
        body: "Both, depending on who is counting:\n\n- **Decimal (SI):** 1 KB = 1,000 bytes and 1 MB = 1,000 KB = 1,000,000 bytes. Used by storage makers, macOS, iOS, Android and most websites' upload limits.\n- **Binary:** 1 KiB = 1,024 bytes and 1 MiB = 1,024 KiB = 1,048,576 bytes. Windows uses these values but labels them KB and MB.\n\nTo remove the ambiguity, the IEC defined the binary prefixes kibi (KiB), mebi (MiB) and gibi (GiB) in 1998. When a form says \"max 2 MB\", it usually means 2,000,000 bytes, but some systems check 2,097,152, so leave a little headroom.",
      },
      {
        heading: "KB, MB and GB conversions",
        body: "| From | Decimal | Binary |\n|---|---|---|\n| 1 KB | 1,000 bytes | 1,024 bytes (1 KiB) |\n| 1 MB | 1,000 KB | 1,024 KiB |\n| 1 GB | 1,000 MB | 1,024 MiB |\n| 1 TB | 1,000 GB | 1,024 GiB |\n\nTo convert, multiply or divide by 1,000 (or 1,024) once per step: MB → KB is × 1,000, KB → MB is ÷ 1,000. 500 KB = 0.5 MB in decimal units. The difference between the conventions grows with each step: 2.4% at KB, 4.9% at MB, 7.4% at GB and 10% at TB.",
      },
      {
        heading: "Why Windows and macOS show different sizes",
        body: "A photo of exactly 2,000,000 bytes is \"2 MB\" in macOS Finder and \"1.90 MB\" in Windows Explorer, because Windows divides by 1,048,576. Nothing is lost; the same bytes are being counted with different units.\n\nThe same effect explains why a \"1 TB\" drive shows about 931 GB in Windows: 1,000,000,000,000 ÷ 1,073,741,824 = 931.3. Formatting and system files then take some more space, as Apple and drive makers explain in their capacity notes.",
      },
      {
        heading: "Reducing a file from MB to KB",
        body: "Converting units doesn't change a file's size. If a form asks for a photo \"under 100 KB\" and yours is 2 MB, the file itself has to be made smaller by compressing it, reducing its pixel dimensions, or both.\n\n- [Reduce an image to an exact size in KB](/reduce-image-size-in-kb/) for application forms and ID photos.\n- [Compress an image to 1 MB](/compress-image-to-1mb/) for email and uploads.\n- [Compress a PDF](/compress-pdf/) for document uploads.\n\nThe image size tools count 1 KB as 1,000 bytes by default, matching most upload checks, and have a 1,024-byte option.",
      },
    ],
    faq: [
      {
        q: "How many KB are in 1 MB?",
        a: "1,000 KB in decimal units, which most websites and Apple devices use, or 1,024 KB (KiB) in the binary units Windows uses.",
      },
      {
        q: "Why does my 2 MB photo show as 1.9 MB?",
        a: "Your file is about 2,000,000 bytes. Windows divides by 1,048,576 bytes per MB, which gives 1.9. The file hasn't shrunk; the unit is different.",
      },
      {
        q: "How do I reduce a photo from MB to KB?",
        a: "Compress it to a target size with the [reduce image size in KB](/reduce-image-size-in-kb/) tool. Changing the unit label won't make the file smaller.",
      },
    ],
    sources: [
      { label: "NIST: Prefixes for binary multiples (IEC 60027-2, now IEC 80000-13)", url: "https://physics.nist.gov/cuu/Units/binary.html" },
      { label: "Apple Support: How storage capacity is measured on Apple devices", url: "https://support.apple.com/en-us/102119" },
    ],
    related: ["reduce-image-size-in-kb", "compress-image-to-1mb", "compress-pdf", "image-compressor", "adsense-calculator"],
    links: [
      { href: "/reduce-image-size-in-kb/", anchor: "reduce an image from MB to KB" },
      { href: "/compress-pdf/", anchor: "compress PDF" },
      { href: "/compress-image-to-1mb/", anchor: "compress image to 1MB" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["Decimal and binary results side by side", "Bytes, KB, MB, GB, TB, KiB, MiB and GiB", "Choose what your KB/MB label means", "Links to tools that actually shrink files"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  /* ---------------- Dates and time ---------------- */
  {
    id: "age-calculator",
    path: "/age-calculator/",
    name: "Age Calculator",
    h1: "Age Calculator",
    title: "Age Calculator – Exact Age in Years, Months and Days",
    metaDescription:
      "Enter a date of birth to get an exact age in years, months and days, total days lived and days to the next birthday. Works out age on any date.",
    summary:
      "Enter a date of birth to see exactly how old you are in years, months and days, how many days you've lived, and how long until your next birthday. Change the date to get an age on any day.",
    category: "calculator-tools",
    subgroup: "dates",
    card: "Find an exact age in years, months and days, and days to the next birthday.",
    archetype: "calculator",
    widget: "age-calculator",
    config: { mode: "age" },
    aliases: ["how old am i", "age calc", "calculate age", "age calculator by date of birth", "date of birth calculator", "birthday calculator", "age difference calculator", "days old calculator", "dob calculator"],
    keywords: ["birthday", "years", "months", "days", "dob"],
    processing: "browser",
    steps: [
      "Enter the **Date of birth**.",
      "Leave **Age on** as today, or pick another date. Press **Today** to reset it.",
      "Read the age in years, months and days, the totals in months, weeks, days and hours, and the **Next birthday**.",
      "Press **Copy result** to copy the age.",
    ],
    example: {
      title: "Born 15 May 1990, age on 5 October 2026",
      input: "Date of birth 1990-05-15 · Age on 2026-10-05",
      output:
        "36 years, 4 months, 20 days\nTotal: 436 months · 1,898 weeks and 6 days · 13,292 days\nNext birthday: Saturday, 15 May 2027, in 222 days (turning 37)\nBorn on a Tuesday",
    },
    sections: [
      {
        heading: "Exact age in years, months and days",
        body: "The calculator counts whole months from the date of birth to the target date, then the days left over:\n\n1. Count complete months: from 15 May 1990 to 15 September 2026 is 436 months, or 36 years and 4 months.\n2. Count the days from that monthly anniversary to the target date: 15 September to 5 October is 20 days.\n\nWhen a birth day doesn't exist in a month (the 31st in a 30-day month), that month's anniversary falls on its last day. Totals in days count real calendar days, including every 29 February in between, so they don't depend on an average month length.",
      },
      {
        heading: "Age on a specific date",
        body: "Change **Age on** to any date in the past or future to answer questions such as \"How old was I when I started school?\" or \"Will I be 18 on the exam date?\". Forms with an age limit usually count completed years on a cut-off date: someone born on 2 October 2008 is 17 on 1 October 2026 and turns 18 the next day.\n\nAge is counted in whole calendar days. The time of birth and time zones are ignored, as they are on official documents.",
      },
      {
        heading: "Age difference between two people",
        body: "Enter the older person's date of birth as **Date of birth** and the younger person's as **Age on**. The result is the gap between them in years, months and days, and the totals give it in days or weeks.\n\nFor example, people born on 3 March 1985 and 20 November 1988 are 3 years, 8 months and 17 days apart. The gap stays the same throughout their lives, even though their ages in years differ by 3 for part of each year and by 4 for the rest.",
      },
      {
        heading: "Next birthday countdown",
        body: "**Next birthday** shows the date and weekday of the coming birthday, how many days away it is, and the age you'll turn. If the target date is the birthday itself, it says so.\n\nFor a countdown to any other date, set **Date of birth** to today and **Age on** to the event: **Total days** is the number of days to go.",
      },
      {
        heading: "Leap years",
        body: "A leap year has 366 days and adds 29 February. Years divisible by 4 are leap years, except century years, which must be divisible by 400: 2000 was a leap year, 1900 wasn't and 2100 won't be.\n\nFor someone born on 29 February, this calculator counts the birthday on 28 February in common years, so they turn a year older on 28 February 2027. Legal rules differ between countries: some treat 1 March as the birthday in common years. If the date matters for a legal age, check the rule where you live.",
      },
    ],
    faq: [
      {
        q: "How is age calculated for someone born on 29 February?",
        a: "In years without 29 February, this calculator uses 28 February as the birthday. Someone born on 29 February 2000 is 26 years, 7 months and 6 days old on 5 October 2026, and their next birthday is 28 February 2027.",
      },
      {
        q: "How many days old am I?",
        a: "Enter your date of birth and read **Total days**. Someone born on 1 January 2000 is 9,774 days old on 5 October 2026.",
      },
      {
        q: "Can I calculate age on a past date?",
        a: "Yes. Change **Age on** to any date after the date of birth, for example the date of a past event or a school admission cut-off.",
      },
    ],
    related: ["chronological-age-calculator", "hours-calculator", "bmi-calculator", "loan-emi-calculator"],
    links: [
      { href: "/chronological-age-calculator/", anchor: "chronological age for test scoring" },
      { href: "/hours-calculator/", anchor: "hours calculator" },
      { href: "/bmi-calculator/", anchor: "BMI calculator" },
    ],
    appCategory: "UtilitiesApplication",
    features: ["Exact age in years, months and days", "Totals in months, weeks, days and hours", "Age on any past or future date", "Next birthday date, weekday and countdown"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
  {
    id: "chronological-age-calculator",
    path: "/chronological-age-calculator/",
    name: "Chronological Age Calculator",
    h1: "Chronological Age Calculator",
    title: "Chronological Age Calculator for Testing (Years;Months;Days)",
    metaDescription:
      "Calculate a student's or client's chronological age on the test date in years;months;days, with optional rounding and adjusted age for prematurity.",
    summary:
      "Calculate a student's or client's chronological age on the test date in years;months;days, the format used to look up norms in standardized assessments, with the borrowing shown step by step.",
    category: "calculator-tools",
    subgroup: "dates",
    card: "Get chronological age on a test date as years;months;days for scoring.",
    archetype: "calculator",
    widget: "age-calculator",
    config: { mode: "chronological" },
    aliases: ["chronological age", "calculate chronological age", "chronological age for testing", "ca calculator", "age at testing calculator", "corrected age calculator", "adjusted age calculator", "chronological age in years months days", "cronological age calculator"],
    keywords: ["assessment", "speech therapy", "psychology", "norms", "premature", "test date"],
    processing: "browser",
    limits: ["Use the method and rounding rule in your test's manual. When a publisher's scoring software calculates age for you, its result takes precedence."],
    steps: [
      "Enter the **Birth date** and the **Test date** (today by default).",
      "Choose the **Method**: **Borrow 30 days (hand method)** as printed in many manuals, or **Calendar months**.",
      "Set **Rounding** if your manual requires it, and tick **Also calculate adjusted age for prematurity** if the child was born early.",
      "Read the age as years;months;days with the worked subtraction underneath, and press **Copy result**.",
    ],
    example: {
      title: "Birth 23 June 2018, tested 5 October 2026",
      input: "Birth date 2018-06-23 · Test date 2026-10-05 · Borrow 30 days",
      output: "8;3;12 (8 years, 3 months, 12 days)\nTotal months: 99\nRounded at 16 days or more: 8;3",
      note: "Days: 5 is less than 23, so 1 month is borrowed as 30 days: 35 − 23 = 12 days, and September (9) − June (6) = 3 months.",
    },
    sections: [
      {
        heading: "Birth date and test date",
        body: "Chronological age (CA) is the exact time between a person's birth date and the date they are tested. Standardized tests in psychology, education, and speech and language therapy convert raw scores using norms tables split by age bands (for example 8;0 to 8;3), so a few days can move a child into a different band.\n\nAge is written years;months;days, or years:months, so 8;3;12 means 8 years, 3 months and 12 days. Record the date of the first testing session unless the manual says otherwise for testing spread over several days.",
      },
      {
        heading: "Borrowing days and months: the method",
        body: "Write the test date above the birth date as year, month and day, and subtract from right to left:\n\n| | Year | Month | Day |\n|---|---|---|---|\n| Test date | 2026 | 10 → 9 | 5 → 35 |\n| Birth date | 2018 | 6 | 23 |\n| Age | 8 | 3 | 12 |\n\n- If the test day is smaller than the birth day, borrow 1 month from the month column and add **30 days**.\n- If the test month is then smaller than the birth month, borrow 1 year and add **12 months**.\n\n**Calendar months** instead counts real month lengths. The two can differ by a day or two around month ends: from 31 January 2019 to 1 March 2026 is 7;1;0 by the 30-day method and 7;1;1 by the calendar method.",
      },
      {
        heading: "Rounding rules in test manuals",
        body: "Manuals differ, which is why the calculator labels each option:\n\n- **Don't round**: report years;months;days and use years;months to find the norms band. Many current tests work this way.\n- **Round up at 16 days or more** or **at 15 days or more**: older manuals that report age in whole months. 8;3;12 stays 8;3; 8;11;20 becomes 9;0.\n- **Drop the days**: never round up.\n\nUse exactly the rule printed in your test's administration or scoring manual. Rounding the wrong way can shift a score by a whole norms band.",
      },
      {
        heading: "Adjusted (corrected) age for prematurity",
        body: "For babies born before 37 weeks, development is often judged against **adjusted age**: age counted from the due date (40 weeks) rather than the birth date. Adjusted age = chronological age − weeks born early.\n\nA baby born on 10 March 2025 at 32 weeks has a due date of 5 May 2025. On 20 January 2026 their chronological age is 0;10;10 and their adjusted age is 0;8;15. Adjustment is usually used until about 24 months chronological age; check whether your test's norms expect corrected age and up to what age.",
      },
      {
        heading: "Chronological vs developmental age",
        body: "Chronological age is calendar time since birth, and it is what you enter into a norms table. **Developmental age** (or age-equivalent) is an output of testing: the age at which a typical child achieves a given raw score. A 9-year-old with an age-equivalent of 7;6 on a vocabulary test scored like a typical child of 7½.\n\nAge-equivalents are coarse and easy to misread, so most publishers recommend reporting standard scores and percentiles, which are calculated from chronological age.",
      },
    ],
    faq: [
      {
        q: "How do you calculate chronological age for testing?",
        a: "Subtract the birth date from the test date column by column (years, months, days), borrowing 30 days from the months column and 12 months from the years column when needed. The calculator shows each borrowing step.",
      },
      {
        q: "Should I round the days up?",
        a: "Only if your test's manual says to. Some older manuals round 15 or 16 days and more up to the next month; many current tests use years and months without rounding up.",
      },
      {
        q: "When should I use adjusted age?",
        a: "For children born before 37 weeks, usually until 2 years of chronological age, and only when the test's guidance supports it. Report both chronological and adjusted age.",
      },
    ],
    related: ["age-calculator", "hours-calculator", "percentage-calculator", "bmi-calculator"],
    links: [{ href: "/age-calculator/", anchor: "everyday age calculator" }],
    appCategory: "EducationalApplication",
    features: ["Years;months;days on the test date", "30-day borrowing or calendar-month method", "Labelled rounding options for test manuals", "Adjusted age for prematurity from gestational age"],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },
  {
    id: "hours-calculator",
    path: "/hours-calculator/",
    name: "Hours Calculator",
    h1: "Hours Calculator",
    title: "Hours Calculator – Hours Worked, Breaks and Decimal Time",
    metaDescription:
      "Calculate hours between two times, including overnight shifts and unpaid breaks, total a week of shifts, and convert hours and minutes to decimal.",
    summary:
      "Work out the hours between two times, including overnight shifts and unpaid breaks, add up a week of shifts like a time card, and convert hours and minutes to decimal hours for payroll.",
    category: "calculator-tools",
    subgroup: "dates",
    card: "Total hours worked with breaks and overnight shifts, in h:mm and decimal.",
    archetype: "calculator",
    widget: "hours-calculator",
    aliases: ["work hours calculator", "time card calculator", "hours worked calculator", "time duration calculator", "timesheet calculator", "hours between two times", "decimal hours converter", "shift calculator", "hour calculator"],
    keywords: ["timesheet", "payroll", "shift", "overtime", "break", "minutes"],
    processing: "browser",
    steps: [
      "Enter a **Start** and **End** time and any unpaid **Break (min)** for the first shift.",
      "Press **Add shift** for each extra day. A new row copies the previous times, so you only change what's different.",
      "Read each shift's hours, the **Total (h:mm)** and the **Decimal hours**. Add an **Hourly rate** to see pay.",
      "Press **Copy totals** or **Download CSV** to keep a record.",
    ],
    example: {
      title: "Three shifts, one overnight",
      input: "Monday 08:00–17:30, break 30 min\nTuesday 09:15–17:00, break 45 min\nWednesday 22:00–06:30, break 30 min\nHourly rate 15",
      output: "Monday 9:00 (9 h)\nTuesday 7:00 (7 h)\nWednesday 8:00 (8 h, overnight)\nTotal 24:00 = 24 decimal hours; pay 360.00",
    },
    sections: [
      {
        heading: "Hours between two times",
        body: "Subtract the start time from the end time. Working in minutes avoids mistakes: 08:00 is 480 minutes after midnight and 17:30 is 1,050, so the shift spans 570 minutes, or 9 hours 30 minutes.\n\nTime fields follow your device's clock format, so you can enter 5:30 PM or 17:30. Shifts are counted to the minute; if your employer rounds clock-in times (for example to the nearest 15 minutes), round the times before you enter them.",
      },
      {
        heading: "Overnight shifts",
        body: "When the end time is earlier than the start time, the shift is treated as ending the next day and 24 hours are added: 22:00 to 06:30 is (390 + 1,440) − 1,320 = 510 minutes, or 8 hours 30 minutes. The row is marked **Overnight**.\n\nFor shifts longer than 24 hours, or when daylight-saving time changes during the night, adjust by the extra hour yourself: a night shift that spans the spring-forward change is one hour shorter than the clock times suggest.",
      },
      {
        heading: "Subtracting breaks",
        body: "Enter unpaid breaks in minutes and they're taken off the shift: 08:00–17:30 with a 30-minute lunch is 9 hours 30 minutes − 30 minutes = 9 hours worked. Leave paid breaks out of the break box, since they count as working time.\n\nRules on rest breaks vary by country and contract. In the UK, for example, workers are entitled to a 20-minute break when they work more than 6 hours a day, and it doesn't have to be paid.",
      },
      {
        heading: "Weekly time card totals",
        body: "Add a row per shift and the footer keeps a running total for the week, in hours and minutes and in decimal hours. Labels default to the next weekday, but you can type anything, such as a date or a job name.\n\nIf you're paid overtime above a weekly threshold (for example over 40 hours under the US Fair Labor Standards Act), compare the decimal total with the threshold: 43.5 hours means 3.5 overtime hours. **Download CSV** saves the rows and totals for a spreadsheet.",
      },
      {
        heading: "Decimal hours",
        body: "Payroll systems multiply hours by a rate, so they need hours as a decimal. Divide the minutes by 60:\n\n| Minutes | Decimal |\n|---|---|\n| 6 | 0.1 |\n| 15 | 0.25 |\n| 20 | 0.33 |\n| 30 | 0.5 |\n| 45 | 0.75 |\n\n7 hours 45 minutes is 7.75 hours, not 7.45. Going the other way, multiply the decimal part by 60: 8.2 hours is 8 hours 12 minutes. The converter under the shifts does both directions.",
      },
    ],
    faq: [
      {
        q: "How do I calculate hours worked with a lunch break?",
        a: "Subtract the start time from the end time, then subtract the unpaid break. 08:00 to 17:30 with a 30-minute lunch is 9 hours.",
      },
      {
        q: "What is 7 hours 45 minutes in decimal?",
        a: "7.75 hours, because 45 minutes ÷ 60 = 0.75.",
      },
      {
        q: "How do I handle a shift past midnight?",
        a: "Enter the times as they are, for example 22:00 to 06:30. Because the end is earlier than the start, the calculator adds 24 hours and marks the shift as overnight: 8 hours 30 minutes before breaks.",
      },
    ],
    sources: [
      { label: "U.S. Department of Labor: Overtime pay (Fair Labor Standards Act)", url: "https://www.dol.gov/agencies/whd/overtime" },
      { label: "GOV.UK: Rest breaks at work", url: "https://www.gov.uk/rest-breaks-work" },
    ],
    related: ["age-calculator", "percentage-calculator", "chronological-age-calculator", "loan-emi-calculator"],
    links: [
      { href: "/age-calculator/", anchor: "days between dates" },
      { href: "/online-tally-counter/", anchor: "tally counter" },
      { href: "/unix-timestamp-converter/", anchor: "Unix timestamp converter" },
    ],
    appCategory: "BusinessApplication",
    features: ["Shift rows with start, end and unpaid break", "Overnight shifts handled automatically", "Weekly totals in h:mm and decimal hours", "Optional pay at an hourly rate; CSV download"],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
];
