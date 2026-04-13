'use strict';

const fs = require('fs');
const path = require('path');

const RAW_LINKS_FILE = path.join(__dirname, 'raw-links.txt');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Read raw-links.txt
let rawContent;
try {
  rawContent = fs.readFileSync(RAW_LINKS_FILE, 'utf8');
} catch (err) {
  console.error('Error reading raw-links.txt:', err.message);
  process.exit(1);
}

// Split into non-empty lines (also handle blobs pasted as one big chunk)
const lines = rawContent.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

// Regex patterns to extract Getty image IDs
// Pattern 1: href="https://www.gettyimages.com/detail/{ID}" or href='...'
const PATTERN_DETAIL = /gettyimages\.com\/detail\/(\d{7,})/g;
// Pattern 2: items:'{ID}' or items: '{ID}'
const PATTERN_ITEMS = /items:\s*['"](\d{7,})['"]/g;
// Pattern 3: standalone large number (10+ digits) as fallback.
// NOTE: This may match non-Getty numbers (timestamps, etc.). It is only
// used when patterns 1 and 2 find nothing in the given text block.
const PATTERN_FALLBACK = /\b(\d{10,})\b/g;

function extractIdsFromText(text) {
  const found = new Set();

  let m;

  const p1 = new RegExp(PATTERN_DETAIL.source, 'g');
  while ((m = p1.exec(text)) !== null) {
    found.add(m[1]);
  }

  const p2 = new RegExp(PATTERN_ITEMS.source, 'g');
  while ((m = p2.exec(text)) !== null) {
    found.add(m[1]);
  }

  // Only use fallback if nothing found yet
  if (found.size === 0) {
    const p3 = new RegExp(PATTERN_FALLBACK.source, 'g');
    while ((m = p3.exec(text)) !== null) {
      found.add(m[1]);
    }
  }

  return found;
}

// Treat entire file as one blob plus individual lines for robustness
const allIds = new Set();
const idsFromFullBlob = extractIdsFromText(rawContent);
for (const id of idsFromFullBlob) allIds.add(id);

// Also run per-line so we get IDs even from multi-line pastes
for (const line of lines) {
  const ids = extractIdsFromText(line);
  for (const id of ids) allIds.add(id);
}

const uniqueIds = Array.from(allIds).sort();

// Read existing config.json to preserve settings and playlist
let existingConfig = {};
try {
  const existing = fs.readFileSync(CONFIG_FILE, 'utf8');
  existingConfig = JSON.parse(existing);
} catch (err) {
  // config.json may not exist yet or be invalid — start fresh
  existingConfig = {};
}

const existingImages = Array.isArray(existingConfig.images) ? existingConfig.images : [];
const existingSettings = existingConfig.settings || {
  beatSensitivity: 0.65,
  flashDuration: 0.3,
  maxConcurrent: 2
};
const existingPlaylist = Array.isArray(existingConfig.playlist) ? existingConfig.playlist : [];

// Count duplicates (IDs that were already in config.images)
const existingSet = new Set(existingImages);
const newIds = uniqueIds.filter(id => !existingSet.has(id));
const duplicates = uniqueIds.filter(id => existingSet.has(id));

const mergedImages = [...existingImages, ...newIds];

const updatedConfig = {
  images: mergedImages,
  settings: existingSettings,
  playlist: existingPlaylist
};

try {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
} catch (err) {
  console.error('Error writing config.json:', err.message);
  process.exit(1);
}

console.log('Links processed:  ' + lines.length);
console.log('Unique IDs found: ' + uniqueIds.length);
console.log('New IDs added:    ' + newIds.length);
console.log('Duplicates skipped: ' + duplicates.length);
console.log('Total images in config: ' + mergedImages.length);
console.log('config.json updated successfully.');
