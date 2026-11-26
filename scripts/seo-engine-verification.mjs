/* Output-level checks of existing processing engines; no browser/server or private inputs. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

// Load repository TypeScript without tsx's Windows user-profile dependency.
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, file);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.resolve('src', name.slice(2)) : name, ...args);
};
const dates = require('../src/tools/lib/calc/dates.ts');
const target = require('../src/tools/lib/image/target.ts');
const qr = require('../src/tools/lib/calc/qr.ts');
const json = require('../src/tools/lib/dev/json.ts');
const enc = require('../src/tools/lib/dev/encode.ts');
const binary = require('../src/tools/lib/dev/binary-text.ts');
const money = require('../src/tools/lib/calc/money.ts');
const pdf = require('../src/tools/lib/pdf/core.ts');
const { optimizePdf } = require('../src/tools/lib/pdf/compress.ts');
const checks = [];
async function check(area, name, run) {
  try { const detail = await run(); checks.push({ area, name, status: 'PASS', detail: detail || '' }); }
  catch (e) { checks.push({ area, name, status: 'FAIL', detail: e.message }); }
}
const date = (s) => { const v = dates.parseISODate(s); assert.ok(v, s); return v; };

async function main() {
  await check('Age', 'Leap-year parsing and invalid dates', () => {
    assert.ok(date('2000-02-29')); assert.equal(dates.parseISODate('1900-02-29'), null);
    assert.equal(dates.parseISODate('2026-02-29'), null); assert.equal(dates.parseISODate('2026-04-31'), null);
  });
  await check('Age', 'Same-day, leap-day anniversary and month end', () => {
    assert.deepEqual(dates.diffCalendar(date('2024-02-29'), date('2024-02-29')), { years: 0, months: 0, days: 0, totalMonths: 0 });
    assert.deepEqual(dates.diffCalendar(date('2024-02-29'), date('2025-02-28')), { years: 1, months: 0, days: 0, totalMonths: 12 });
    assert.deepEqual(dates.diffCalendar(date('2026-01-31'), date('2026-03-01')), { years: 0, months: 1, days: 1, totalMonths: 1 });
  });
  await check('Age', 'Leap-day totals, birthday and future-DOB comparison', () => {
    assert.equal(dates.totals(date('2024-02-28'), date('2024-03-01')).days, 2);
    assert.deepEqual(dates.nextBirthday(date('2000-02-29'), date('2026-02-27')).date, date('2026-02-28'));
    assert.equal(dates.nextBirthday(date('2000-02-29'), date('2026-02-28')).daysUntil, 0);
    assert.ok(dates.compare(date('2027-01-01'), date('2026-01-01')) > 0);
  });
  await check('Age', 'Early-year parser range consistency', () => {
    // Parser accepts four-digit years, even though the UI minimum is 1000.
    assert.ok(dates.parseISODate('0004-02-29'));
    assert.equal(dates.parseISODate('0000-01-01'), null);
  });
  await check('Calculators', 'Percentage and reverse-percentage edge cases', () => {
    assert.equal(money.percentOf(12.5, 200), 25); assert.equal(money.whatPercent(25, 200), 12.5);
    assert.ok(Number.isNaN(money.whatPercent(1, 0))); assert.equal(money.reversePercent(120, 20), 100);
    assert.ok(Number.isNaN(money.reversePercent(10, -100)));
  });
  await check('Calculators', 'Discount, inclusive tax and zero-interest loan', () => {
    assert.equal(money.stackedDiscount(100, [20, 10]).final, 72);
    assert.equal(money.removeTax(120, 20).net, 100); assert.equal(money.emi(1200, 0, 12), 100);
  });
  await check('Image target', 'Decimal/binary byte units and physical dimensions', () => {
    assert.equal(target.targetBytes(20, 'KB', 1000), 20000); assert.equal(target.targetBytes(1, 'MB', 1024), 1048576);
    assert.equal(target.toPixels(25.4, 'mm', 300), 300);
    assert.deepEqual(target.resizeDims(1200, 800, { mode: 'pixels', width: 600, height: 600, lock: true, percent: 100, longest: null }), { w: 600, h: 400 });
  });
  await check('Image target', 'Impossible JPEG target reports failure without resizing', async () => {
    const r = await target.searchTarget({ width: 100, height: 50, targetBytes: 1, allowResize: false, encode: async () => ({ size: 100 }) });
    assert.equal(r.ok, false); assert.equal(r.result.size, 100); assert.equal(r.w, 100); assert.equal(r.h, 50);
  });
  await check('Image target', 'PNG palette search reports an unmet target honestly', async () => {
    const r = await target.searchPngTarget({ width: 100, height: 50, targetBytes: 1, allowResize: false, encode: async (w, h, colors) => ({ size: colors || 1000 }) });
    assert.equal(r.ok, false); assert.equal(r.colors, 16); assert.equal(r.result.size, 16);
  });
  await check('Image target', 'Cancellation interrupts encoding', async () => {
    await assert.rejects(target.searchTarget({ width: 100, height: 100, targetBytes: 1000, allowResize: true, cancelled: () => true, encode: async () => ({ size: 2 }) }), target.Cancelled);
  });
  const canvas = require('@napi-rs/canvas');
  await check('Image target', 'Actual JPEG fixture reaches 5 KB with aspect ratio', async () => {
    const source = canvas.createCanvas(640, 480), ctx = source.getContext('2d');
    const pixels = ctx.createImageData(640, 480);
    for (let i = 0; i < pixels.data.length; i += 4) { const n = (i * 2654435761) >>> 0; pixels.data[i] = n & 255; pixels.data[i + 1] = (n >>> 8) & 255; pixels.data[i + 2] = (n >>> 16) & 255; pixels.data[i + 3] = 255; }
    ctx.putImageData(pixels, 0, 0);
    const r = await target.searchTarget({ width: 640, height: 480, targetBytes: 5000, allowResize: true,
      encode: async (w, h, quality) => { const c = canvas.createCanvas(w, h); c.getContext('2d').drawImage(source, 0, 0, w, h); const bytes = c.toBuffer('image/jpeg', Math.round(quality * 100)); return { size: bytes.length, bytes }; } });
    assert.equal(r.ok, true); assert.ok(r.result.size <= 5000); assert.ok(Math.abs(r.w / r.h - 4 / 3) < .04);
    const decoded = await canvas.loadImage(r.result.bytes); assert.equal(decoded.width, r.w); assert.equal(decoded.height, r.h);
    return `${r.result.size} bytes; ${r.w} x ${r.h}; native canvas JPEG codec, not browser codec`;
  });
  await check('JSON', 'Exact large integer, Unicode and exponent formatting', () => {
    const raw = '{"n":12345678901234567890,"text":"é 中文","tiny":1.20e-40}';
    const r = json.parseJson(raw); assert.equal(r.ok, true);
    assert.equal(json.stringifyNode(r.node, { indent: '' }), raw);
    assert.equal(json.toValue(r.node).n, '12345678901234567890');
  });
  await check('JSON', 'Invalid JSON gets line/column, duplicates are reported', () => {
    for (const raw of ['{"a":1,}', '[01]', '// comment\n{}', '{"a":NaN}', '{"a":"\n"}']) assert.equal(json.parseJson(raw).ok, false, raw);
    const bad = json.parseJson('{\n"a":1,\n}'); assert.equal(bad.ok, false); assert.ok(bad.error.line >= 2);
    assert.deepEqual(json.parseJson('{"a":1,"a":2}').duplicates, ['a']);
  });
  await check('JSON', 'Special keys preserve own properties without prototype changes', () => {
    const r = json.parseJson('{"__proto__":{"polluted":true},"constructor":1}');
    const value = json.toValue(r.node); assert.equal(Object.hasOwn(value, '__proto__'), true);
    assert.equal(value.polluted, undefined); assert.equal(value.constructor, 1);
  });
  await check('Encoding', 'Unicode Base64 round trip, URL-safe variant and invalid input', () => {
    const input = new TextEncoder().encode('Hello é 中文 😀');
    assert.deepEqual(enc.base64Decode(enc.base64Encode(input)).bytes, input);
    assert.deepEqual(enc.base64Decode(enc.base64Encode(input, { urlSafe: true })).bytes, input);
    assert.ok(enc.base64Decode('a').error); assert.ok(enc.base64Decode('***').error);
  });
  await check('Encoding', 'UTF-8 binary round trip and ASCII rejection', () => {
    const r = binary.encodeText('Hello é 中文 😀', { encoding: 'utf8', bits: 8, sep: 'space' });
    assert.equal(binary.decodeBinary(r.output, { bits: 'auto', charset: 'utf8' }).text, 'Hello é 中文 😀');
    assert.ok(binary.encodeText('é', { encoding: 'ascii', bits: 7, sep: 'space' }).error);
  });
  const payloads = [qr.urlPayload('example.com'), 'Hello é 中文 😀', qr.wifiPayload({ ssid: 'Cafe;Guest', password: 'a:b\\c', security: 'WPA', hidden: true }), qr.emailPayload({ to: 'test@example.com', subject: 'A & B', body: 'Line one\nLine two' }), qr.phonePayload('+1 (202) 555-0123'), qr.vcardPayload({ first: 'Ada', last: 'Lovelace', org: 'Example; Org', title: 'Engineer', phone: '+12025550123', email: 'ada@example.com', url: 'https://example.com' })];
  await check('QR', 'Escaping, units and static payloads', () => {
    assert.equal(payloads[0], 'https://example.com'); assert.ok(payloads[2].includes('S:Cafe\\;Guest'));
    assert.ok(payloads[2].includes('P:a\\:b\\\\c')); assert.ok(payloads[3].includes('subject=A%20%26%20B'));
    assert.equal(payloads[4], 'tel:+12025550123'); assert.ok(payloads[5].includes('ORG:Example\\; Org'));
    assert.equal(qr.contrastRatio('#000000', '#ffffff'), 21);
  });
  await check('QR', 'Six real codes decode through independent OpenCV scanner', () => {
    const qrcode = require('qrcode-generator'); qrcode.stringToBytes = (s) => [...new TextEncoder().encode(s)];
    const images = payloads.map((payload) => {
      const q = qrcode(0, 'M'); q.addData(payload, 'Byte'); q.make(); const size = q.getModuleCount(), margin = 4, scale = 10;
      const c = canvas.createCanvas((size + margin * 2) * scale, (size + margin * 2) * scale), x = c.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000000';
      for (let r = 0; r < size; r++) for (let col = 0; col < size; col++) if (q.isDark(r, col)) x.fillRect((col + margin) * scale, (r + margin) * scale, scale, scale);
      const svg = qr.matrixToSvg({ size, dark: (r, col) => q.isDark(r, col) }, { margin, fg: '#000000', bg: '#ffffff', px: c.width });
      assert.ok(svg.includes(`viewBox="0 0 ${size + 8} ${size + 8}"`));
      return c.toBuffer('image/png').toString('base64');
    });
    const py = 'import sys,json,base64,cv2,numpy as np\nimages=json.load(sys.stdin)\nout=[]\nfor item in images:\n a=cv2.imdecode(np.frombuffer(base64.b64decode(item),dtype=np.uint8),cv2.IMREAD_COLOR)\n out.append(cv2.QRCodeDetector().detectAndDecode(a)[0])\nprint(json.dumps(out,ensure_ascii=False))';
    const p = spawnSync('python', ['-c', py], { input: JSON.stringify(images), encoding: 'utf8', timeout: 30000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    assert.equal(p.status, 0, p.stderr); assert.deepEqual(JSON.parse(p.stdout), payloads);
    return 'URL, Unicode text, escaped Wi-Fi, email, phone, vCard; default black/white, M correction, four-module margin';
  });
  await check('QR', 'Codes with the largest allowed logo still decode', () => {
    const qrcode = require('qrcode-generator'); qrcode.stringToBytes = (s) => [...new TextEncoder().encode(s)];
    // Short to long payloads, so several QR versions (including ones with a central alignment pattern) are covered.
    const inputs = [...payloads, 'https://example.com/a', `https://example.com/${'path-segment/'.repeat(6)}`, `https://example.com/${'path-segment/'.repeat(14)}`];
    const images = [];
    const expected = [];
    for (const payload of inputs) for (const aspect of [1, 2.5]) {
      const q = qrcode(0, 'H'); q.addData(payload, 'Byte'); q.make(); const size = q.getModuleCount(), margin = 4, scale = 10;
      const c = canvas.createCanvas((size + margin * 2) * scale, (size + margin * 2) * scale), x = c.getContext('2d');
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000000';
      for (let r = 0; r < size; r++) for (let col = 0; col < size; col++) if (q.isDark(r, col)) x.fillRect((col + margin) * scale, (r + margin) * scale, scale, scale);
      const { image: i, plate: p } = qr.logoLayout(size, margin, { aspect, percent: 99 });
      x.fillStyle = '#ffffff'; x.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
      x.fillStyle = '#c2185b'; x.fillRect(i.x * scale, i.y * scale, i.w * scale, i.h * scale); // worst case: a solid, opaque logo
      images.push(c.toBuffer('image/png').toString('base64')); expected.push(payload);
    }
    const py = 'import sys,json,base64,cv2,numpy as np\nimages=json.load(sys.stdin)\nout=[]\nfor item in images:\n a=cv2.imdecode(np.frombuffer(base64.b64decode(item),dtype=np.uint8),cv2.IMREAD_COLOR)\n out.append(cv2.QRCodeDetector().detectAndDecode(a)[0])\nprint(json.dumps(out,ensure_ascii=False))';
    const p = spawnSync('python', ['-c', py], { input: JSON.stringify(images), encoding: 'utf8', timeout: 60000, maxBuffer: 20e6, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    assert.equal(p.status, 0, p.stderr);
    const got = JSON.parse(p.stdout);
    const failed = expected.map((e, n) => (got[n] === e ? null : `#${n} (${e.length} chars)`)).filter(Boolean);
    assert.equal(failed.length, 0, `${failed.length}/${expected.length} did not decode: ${failed.join(', ')}`);
    assert.ok(qr.matrixToSvg({ size: 21, dark: () => false }, { margin: 4, fg: '#000000', bg: '#ffffff', px: 100, logo: { href: 'data:image/png;base64,AA==', aspect: 1, percent: 18 } }).includes('<image '));
    return `${expected.length}/${expected.length} decoded with level H and a solid logo at the 22% cap (square and wide)`;
  });
  const { PDFDocument, StandardFonts, PDFName } = require('pdf-lib');
  const src = await PDFDocument.create(); const font = await src.embedFont(StandardFonts.Helvetica);
  for (const text of ['First fixture page', 'Second fixture page']) src.addPage([300, 400]).drawText(text, { x: 20, y: 350, size: 14, font });
  const sourceBytes = await src.save({ useObjectStreams: false });
  await check('PDF', 'Actual PDF open, page selection, merge and reopen', async () => {
    const input = await pdf.openForEdit(sourceBytes, 'fixture.pdf'); const out = await PDFDocument.create();
    const ranges = pdf.parseRanges('2,1', input.getPageCount()); assert.equal(ranges.error, undefined);
    const pages = await out.copyPages(input, ranges.groups.flat()); pages.forEach((p) => out.addPage(p));
    const reopened = await pdf.openForEdit(await out.save(), 'merged.pdf'); assert.equal(reopened.getPageCount(), 2);
    assert.equal(reopened.getPage(0).getWidth(), 300); assert.equal(reopened.getPage(0).getHeight(), 400);
    assert.ok(pdf.parseRanges('3', 2).error);
  });
  await check('PDF', 'Optimizer preserves pages and selectable text content', async () => {
    const result = await optimizePdf(sourceBytes, 'fixture.pdf');
    const reopened = await pdf.openForEdit(result.bytes, 'optimized.pdf'); assert.equal(reopened.getPageCount(), 2);
    const lib = require('pdf-lib'); const page = reopened.getPage(0), contents = page.node.Contents();
    const streams = contents instanceof lib.PDFArray ? contents.asArray().map((ref) => reopened.context.lookup(ref)) : [contents];
    const text = streams.map((stream) => Buffer.from(lib.decodePDFRawStream(stream).decode()).toString('latin1')).join('\n');
    assert.ok(text.includes(Buffer.from('First fixture page').toString('hex').toUpperCase()));
    return `${sourceBytes.length} -> ${result.bytes.length} bytes; page text operator retained`;
  });
  await check('PDF', 'Empty, non-PDF and damaged files rejected', async () => {
    await assert.rejects(pdf.openForEdit(new Uint8Array(), 'empty.pdf'), (e) => e.code === 'EMPTY');
    await assert.rejects(pdf.openForEdit(new TextEncoder().encode('not a pdf'), 'fake.pdf'), (e) => e.code === 'NOT_PDF');
    await assert.rejects(pdf.openForEdit(new TextEncoder().encode('%PDF-1.7\ncorrupt'), 'broken.pdf'), (e) => e.code === 'CORRUPT');
  });
  await check('PDF', 'Password-protected document rejected', async () => {
    // A real PDF trailer encryption entry is sufficient for pdf-lib's encrypted-document guard.
    const encrypted = await PDFDocument.load(sourceBytes); encrypted.context.trailerInfo.Encrypt = encrypted.context.register(encrypted.context.obj({ Filter: PDFName.of('Standard'), V: 1, R: 2 }));
    await assert.rejects(pdf.openForEdit(await encrypted.save({ useObjectStreams: false }), 'encrypted.pdf'), (e) => e.code === 'ENCRYPTED');
  });
  const passed = checks.filter((c) => c.status === 'PASS').length;
  fs.mkdirSync('seo', { recursive: true });
  fs.writeFileSync('seo/functionality-results.json', JSON.stringify({ checkedAt: new Date().toISOString(), runtime: process.version, passed, failed: checks.length - passed, checks }, null, 2) + '\n');
  const escape = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 500);
  const report = `# Processing-engine verification\n\nRun date: ${new Date().toISOString().slice(0, 10)}. Reproduce: \`node scripts/seo-engine-verification.mjs\`.\n\nResult: **${passed}/${checks.length} checks passed**; ${checks.length - passed} failed. Raw results: [functionality-results.json](functionality-results.json). Tests use synthetic, nonprivate inputs and do not call production APIs.\n\n| Area | Check | Result | Evidence / failure |\n| --- | --- | --- | --- |\n${checks.map((c) => `| ${escape(c.area)} | ${escape(c.name)} | ${c.status} | ${escape(c.detail)} |`).join('\n')}\n\n## Scope and limits\n\nThese are output-level engine checks, not proof that every registry configuration works in every browser. They cover the shared age/chronological-age date engine, percentage/discount/tax/EMI formulas, image byte target and resize helpers, JSON parsing/formatting/view conversion, Base64, UTF-8 binary conversion, static QR payload/encoding/rendering helpers (including the center logo), PDF opening/page ranges/merge primitives and text-preserving PDF optimization. Each area maps to multiple registry routes, but it is not counted as multiple independently tested tools.

The real JPEG test injects the installed native canvas codec into the actual search algorithm; browser JPEG/WebP/PNG output bytes can differ. PNG target logic uses controlled encoders here. QR outputs are decoded with Python OpenCV at safe defaults and with a solid logo at the size cap; this does not establish every color, print, damage, phone camera or scanner app. The encrypted fixture tests the library's encryption guard and does not claim password removal.

Real-browser output checks for the priority and new tools, phone-width layout and automated accessibility checks are in [browser-test-results.json](browser-test-results.json) (\`node scripts/seo-tool-e2e.mjs <server>\`). HEIC conversion, EXIF orientation, other browsers, physical devices and real-user Core Web Vitals are not covered by either script.
`;
  fs.writeFileSync('seo/functionality-verification.md', report);
  console.log(`${passed}/${checks.length} checks passed`);
  for (const c of checks.filter((c) => c.status === 'FAIL')) console.log(`FAIL ${c.area}: ${c.name}: ${c.detail}`);
  if (passed !== checks.length) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
