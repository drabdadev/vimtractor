/**
 * Service Worker Generator
 * Generates service-worker.js with a unique version based on build timestamp
 * Run: node scripts/generate-sw.js
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'service-worker.template.js');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'service-worker.js');

// Generate version: YYYYMMDDHHmmss
function generateVersion() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

function generateServiceWorker() {
  const version = generateVersion();

  console.log(`[SW Generator] Generating service worker version: ${version}`);

  // Read template
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // Replace placeholder with version
  const output = template.replace(/\{\{VERSION\}\}/g, version);

  // Write output
  fs.writeFileSync(OUTPUT_PATH, output);

  console.log(`[SW Generator] Created: public/service-worker.js`);
  console.log(`[SW Generator] Cache name: vimtractor-${version}`);
}

generateServiceWorker();
