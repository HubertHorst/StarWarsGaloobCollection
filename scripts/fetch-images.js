// fetch-images.js — Find and upload cover images for items without cover_url
// node scripts/fetch-images.js
//
// Strategy: DuckDuckGo image search (no API key needed) → Cloudinary URL upload

const https = require('https');
const http  = require('http');
const { createClient } = require('../node_modules/@libsql/client');
const cloudinary = require('../node_modules/cloudinary').v2;

const TURSO_URL   = 'libsql://star-wars-galoob-huberthorst.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg0OTMwMTEsImlkIjoiMDE5ZTE2NzAtYjgwMS03ZWI1LWIxYjYtNjM0NmYwMzNjOWM3IiwicmlkIjoiZDllZWRjYjktNjc1Ny00MzIyLTlhM2UtYTI3ZDVjOWE3YmYxIn0.sec1zhxbktTrfc8q2aYcpAbwtrMGYuT0Wxitzl0ogWzphxPnPrfmzJ6jiIqCKFOAPA6vXkk-RjkqMtbhXjTBAA';

cloudinary.config({
  cloud_name:  'dizqnu6w8',
  api_key:     '689264983933852',
  api_secret:  'EAQa21D-tTddX3C_M7CbTFlZAGA',
});

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ── HTTP helpers ─────────────────────────────────────────────────────────────
function fetchText(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib  = url.startsWith('https') ? https : http;
    const req  = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...opts.headers,
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, opts).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ body: data, status: res.statusCode }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Bing image search (HTML scraping, no API key) ────────────────────────────
async function bingImageSearch(query) {
  const q = encodeURIComponent(query);
  try {
    const { body } = await fetchText(
      `https://www.bing.com/images/search?q=${q}&form=HDRSC2&first=1`,
      { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
    );

    // Bing embeds image data as   murl&quot;:&quot;URL&quot;
    // Try all murl matches and pick the best one (from collector sites > generic)
    const allMatches = [...body.matchAll(/murl&quot;:&quot;(https?:\/\/[^&"<>]+\.(?:jpg|jpeg|png|webp)[^&"<>]*)/ig)];
    if (allMatches.length > 0) {
      // Skip WordPress proxy URLs (i*.wp.com) — Cloudinary can't fetch those
      const filtered = allMatches.filter(m => !/\.wp\.com/i.test(m[1]));
      const pool = filtered.length > 0 ? filtered : allMatches;
      // Prefer images from known collector / toy sites
      const preferred = pool.find(m =>
        /rebelscum|stardestroyer|galootoys|rebelscale|starwarscollect|toywiz|ebay|etsy/i.test(m[1])
      );
      const raw = preferred ? preferred[1] : pool[0][1];
      return decodeURIComponent(raw.replace(/&amp;/g, '&'));
    }
  } catch { /* ignore */ }
  return null;
}

// ── Cloudinary upload from URL ────────────────────────────────────────────────
function uploadUrlToCloudinary(url) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(url, {
      folder: 'galoob-collection/covers',
      resource_type: 'image',
      fetch_format: 'auto',
      quality: 'auto',
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
  });
}

// ── Query builder ─────────────────────────────────────────────────────────────
function buildQuery(item) {
  // Strip numbered prefix like "1 –" or "12 –" or "Set X –"
  const cleanName = item.name.replace(/^(Set\s+[IVXLC\d]+\s+[-–]\s+|[\d]+\s+[-–]\s+)/i, '').trim();
  const serieKeyword = item.serie.includes('Action Fleet') ? 'Star Wars Galoob Action Fleet'
    : item.serie.includes('Micro Machines') ? 'Star Wars Galoob Micro Machines'
    : 'Star Wars Galoob';
  return `${serieKeyword} "${cleanName}" toy`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { rows } = await db.execute('SELECT id, name, serie FROM items WHERE cover_url IS NULL ORDER BY serie, name');
  console.log(`\n🔍 Items without cover image: ${rows.length}\n`);

  let success = 0, failed = 0;

  for (const item of rows) {
    const query = buildQuery(item);
    process.stdout.write(`  Searching: "${item.name}" …`);

    let imageUrl = null;
    try {
      imageUrl = await bingImageSearch(query);
    } catch (e) {
      console.log(` ❌ search error: ${e.message}`);
      failed++;
      continue;
    }

    if (!imageUrl) {
      console.log(' ❌ no result');
      failed++;
      continue;
    }

    // Upload to Cloudinary
    let coverUrl = null;
    try {
      coverUrl = await uploadUrlToCloudinary(imageUrl);
    } catch (e) {
      console.log(` ❌ upload error: ${e.message}`);
      failed++;
      continue;
    }

    // Save to DB
    await db.execute({
      sql: 'UPDATE items SET cover_url = ? WHERE id = ?',
      args: [coverUrl, item.id],
    });

    console.log(` ✅`);
    success++;

    // Be polite — don't hammer DDG
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n✅ Done — ${success} images uploaded, ${failed} failed`);
}

main().catch(console.error);
