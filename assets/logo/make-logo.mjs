// Generates the app icon set from one SVG design.
// Usage: node assets/logo/make-logo.mjs   (needs Playwright + Chromium)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const assets = process.env.OUT_DIR ?? join(here, '..');

const BG = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#312E81"/><stop offset="1" stop-color="#7C3AED"/></linearGradient>`;

/** The two cards, drawn in a 1024 box centred at 512,512. `mono` = single-colour silhouette. */
function cards(mono) {
  const white = mono ? '#fff' : '#FFFFFF';
  const back = mono ? '#fff' : '#EF4444';
  const sky = mono ? '#000' : 'url(#sky)';
  const hill = mono ? '#fff' : '#4338CA';
  const hill2 = mono ? '#fff' : '#6366F1';
  const sun = mono ? '#fff' : '#FCD34D';
  const badge = mono ? '#fff' : '#22C55E';
  const glyph = mono ? '#000' : '#FFFFFF';
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#93C5FD"/><stop offset="1" stop-color="#C4B5FD"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="${mono ? 0 : 0.35}"/>
    </filter>
    <clipPath id="photo"><rect x="-170" y="-230" width="340" height="360" rx="26"/></clipPath>
  </defs>
  <!-- back card: delete -->
  <g transform="translate(410 520) rotate(-14)" filter="url(#shadow)">
    <rect x="-200" y="-260" width="400" height="520" rx="48" fill="${back}"/>
    <g stroke="${mono ? '#000' : '#fff'}" stroke-width="34" stroke-linecap="round" opacity="${mono ? 1 : 0.95}">
      <line x1="-120" y1="-180" x2="-50" y2="-110"/><line x1="-50" y1="-180" x2="-120" y2="-110"/>
    </g>
  </g>
  <!-- front card: keep -->
  <g transform="translate(600 500) rotate(10)" filter="url(#shadow)">
    <rect x="-200" y="-260" width="400" height="520" rx="48" fill="${white}"/>
    <g clip-path="url(#photo)">
      <rect x="-170" y="-230" width="340" height="360" fill="${sky}"/>
      <circle cx="80" cy="-130" r="46" fill="${sun}"/>
      <path d="M-200 130 L-80 -40 L10 60 L70 0 L200 130 Z" fill="${hill2}"/>
      <path d="M-200 130 L-110 20 L-20 130 Z" fill="${hill}"/>
    </g>
    <rect x="-170" y="160" width="220" height="26" rx="13" fill="${mono ? '#000' : '#E5E7EB'}"/>
    <rect x="-170" y="205" width="140" height="22" rx="11" fill="${mono ? '#000' : '#E5E7EB'}"/>
  </g>
  <!-- keep badge -->
  <g transform="translate(790 300)">
    <circle r="96" fill="${badge}" stroke="${mono ? 'none' : '#fff'}" stroke-width="16"/>
    <path d="M-44 2 L-12 36 L48 -30" fill="none" stroke="${glyph}" stroke-width="30"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

/** Full icon. `scale` shrinks the artwork (Android adaptive safe zone), `bg` paints the gradient. */
function svg({ bg = true, scale = 1, mono = false } = {}) {
  const t = 512 - 512 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>${BG}</defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#bg)"/>' : ''}
  ${
    mono
      ? // Monochrome icons only use alpha: draw the art as a mask so details become holes.
        `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
    <g transform="translate(${t} ${t}) scale(${scale})">${cards(true)}</g></mask>
  <rect width="1024" height="1024" fill="#fff" mask="url(#m)"/>`
      : `<g transform="translate(${t} ${t}) scale(${scale})">${cards(false)}</g>`
  }
</svg>`;
}

const outputs = [
  { file: 'icon.png', size: 1024, svg: svg({ scale: 0.96 }) },
  // Android 12+ shows the splash icon inside a circle covering ~2/3 of the image: keep it small.
  { file: 'splash-icon.png', size: 1024, svg: svg({ bg: false, scale: 0.62 }) },
  { file: 'favicon.png', size: 48, svg: svg({ scale: 1 }) },
  // Android adaptive icon: art must sit inside the central ~66% safe zone.
  { file: 'android-icon-foreground.png', size: 512, svg: svg({ bg: false, scale: 0.6 }) },
  {
    file: 'android-icon-background.png',
    size: 512,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>${BG}</defs><rect width="1024" height="1024" fill="url(#bg)"/></svg>`,
  },
  { file: 'android-icon-monochrome.png', size: 432, svg: svg({ bg: false, scale: 0.6, mono: true }) },
];

writeFileSync(join(process.env.OUT_DIR ? join(assets, 'logo') : here, 'logo.svg'), svg({ scale: 0.96 }));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
for (const o of outputs) {
  await page.setViewportSize({ width: o.size, height: o.size });
  const html = `<html><body style="margin:0;background:transparent">${o.svg.replace(
    'width="1024" height="1024"',
    `width="${o.size}" height="${o.size}"`,
  )}</body></html>`;
  await page.setContent(html);
  await page.screenshot({ path: join(assets, o.file), omitBackground: true, clip: { x: 0, y: 0, width: o.size, height: o.size } });
  console.log('wrote', o.file);
}
await browser.close();
