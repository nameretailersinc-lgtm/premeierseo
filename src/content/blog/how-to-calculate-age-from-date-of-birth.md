---
{
  "title": "How to Calculate Age From a Date of Birth (With Examples)",
  "metaTitle": "How to Calculate Age From Date of Birth by Hand",
  "metaDescription": "Calculate age using date of birth by hand: count full years, then months and days, handle leap-day birthdays and month ends, and avoid common date mistakes.",
  "excerpt": "The method behind an exact age in years, months and days, including the awkward cases that make two calculators disagree.",
  "category": "Calculators",
  "focusKeyword": "calculate age using date of birth",
  "secondaryKeywords": ["work out age from dob", "count age from date of birth"],
  "tags": ["age", "dates", "leap year"],
  "relatedTools": ["age-calculator", "chronological-age-calculator", "hours-calculator", "percentage-calculator"],
  "cover": { "headline": "Age from a date of birth", "motif": "calendar" },
  "coverAlt": "Illustration of a calendar used to work out an age from a date of birth",
  "faqs": [
    { "q": "When is a 29 February birthday in a normal year?", "a": "Rules differ. Some treat 28 February as the birthday and others 1 March. For legal purposes, use the rule that applies where you are. The age calculator on this site uses 28 February." },
    { "q": "Why do two calculators give different days?", "a": "Months have different lengths, so there is more than one way to count the leftover months and days. The full years should agree; compare how each handles month ends." }
  ]
}
---
To calculate age using date of birth, count the full years first, then the full months after the last birthday, then the remaining days. The age on a form is usually just the full years.

## Find the age in completed years

1. Subtract the birth year from the year of the date you are measuring on.
2. If the birthday has not happened yet in that year, subtract 1.

**Example:** born 15 August 2000, measured on 26 November 2026. 2026 − 2000 = 26. The August birthday has passed, so the age is **26**.

Measured on 1 March 2026 instead, 2026 − 2000 = 26, but the birthday has not happened yet, so the age is **25**.

## Add months and days

Start from the most recent birthday and count whole months until the next one would pass your date. Then count the days left over.

For 15 August 2000 to 26 November 2026:

- Most recent birthday: 15 August 2026.
- Whole months: 15 September, 15 October, 15 November, which is 3.
- Days from 15 November to 26 November: 11.

The exact age is **26 years, 3 months and 11 days**.

![The age calculator showing an age in years, months and days with totals](/blog-images/how-to-calculate-age-from-date-of-birth-example.jpg "A calculator also gives totals in months, weeks and days, which are tedious to count by hand.")

## Month ends need a rule

What is one month after 31 January? February has no 31st. One common approach, used by the [Age Calculator](/age-calculator/), treats the last day of the shorter month as the anniversary. Another approach "borrows" a fixed 30 days. Some test manuals require that second method; the [chronological age calculator](/chronological-age-calculator/) is meant for those cases. Use the method your form or manual asks for.

## Leap years

A year is a leap year if it divides by 4, except for century years, which must divide by 400. So 2000 and 2024 are leap years, while 1900 and 2100 are not. Counting total days lived has to include each 29 February in the period.

## Spreadsheet shortcut

In Excel and Google Sheets, `DATEDIF(birth, date, "Y")` returns completed years. For example, with the birth date in A2:

`=DATEDIF(A2, TODAY(), "Y")`

Do not divide the number of days by 365. Leap days make that drift, and it can report the wrong age close to a birthday.

## Common mistakes

- Subtracting years without checking whether the birthday has passed.
- Mixing day-month and month-day date formats. Write the month as a word when sharing dates internationally.
- Using today's date when a form asks for age on a specific cut-off date.

For eligibility, school entry or legal questions, check the official rule, including how it treats the birthday itself.
