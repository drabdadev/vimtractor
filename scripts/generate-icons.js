#!/usr/bin/env node
/**
 * Generate PWA icons for VimTractor
 * Run: node scripts/generate-icons.js
 * Requires: npm install canvas
 */

const fs = require('fs');
const path = require('path');

// Try to load canvas, provide instructions if not available
let createCanvas;
try {
    createCanvas = require('canvas').createCanvas;
} catch (e) {
    console.log('Canvas not installed. Install with: npm install canvas');
    console.log('Or generate icons manually from icons/icon.svg');
    process.exit(0);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background circle with gradient effect
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a1a');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();

    // Tractor emoji (using text - may not render emoji on all systems)
    ctx.font = `${size * 0.6}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚜', size/2, size/2 + size*0.05);

    return canvas;
}

// Generate all sizes
sizes.forEach(size => {
    const canvas = generateIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`Generated: icon-${size}.png`);
});

console.log('Done! Icons saved to icons/ directory');
