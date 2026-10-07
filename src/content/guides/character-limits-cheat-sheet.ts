import { defineGuide, toolLink as t } from "./shared";

export const characterLimitsCheatSheet = defineGuide({
  slug: "character-limits-cheat-sheet",
  title: "Character Limits Cheat Sheet: Social Posts, SMS and SEO",
  h1: "Character limits cheat sheet",
  metaDescription:
    "Current character limits for X, Instagram, LinkedIn, Facebook, YouTube, TikTok and SMS, plus where titles and descriptions get cut off in search.",
  summary:
    "As of October 2026: an X post holds 280 weighted characters (25,000 with Premium), an Instagram caption 2,200, a Threads post 500, a LinkedIn post 3,000, a Bluesky post 300, and a YouTube title 100. One SMS holds 160 characters, or 70 if it contains an emoji. Google sets no character limit for titles or meta descriptions; it truncates them by pixel width.",
  cluster: "Content optimization",
  tools: ["character-counter", "word-counter", "serp-simulator", "title-tag-generator"],
  body: [
    {
      heading: "Social media limits",
      body: `Limits checked against each platform's own documentation in October 2026. "Units" says how the platform counts, which matters once you use emoji, accents or non-Latin scripts.

| Platform | Field | Limit | Units |
|---|---|---|---|
| X | Post | 280 (25,000 with Premium) | Weighted: links count 23, emoji and CJK characters 2 |
| Instagram | Caption | 2,200 | Characters; at most 5 hashtags per post or reel (see below) |
| Threads | Post | 500 | Characters; the API counts emoji by their UTF-8 bytes |
| LinkedIn | Post | 3,000 | Characters |
| YouTube | Video title | 100 | Characters |
| YouTube | Video description | 5,000 | Bytes in the YouTube Data API, so accented letters and emoji use more |
| TikTok | Caption via the posting API | 2,200 | UTF-16 units |
| Bluesky | Post | 300 | Graphemes (what you see as one character) |
| Facebook | Post | No published limit | Far longer than any useful post |

Notes on the less tidy entries:

- **Instagram hashtags.** In December 2025 Instagram announced it would gradually limit captions on posts and reels to five hashtags, down from 30. Meta's developer reference for publishing still lists 30 hashtags and 20 @mentions, so schedulers that post through the API may behave differently from the app for a while.
- **TikTok.** The app accepts longer captions than the API; 4,000 characters is widely reported, but TikTok's help pages don't state a figure, so we list only the documented API limit.
- **Facebook.** Meta doesn't document a post length. Long posts are cut off in the feed behind a "See more" link, so the first line or two is what most people read.

Across all of these, the visible part is much shorter than the limit. Put the point of the post in the first sentence and check the length with the ${t("character-counter", "character counter")}, which shows characters, UTF-16 units, code points and UTF-8 bytes side by side.`,
    },
    {
      heading: "Messaging and SMS",
      body: `An SMS has room for 140 bytes of text. How many characters that means depends on the alphabet:

| Encoding | When it is used | One message | Each part of a longer message |
|---|---|---|---|
| GSM 7-bit | Every character is in the GSM alphabet | 160 characters | 153 characters |
| UCS-2 (16-bit) | Any character outside it, such as an emoji or curly quote | 70 characters | 67 characters |

Long messages are split into parts that carry a small header so the phone can reassemble them, which is why the per-part figure is lower. Each part is billed as one message.

Worked example: a 120-character reminder in plain English fits in one SMS. Add one emoji and the whole message switches to UCS-2; the emoji takes two 16-bit units, so the text is now 122 units, which needs two parts (67 + 55). Paste a curly apostrophe from a word processor and the same thing happens without any emoji in sight. A few GSM characters also count double because they live in an extension table: \`^ { } [ ] ~ \\ |\` and the euro sign.

Chat apps such as WhatsApp and iMessage send data rather than SMS, so these limits don't apply to them.`,
    },
    {
      heading: "Search results: titles and descriptions",
      body: `Google publishes no character limit for the title element or the meta description. Its documentation says title links and snippets are truncated "as needed, typically to fit the device width". In practice that width is measured in pixels, and snippet preview tools use these rules of thumb:

| Element | Font used for the estimate | Approximate cut-off |
|---|---|---|
| Title, desktop | Arial 20 px | 600 px |
| Description, desktop | Arial 13 px | 920 px |
| Description, mobile | Arial 13 px | 680 px |

To translate that into characters, we measured the 208 titles and meta descriptions in our own keyword plan with Arial-compatible character widths. Titles averaged 9.5 px per character, so about **63 characters** fit in 600 px. Descriptions averaged 5.8 px per character: about **158 characters** on desktop and **117** on mobile. Capital letters change the picture: "MB TO KB CONVERTER – CONVERT MEGABYTES TO KILOBYTES ONLINE" is 58 characters but about 700 px wide, and would be cut.

The ${t("serp-simulator", "SERP simulator")} draws the result at these widths, and the ${t("title-tag-generator", "title tag generator")} measures pixels as you type. For how to write them, see [how to write title tags and meta descriptions](/blog/write-title-tags-meta-descriptions/).`,
    },
    {
      heading: "Why emoji count double",
      body: `Text is stored as Unicode code points, and different systems count those code points in different ways. Most emoji sit outside the first 65,536 code points, which is what produces the surprises:

| Counting method | Thumbs-up emoji (U+1F44D) | Family emoji (man, woman, girl joined by zero-width joiners) | Used by |
|---|---|---|---|
| UTF-16 units | 2 | 8 | JavaScript, HTML maxlength, many web forms, SMS (UCS-2) |
| Code points | 1 | 5 | Some databases and APIs |
| UTF-8 bytes | 4 | 18 | YouTube descriptions, Threads API emoji, byte-limited fields |
| Graphemes | 1 | 1 | Bluesky; what a person would count |
| X weighting | 2 | 2 | X, which counts each emoji as 2 |

So the same short text can be "under the limit" on one platform and over it on another. Skin-tone modifiers and flags behave like the family emoji: several code points that display as one symbol. Accented letters can also be stored as a base letter plus a combining mark, two code points for one visible character; X normalizes text to the composed form (Unicode NFC) before counting so that doesn't cost extra.

When a limit is tight, count the way the destination counts. The ${t("word-counter", "word counter")} handles the word-based limits, such as essay boxes, that the platforms above don't use.`,
    },
    {
      heading: "Keeping the list current",
      body: `Platform limits change, sometimes without an announcement, and API limits can differ from what the app allows. Before relying on a figure for something that matters, such as an ad, a scheduled campaign or a form with a hard cut-off:

1. Check the platform's help center or developer documentation, linked in the sources below.
2. Paste the final text into the real composer. It is the only authority on what will be accepted.
3. If you publish through a scheduling tool, check the API limit too; the TikTok caption limits above are an example of the two differing.

We review this page when a listed platform changes its documented limits and record the date at the top.`,
    },
  ],
  sources: [
    { label: "X Developer Platform: Counting characters", url: "https://docs.x.com/resources/fundamentals/counting-characters" },
    { label: "X Help Center: About X Premium (longer posts)", url: "https://help.x.com/en/using-x/x-premium" },
    { label: "Meta for Developers: Instagram IG User Media reference (caption limits)", url: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/" },
    { label: "Social Media Today: Instagram implements new limits on hashtag use (December 2025)", url: "https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/" },
    { label: "Meta for Developers: Threads API, posts (500-character limit)", url: "https://developers.facebook.com/docs/threads/posts" },
    { label: "LinkedIn Help: Post and share updates", url: "https://www.linkedin.com/help/linkedin/answer/a528176" },
    { label: "YouTube Data API: Videos resource (title and description limits)", url: "https://developers.google.com/youtube/v3/docs/videos" },
    { label: "TikTok for Developers: Content Posting API, direct post reference", url: "https://developers.tiktok.com/doc/content-posting-api-reference-direct-post" },
    { label: "Bluesky AT Protocol lexicon: app.bsky.feed.post", url: "https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/post.json" },
    { label: "3GPP TS 23.038: Alphabets and language-specific information (GSM 7-bit)", url: "https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=745" },
    { label: "Google Search Central: Influencing title links", url: "https://developers.google.com/search/docs/appearance/title-link" },
    { label: "Google Search Central: Control your snippets in search results", url: "https://developers.google.com/search/docs/appearance/snippet" },
  ],
});
