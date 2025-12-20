/**
 * Service Worker Generator
 * Generates service-worker.js with a unique version based on build timestamp
 * Run: node scripts/generate-sw.js
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'service-worker.template.js');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'service-worker.js');
const VERSION_PATH = path.join(__dirname, '..', 'public', 'version.json');
const PACKAGE_PATH = path.join(__dirname, '..', 'package.json');

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
  const buildVersion = generateVersion();

  console.log(`[SW Generator] Generating service worker version: ${buildVersion}`);

  // Read template
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // Replace placeholder with version
  const output = template.replace(/\{\{VERSION\}\}/g, buildVersion);

  // Write service worker
  fs.writeFileSync(OUTPUT_PATH, output);

  // Read semantic version from package.json
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
  const semanticVersion = pkg.version || '1.0.0';

  // Write version.json for frontend
  const versionData = {
    version: semanticVersion,
    build: buildVersion
  };
  fs.writeFileSync(VERSION_PATH, JSON.stringify(versionData));

  console.log(`[SW Generator] Created: public/service-worker.js`);
  console.log(`[SW Generator] Created: public/version.json (v${semanticVersion})`);
  console.log(`[SW Generator] Cache name: vimtractor-${buildVersion}`);
}

generateServiceWorker();
