---
{
  "title": "How to Format, Validate and Fix Invalid JSON",
  "metaTitle": "JSON Formatter and Validator: How to Fix Errors",
  "metaDescription": "Use a JSON formatter and validator to find syntax errors, then fix trailing commas, wrong quotes, comments and other common mistakes with clear examples.",
  "excerpt": "What the usual JSON errors look like, how to read an error position, and why valid JSON can still be the wrong data.",
  "category": "Developer tools",
  "focusKeyword": "json formatter and validator",
  "secondaryKeywords": ["online json validator and formatter"],
  "tags": ["json", "debugging", "developers"],
  "relatedTools": ["json-viewer", "base64-encoder-decoder", "regex-tester", "unix-timestamp-converter"],
  "cover": { "headline": "Find and fix JSON errors", "motif": "code" },
  "coverAlt": "Illustration of a JSON document with a highlighted syntax error",
  "faqs": [
    { "q": "Are comments allowed in JSON?", "a": "No. Standard JSON has no comments. Some configuration formats that look like JSON allow them, so check what your program expects." },
    { "q": "Why does a large ID number change after formatting?", "a": "Many JavaScript-based tools round integers above 2^53. Store such identifiers as strings, or use a tool that keeps the digits as written." }
  ]
}
---
A JSON formatter and validator does two jobs. Validation tells you whether the text follows the JSON rules. Formatting adds indentation so you can read the structure. Most "broken JSON" problems come from a handful of habits borrowed from JavaScript.

## The common errors

| Mistake | Invalid | Valid |
| --- | --- | --- |
| Trailing comma | `{"a": 1,}` | `{"a": 1}` |
| Single quotes | `{'a': 'x'}` | `{"a": "x"}` |
| Unquoted key | `{a: 1}` | `{"a": 1}` |
| Comment | `{"a": 1 // note}` | `{"a": 1}` |
| Python or JavaScript values | `True`, `None`, `undefined`, `NaN` | `true`, `null` |

Strings must use double quotes. Inside a string, escape a double quote as `\"` and a backslash as `\\`. Line breaks must be written as `\n`.

## Read the error position

An error points to where the parser **noticed** the problem, which can be just after the real cause. If the message points at a closing bracket, look at the character before it, often an extra comma. If it points at the start of a new line, check whether the previous line is missing a comma.

## Check it step by step

1. Open the [JSON Viewer](/json-viewer/). Your data stays in the browser.
2. Paste the JSON or open a .json file.
3. If it is invalid, note the line and column and press **Go to error**.
4. Fix one problem at a time. A new error may appear further down.
5. When it is valid, use the formatted or tree view to inspect the structure.

![The JSON viewer reporting the line and column of a syntax error](/blog-images/how-to-fix-invalid-json-example.jpg "The viewer marks the position and explains what it expected.")

## Check the text really is JSON

- A response starting with `<` is probably an HTML error page. Check the request and status code.
- One JSON object per line is the JSON Lines format, not a single JSON document.
- Text wrapped in extra quotes with many backslashes may be JSON encoded twice.
- An empty response is not valid JSON.

## Valid is not the same as correct

Syntax validation cannot tell you that a required field is missing, a number should be a string or a date is wrong. Check the structure against your API's documentation or a JSON Schema. Also watch for duplicate keys: parsers may keep only one value without telling you. The JSON Viewer warns about them.

Before pasting data into any online tool, remove passwords, tokens and personal information, or confirm the tool processes it locally.
