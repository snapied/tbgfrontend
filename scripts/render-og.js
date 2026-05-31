/* Render public/og-image.svg -> public/og-image.png at 1200x630 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'og-image.svg');
const outPath = path.join(root, 'public', 'og-image.png');
const logPath = path.join(root, 'scripts', 'render-og.log');

const log = (m) => fs.appendFileSync(logPath, m + '\n');
fs.writeFileSync(logPath, 'render-og start ' + new Date().toISOString() + '\n');

const svg = fs.readFileSync(svgPath);

async function viaSharp() {
  const sharp = require('sharp');
  await sharp(svg, { density: 200 })
    .resize(1200, 630, { fit: 'fill' })
    .png({ quality: 95 })
    .toFile(outPath);
  return 'sharp';
}

function viaRsvg() {
  execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', '-o', outPath, svgPath]);
  return 'rsvg-convert';
}

(async () => {
  try {
    const how = await viaSharp();
    const sz = fs.statSync(outPath).size;
    log('OK via ' + how + ' size=' + sz);
    console.log('OK via ' + how + ' size=' + sz);
  } catch (e1) {
    log('sharp failed: ' + (e1 && e1.message));
    try {
      const how = viaRsvg();
      const sz = fs.statSync(outPath).size;
      log('OK via ' + how + ' size=' + sz);
      console.log('OK via ' + how + ' size=' + sz);
    } catch (e2) {
      log('rsvg failed: ' + (e2 && e2.message));
      console.error('ALL FAILED');
      process.exit(1);
    }
  }
})();
