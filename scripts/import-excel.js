// Excel Import Script v2 — strict series-only matching, deduplication
// node scripts/import-excel.js

const xlsx = require('../node_modules/xlsx');
const { createClient } = require('../node_modules/@libsql/client');
const { randomUUID } = require('crypto');

const XLSX_PATH  = 'C:/Users/User/Desktop/Galoob Liste.xlsx';
const TURSO_URL  = 'libsql://star-wars-galoob-huberthorst.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg0OTMwMTEsImlkIjoiMDE5ZTE2NzAtYjgwMS03ZWI1LWIxYjYtNjM0NmYwMzNjOWM3IiwicmlkIjoiZDllZWRjYjktNjc1Ny00MzIyLTlhM2UtYTI3ZDVjOWE3YmYxIn0.sec1zhxbktTrfc8q2aYcpAbwtrMGYuT0Wxitzl0ogWzphxPnPrfmzJ6jiIqCKFOAPA6vXkk-RjkqMtbhXjTBAA';

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const DEFAULT_WERT = {
  'Action Fleet : Classic Vessel': '50',         'Action Fleet : Alpha Series': '80',
  'Action Fleet : Transforming Playsets': '100',  'Action Fleet : Sonderserie': '70',
  'Action Fleet : Battle Packs': '30',            'Hasbro Saga Action Fleet 2002 : Vessel': '25',
  'Hasbro Saga Action Fleet 2002 : Battle Packs': '15', 'Micro Machines : Playsets': '60',
  'Micro Machines : Transforming Action Sets': '70',    'Micro Machines : Mini Heads': '25',
  'Micro Machines : Gift Sets': '35',             'Micro Machines : Original 3 Pack': '25',
  'Micro Machines : Mini Figures': '30',          'Micro Machines : Original 3 Pack Filme': '25',
};

const CATEGORY_MAP = {
  'classic action fleet':                     'Action Fleet : Classic Vessel',
  'alpha series':                             'Action Fleet : Alpha Series',
  'transforming playsets':                    'Action Fleet : Transforming Playsets',
  'miscellaneous':                            'Action Fleet : Sonderserie',
  'battle packs':                             'Action Fleet : Battle Packs',
  'hasbro saga action fleet 2002':            'Hasbro Saga Action Fleet 2002 : Vessel',
  'packs':                                    'Hasbro Saga Action Fleet 2002 : Battle Packs',
  'star wars micro machines playsets':        'Micro Machines : Playsets',
  'transforming action sets':                 'Micro Machines : Transforming Action Sets',
  'original 3 pack filme':                    'Micro Machines : Original 3 Pack Filme',
  'original 3 pack':                          'Micro Machines : Original 3 Pack',
  'star wars micro machines x-ray':           'Micro Machines : X-Ray',
  'star wars micro machines di cast metal':   'Micro Machines : Die Cast',
  'epic collections':                         'Micro Machines : Epic Collections',
  'star wars micro machines figure sets':     'Micro Machines : Mini Figures',
  'gift sets':                                'Micro Machines : Gift Sets',
  'star wars micro machines mini heads':      'Micro Machines : Mini Heads',
};

// Section headers that should be skipped entirely
const SKIP_ROWS = new Set([
  'star wars micro mini figures',
  'titel', 'title', 'vessel', 'figurren', 'figures', 'name',
]);

// ── Excel parser ────────────────────────────────────────────────────────────
function parseVal(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function isPresent(v) {
  const s = parseVal(v);
  return s !== null && s.toLowerCase() !== 'null';
}

function parseExcel() {
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  const items = [];
  let series = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const c0 = row[0];
    const c0str = String(c0 ?? '').trim();
    const c0low = c0str.toLowerCase();

    // Category mapping
    if (CATEGORY_MAP[c0low]) { series = CATEGORY_MAP[c0low]; continue; }

    // Skip section dividers / column headers
    if (SKIP_ROWS.has(c0low)) continue;

    // Skip column-definition rows like ["Vessel","Figures","Year"]
    // Detect: short row (≤4 cols) where one element equals "Year" or "Jahr"
    const shortRow = row.filter(x => x !== null && x !== undefined && String(x).trim() !== '');
    if (shortRow.length <= 4 && shortRow.some(x => ['year','jahr','figures','contents'].includes(String(x).toLowerCase().trim()))) continue;

    if (!series) continue;

    // Build name
    // vehicleStr ONLY for numbered sets (row[0] is a number) — NOT for named items,
    // because row[1] for named items is the figure list, not a vehicle description.
    let name, vehicleStr = null;
    if (typeof c0 === 'number') {
      vehicleStr = parseVal(row[1]);
      name = vehicleStr ? `${c0str} – ${vehicleStr}` : c0str;
    } else {
      name = c0str;
    }
    if (!name) continue;

    const inSammlung        = isPresent(row[3]) ? 1 : 0;
    const lieferungAusstehend = isPresent(row[5]) ? 1 : 0;
    const kaufpreis         = parseVal(row[9]);
    let   wert              = parseVal(row[12]);
    if (wert && wert.trim() === '') wert = null;
    const jahr = (row[2] && typeof row[2] === 'number') ? Number(row[2]) : null;

    items.push({ name, series, inSammlung, lieferungAusstehend, kaufpreis, wert, jahr, vehicleStr });
  }
  return items;
}

// ── Matching ────────────────────────────────────────────────────────────────
const STOP = new Set([
  'the','a','an','and','or','of','in','with','from','to','for','at','by','on',
  'featuring','series','classic','set','star','wars','action','fleet','micro',
  'machines','concept','design','prototype','battle','pack','packs',
]);

function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/[""''`""'']/g, '')
    .replace(/\bat-at\b/g, 'atat')
    .replace(/\bat-st\b/g, 'atst')
    .replace(/\bat-ap\b/g, 'atap')
    .replace(/\bx-wing\b/g, 'xwing')
    .replace(/\by-wing\b/g, 'ywing')
    .replace(/\ba-wing\b/g, 'awing')
    .replace(/\bb-wing\b/g, 'bwing')
    .replace(/\be-wing\b/g, 'ewing')
    .replace(/\bv-wing\b/g, 'vwing')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokens(s) {
  return normalize(s).split(' ').filter(t => t.length >= 2 && !STOP.has(t));
}
function jaccard(a, b) {
  const sa = new Set(a), sb = new Set(b);
  const inter = [...sa].filter(t => sb.has(t)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

/**
 * Coverage score: fraction of long (≥5 char) Excel tokens that appear in DB tokens.
 * Only activates when Excel has at least one long token.
 */
function coverageScore(excelToks, dbTokSet) {
  const longToks = excelToks.filter(t => t.length >= 5);
  if (longToks.length === 0) return 0;
  const hits = longToks.filter(t => dbTokSet.has(t)).length;
  return hits / longToks.length;
}

function score(excelItem, dbItem) {
  const eToks = tokens(excelItem.name);
  const dToks = tokens(dbItem.name);
  const dTokSet = new Set(dToks);

  let s = jaccard(eToks, dToks);

  // Coverage boost from Excel long tokens
  s = Math.max(s, coverageScore(eToks, dTokSet) * 0.8);

  // Coverage boost from vehicle string (for numbered sets)
  if (excelItem.vehicleStr) {
    const vToks = tokens(excelItem.vehicleStr);
    s = Math.max(s, jaccard(vToks, dToks));
    s = Math.max(s, coverageScore(vToks, dTokSet) * 0.8);
  }

  // Substring match bonus — proportional to how much of the longer string is covered
  const eNorm = normalize(excelItem.name);
  const dNorm = normalize(dbItem.name);
  if (eNorm === dNorm) {
    s = 1.0;
  } else if (dNorm.includes(eNorm) || eNorm.includes(dNorm)) {
    const shorter = eNorm.length <= dNorm.length ? eNorm : dNorm;
    const longer  = eNorm.length <= dNorm.length ? dNorm : eNorm;
    const proportional = Math.min((2 * shorter.length) / longer.length, 0.85);
    s = Math.max(s, proportional);
  }

  return s;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const excelItems = parseExcel();
  console.log(`\n📋 Excel items: ${excelItems.length}`);

  const { rows: dbRows } = await db.execute('SELECT id, name, serie FROM items');
  console.log(`🗄️  DB items:    ${dbRows.length}\n`);

  // Series that exist in DB (items can only be matched if their series exists)
  const dbSeries = new Set(dbRows.map(r => r.serie));

  // Build all candidate matches (Excel → DB), series-strictly
  const candidates = [];
  for (const ei of excelItems) {
    if (!dbSeries.has(ei.series)) continue; // This series has no DB items → all inserts
    const sameSeries = dbRows.filter(d => d.serie === ei.series);
    for (const db of sameSeries) {
      const s = score(ei, db);
      if (s >= 0.35) candidates.push({ excelItem: ei, dbItem: db, score: s });
    }
  }

  // Greedy deduplication: sort by score desc, assign each DB item to best Excel match
  candidates.sort((a, b) => b.score - a.score);
  const usedDb    = new Set();
  const usedExcel = new Set();
  const toUpdate  = [];

  for (const c of candidates) {
    const eKey = `${c.excelItem.series}::${c.excelItem.name}`;
    if (usedDb.has(c.dbItem.id) || usedExcel.has(eKey)) continue;
    usedDb.add(c.dbItem.id);
    usedExcel.add(eKey);
    toUpdate.push(c);
  }

  // Items not matched → potential inserts
  const toInsert = [], skipped = [];
  for (const ei of excelItems) {
    const eKey = `${ei.series}::${ei.name}`;
    if (usedExcel.has(eKey)) continue;
    if (ei.inSammlung === 0 || ei.lieferungAusstehend === 1) toInsert.push(ei);
    else skipped.push(ei);
  }

  console.log(`✅ Updates: ${toUpdate.length}  ➕ Inserts: ${toInsert.length}  ⏭️  Skip: ${skipped.length}`);

  // ── UPDATES ──
  console.log('\n=== UPDATES ===');
  for (const { excelItem: ei, dbItem, score: sc } of toUpdate) {
    const f = [], a = [];
    if (ei.kaufpreis !== null) { f.push('kaufpreis = ?'); a.push(ei.kaufpreis); }
    if (ei.wert      !== null) { f.push('wert = ?');      a.push(ei.wert);      }
    f.push('in_sammlung = ?');          a.push(ei.inSammlung);
    f.push('lieferung_ausstehend = ?'); a.push(ei.lieferungAusstehend);
    a.push(dbItem.id);
    await db.execute({ sql: `UPDATE items SET ${f.join(', ')} WHERE id = ?`, args: a });
    console.log(`  [${sc.toFixed(2)}] "${dbItem.name}"\n         ← "${ei.name}"`);
  }

  // ── INSERTS ──
  console.log('\n=== INSERTS ===');
  for (const ei of toInsert) {
    const id   = randomUUID();
    const wert = ei.wert || DEFAULT_WERT[ei.series] || null;
    await db.execute({
      sql: `INSERT INTO items (id, name, serie, jahr, zustand, wert, kaufpreis, in_sammlung, lieferung_ausstehend)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, ei.name, ei.series, ei.jahr, 'Box Neuwertig', wert, ei.kaufpreis, ei.inSammlung, ei.lieferungAusstehend],
    });
    const flag = ei.inSammlung === 0 ? '❌ fehlt' : '🚚 ausstehend';
    console.log(`  + ${flag}  "${ei.name}"  [${ei.series}]`);
  }

  if (skipped.length) {
    console.log('\n=== SKIPPED (in collection, no DB match found — names may differ) ===');
    for (const ei of skipped) console.log(`  ? "${ei.name}"  [${ei.series}]`);
  }

  // Final count
  const { rows: r } = await db.execute('SELECT COUNT(*) as cnt FROM items');
  console.log(`\n✅ Done — ${r[0].cnt} items in DB`);
}

main().catch(console.error);
