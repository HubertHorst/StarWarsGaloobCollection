// Compare DB prices against Excel master list and report discrepancies
// node scripts/verify-prices.js

const { createClient } = require('../node_modules/@libsql/client');
const xlsx = require('xlsx');

const TURSO_URL   = 'libsql://star-wars-galoob-huberthorst.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg0OTMwMTEsImlkIjoiMDE5ZTE2NzAtYjgwMS03ZWI1LWIxYjYtNjM0NmYwMzNjOWM3IiwicmlkIjoiZDllZWRjYjktNjc1Ny00MzIyLTlhM2UtYTI3ZDVjOWE3YmYxIn0.sec1zhxbktTrfc8q2aYcpAbwtrMGYuT0Wxitzl0ogWzphxPnPrfmzJ6jiIqCKFOAPA6vXkk-RjkqMtbhXjTBAA';
const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ---------------------------------------------------------------------------
// Parse Excel into flat [{serie, name, kaufpreis, wert}]
// ---------------------------------------------------------------------------
function parseExcel(path) {
  const wb = xlsx.readFile(path);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  const items = [];
  let mainSection = '';
  let subSection  = '';

  // Map section headings to DB serie names
  function toSerie(main, sub) {
    switch (main) {
      case 'Classic Action Fleet':            return 'Action Fleet : Classic Vessel';
      case 'Alpha Series':
        if (sub === 'Action Fleet Episode 1') return 'Action Fleet Episode 1 : Alpha Series';
        return 'Action Fleet : Alpha Series';
      case 'Transforming Playsets':           return 'Action Fleet : Transforming Playsets';
      case 'Miscellaneous':
        if (sub === 'Action Fleet Episode 1') return 'Action Fleet Episode 1 : Miscellaneous';
        return 'Action Fleet : Sonderserie';
      case 'Battle Packs':                    return 'Action Fleet : Battle Packs';
      case 'Vessel':
        if (sub === 'Hasbro Saga Action Fleet 2002') return 'Hasbro Saga Action Fleet 2002 : Vessel';
        return null;
      case 'Packs':
        if (sub === 'Hasbro Saga Action Fleet 2002') return 'Hasbro Saga Action Fleet 2002 : Battle Packs';
        return null;
      case 'Star Wars Micro Machines Playsets': return 'Micro Machines : Playsets';
      case 'Transforming Action Sets':          return 'Micro Machines : Transforming Action Sets';
      case 'Original 3 Pack Filme':             return 'Micro Machines : Original 3 Pack Filme';
      case 'Original 3 Pack':                   return 'Micro Machines : Original 3 Pack';
      case 'Star Wars Micro Machines X-Ray':    return 'Micro Machines : X-Ray';
      case 'Star Wars Micro Machines Di Cast Metal': return 'Micro Machines : Die Cast';
      case 'Epic Collections':                  return 'Micro Machines : Epic Collections';
      case 'Star Wars Micro Machines Figure Sets': return 'Micro Machines : Mini Figures';
      case 'Gift Sets':                         return 'Micro Machines : Gift Sets';
      case 'Star Wars Micro Machines Mini Heads': return 'Micro Machines : Mini Heads';
      case 'Single Packs':
        if (sub === 'Action Fleet Episode 1') return 'Action Fleet Episode 1 : Single Packs';
        return null;
      case 'Mini-Scenes':                       return 'Action Fleet Episode 1 : Mini-Scenes';
      case 'Playsets':
        if (sub === 'Action Fleet Episode 1') return 'Action Fleet Episode 1 : Playsets';
        return null;
      default: return null;
    }
  }

  // Section headers that change mainSection
  const MAIN_SECTIONS = new Set([
    'Classic Action Fleet', 'Alpha Series', 'Transforming Playsets', 'Miscellaneous',
    'Battle Packs', 'Hasbro Saga Action Fleet 2002',
    'Star Wars Micro Machines Playsets', 'Transforming Action Sets',
    'Star Wars Micro Mini Figures', 'Original 3 Pack Filme', 'Original 3 Pack',
    'Star Wars Micro Machines X-Ray', 'Star Wars Micro Machines Di Cast Metal',
    'Epic Collections', 'Star Wars Micro Machines Figure Sets', 'Gift Sets',
    'Star Wars Micro Machines Mini Heads', 'Action Fleet Episode 1',
    'Single Packs', 'Mini-Scenes', 'Playsets', 'Vessel', 'Packs',
  ]);
  // These set a "parent context" but don't produce items themselves
  const PARENT_SECTIONS = new Set(['Action Fleet Episode 1', 'Hasbro Saga Action Fleet 2002', 'Star Wars Micro Mini Figures']);

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const col0 = row[0];
    const col2 = row[2];
    const col3 = row[3];

    // Detect section header: only col0 set, cols 2+3 empty/null, and col0 is a known heading
    const isHeader = typeof col0 === 'string' && MAIN_SECTIONS.has(col0)
      && (col2 == null || col2 === '' || col2 === ' ')
      && (col3 == null || col3 === '' || col3 === ' ');

    if (isHeader) {
      if (PARENT_SECTIONS.has(col0)) {
        subSection = col0;
        mainSection = '';
      } else {
        mainSection = col0;
      }
      continue;
    }

    // Skip pure sub-header rows like "Vessel / Figures", "Title / Contents", etc.
    if (typeof col0 === 'string' && (col0 === 'Vessel' || col0 === 'Title' || col0 === 'Titel' || col0 === 'Packs') && !row[2]) continue;
    if (typeof col0 === 'string' && col0 === 'Name') continue; // header row

    const serie = toSerie(mainSection, subSection);
    if (!serie) continue;

    // Name: col0 might be a number (Original 3 Pack, Epic Collections, X-Ray)
    let name;
    if (typeof col0 === 'number') {
      // e.g. row 134: [1, "TIE Interceptor Star Destroyer...", null, null]
      name = `${col0} – ${String(row[1] ?? '').trim()}`;
    } else {
      name = String(col0).trim();
    }
    if (!name) continue;

    const kaufpreis = (col2 != null && col2 !== '' && col2 !== ' ') ? col2 : null;
    const wert      = (col3 != null && col3 !== '' && col3 !== ' ') ? col3 : null;

    items.push({ serie, name, kaufpreis, wert });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Fuzzy matching helpers
// ---------------------------------------------------------------------------
const STOP = new Set(['the','a','an','and','or','of','in','with','from','to','for','at','by','on',
  'star','wars','action','fleet','micro','machines','set','series','classic','battle','pack','packs']);

function tokenize(str) {
  return str.toLowerCase()
    .replace(/[''"`–—\-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t));
}
function jaccard(a, b) {
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}
function coverage(qt, tt) {
  if (qt.length === 0) return 0;
  const st = new Set(tt);
  return qt.filter(t => st.has(t)).length / qt.length;
}
function score(a, b) {
  const ta = tokenize(a), tb = tokenize(b);
  return Math.max(jaccard(ta, tb), coverage(ta, tb), coverage(tb, ta));
}

function fmtPrice(v) {
  if (v == null) return '—';
  // DB stores as string "35,00", Excel as number 35 or 35.5
  if (typeof v === 'number') return v.toFixed(2).replace('.', ',');
  return String(v);
}

function toFloat(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(',', '.')) || null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const excelItems = parseExcel('C:/Users/User/Desktop/Preise.xlsx');
  console.log(`📊 Excel: ${excelItems.length} items parsed\n`);

  // Load all DB items
  const { rows: dbRows } = await db.execute('SELECT id, name, serie, kaufpreis, wert FROM items');
  console.log(`🗄️  DB: ${dbRows.length} items\n`);

  // Group DB by serie
  const bySerieDB = {};
  for (const r of dbRows) {
    const s = String(r.serie ?? '');
    if (!bySerieDB[s]) bySerieDB[s] = [];
    bySerieDB[s].push(r);
  }

  const mismatches = [];
  const noMatch   = [];
  const ok        = [];

  for (const ei of excelItems) {
    const candidates = bySerieDB[ei.serie] || [];

    // Try exact name match (case-insensitive)
    let match = candidates.find(c =>
      String(c.name).toLowerCase().trim() === ei.name.toLowerCase().trim()
    );

    // Fuzzy fallback
    let matchScore = match ? 1 : 0;
    if (!match && candidates.length > 0) {
      let best = 0, bestRow = null;
      for (const c of candidates) {
        const s = score(ei.name, String(c.name));
        if (s > best) { best = s; bestRow = c; }
      }
      if (best >= 0.35) { match = bestRow; matchScore = best; }
    }

    if (!match) {
      noMatch.push(ei);
      continue;
    }

    // Compare prices
    const dbKauf = toFloat(match.kaufpreis);
    const dbWert = toFloat(match.wert);
    const exKauf = toFloat(ei.kaufpreis);
    const exWert = toFloat(ei.wert);

    const kaufDiff = exKauf !== null && dbKauf !== exKauf;
    const wertDiff = exWert !== null && dbWert !== exWert;

    const entry = {
      excel: ei,
      db: match,
      score: matchScore,
      kaufDiff,
      wertDiff,
    };

    if (kaufDiff || wertDiff) {
      mismatches.push(entry);
    } else {
      ok.push(entry);
    }
  }

  // Report
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅  OK:          ${ok.length}`);
  console.log(`❌  MISMATCH:    ${mismatches.length}`);
  console.log(`❓  NO MATCH:    ${noMatch.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (mismatches.length > 0) {
    console.log('━━━  PRICE MISMATCHES  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const m of mismatches) {
      const sc = m.score < 1 ? ` [fuzzy ${(m.score*100).toFixed(0)}%]` : '';
      console.log(`\nExcel: "${m.excel.name}"  [${m.excel.serie}]`);
      console.log(`  DB:  "${m.db.name}"${sc}`);
      if (m.kaufDiff) console.log(`  Kaufpreis  DB=${fmtPrice(m.db.kaufpreis)}  Excel=${fmtPrice(m.excel.kaufpreis)}  ← WRONG`);
      if (m.wertDiff) console.log(`  Wert       DB=${fmtPrice(m.db.wert)}       Excel=${fmtPrice(m.excel.wert)}  ← WRONG`);
    }
  }

  if (noMatch.length > 0) {
    console.log('\n━━━  NO DB MATCH FOUND  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const nm of noMatch) {
      const hasPrice = nm.kaufpreis != null || nm.wert != null;
      const marker = hasPrice ? '💰' : '  ';
      console.log(`${marker} "${nm.name}"  [${nm.serie}]  kauf=${fmtPrice(nm.kaufpreis)}  wert=${fmtPrice(nm.wert)}`);
    }
  }
}

main().catch(console.error);
