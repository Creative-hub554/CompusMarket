const sharp = require("sharp");
const fs = require("fs");

const mark = fs.readFileSync("public/champey-mark.svg");

const tileSvg = (size) => `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
  <defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0' stop-color='#0f172a'/><stop offset='1' stop-color='#1e1b4b'/>
  </linearGradient></defs>
  <rect width='${size}' height='${size}' rx='${Math.round(size * 0.22)}' fill='url(#bg)'/>
</svg>`;

const ogSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='#0f172a'/><stop offset='0.55' stop-color='#171335'/><stop offset='1' stop-color='#2e1065'/>
    </linearGradient>
    <radialGradient id='glow' cx='0.5' cy='0.5' r='0.5'>
      <stop offset='0' stop-color='#8b5cf6' stop-opacity='0.5'/><stop offset='1' stop-color='#8b5cf6' stop-opacity='0'/>
    </radialGradient>
    <linearGradient id='petal' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#818cf8'/><stop offset='0.55' stop-color='#6366f1'/><stop offset='1' stop-color='#8b5cf6'/>
    </linearGradient>
    <radialGradient id='core' cx='0.35' cy='0.35' r='0.9'>
      <stop offset='0' stop-color='#fde68a'/><stop offset='0.6' stop-color='#f0c040'/><stop offset='1' stop-color='#d4a027'/>
    </radialGradient>
  </defs>
  <rect width='1200' height='630' fill='url(#bg)'/>
  <g transform='translate(930 315)'>
    <circle r='260' fill='url(#glow)'/>
    <g transform='scale(2.6)'>
      <g transform='rotate(0)'><path d='M0 -16 C 13 -30 15 -56 0 -74 C -15 -56 -13 -30 0 -16 Z' fill='url(#petal)'/></g>
      <g transform='rotate(72)'><path d='M0 -16 C 13 -30 15 -56 0 -74 C -15 -56 -13 -30 0 -16 Z' fill='url(#petal)'/></g>
      <g transform='rotate(144)'><path d='M0 -16 C 13 -30 15 -56 0 -74 C -15 -56 -13 -30 0 -16 Z' fill='url(#petal)'/></g>
      <g transform='rotate(216)'><path d='M0 -16 C 13 -30 15 -56 0 -74 C -15 -56 -13 -30 0 -16 Z' fill='url(#petal)'/></g>
      <g transform='rotate(288)'><path d='M0 -16 C 13 -30 15 -56 0 -74 C -15 -56 -13 -30 0 -16 Z' fill='url(#petal)'/></g>
      <circle r='8.5' fill='url(#core)'/>
    </g>
  </g>
  <text x='80' y='300' font-family='Segoe UI, Arial, sans-serif' font-size='110' font-weight='700' fill='#ffffff' letter-spacing='2'>champey</text>
  <text x='84' y='360' font-family='Segoe UI, Arial, sans-serif' font-size='34' font-weight='500' fill='#a5b4fc'>Social &#183; Market &#183; Careers</text>
  <text x='84' y='540' font-family='Segoe UI, Arial, sans-serif' font-size='24' font-weight='400' fill='#64748b'>bytheo</text>
</svg>`;

(async () => {
  for (const size of [192, 512]) {
    const tile = Buffer.from(tileSvg(size));
    const markPng = await sharp(mark, { density: 300 })
      .resize(Math.round(size * 0.72))
      .png()
      .toBuffer();
    await sharp(tile)
      .composite([{ input: markPng, gravity: "center" }])
      .png()
      .toFile(`public/icon-${size}.png`);
  }
  await sharp(Buffer.from(ogSvg)).png().toFile("public/champey-og.png");
  console.log("icons + og written");
})();
