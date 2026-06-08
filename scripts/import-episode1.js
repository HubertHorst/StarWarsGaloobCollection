// Import Action Fleet Episode 1 sets
// node scripts/import-episode1.js

const { createClient } = require('../node_modules/@libsql/client');
const { randomUUID } = require('crypto');

const TURSO_URL   = 'libsql://star-wars-galoob-huberthorst.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg0OTMwMTEsImlkIjoiMDE5ZTE2NzAtYjgwMS03ZWI1LWIxYjYtNjM0NmYwMzNjOWM3IiwicmlkIjoiZDllZWRjYjktNjc1Ny00MzIyLTlhM2UtYTI3ZDVjOWE3YmYxIn0.sec1zhxbktTrfc8q2aYcpAbwtrMGYuT0Wxitzl0ogWzphxPnPrfmzJ6jiIqCKFOAPA6vXkk-RjkqMtbhXjTBAA';

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ---------------------------------------------------------------------------
// Dataset — 38 items
// ---------------------------------------------------------------------------
const ITEMS = [
  // ── Single Packs ──────────────────────────────────────────────────────────
  { name: "Anakin's Pod Racer",                    serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 0, kaufpreis: '10,00', wert: '50,00'  },
  { name: 'Flash Speeder',                         serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '20,00', wert: '30,00'  },
  { name: 'Gungan Sub',                            serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: "Mars Guo's Pod Racer",                  serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Naboo Starfighter',                     serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '20,00', wert: '25,00'  },
  { name: 'Republic Cruiser',                      serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '20,00', wert: '25,00'  },
  { name: 'Royal Starship',                        serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: '150,00' },
  { name: "Sebulba's Pod Racer",                   serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Sith Infiltrator',                      serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Trade Federation Droid Control Ship',   serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Trade Federation Droid Fighter',        serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '20,00', wert: '50,00'  },
  { name: 'Trade Federation Landing Ship',         serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: '150,00' },
  { name: 'Trade Federation MTT',                  serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '20,00', wert: '25,00'  },
  { name: 'Trade Federation Tank (AAT)',            serie: 'Action Fleet Episode 1 : Single Packs',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },

  // ── Mini-Scenes ───────────────────────────────────────────────────────────
  { name: '1 – STAP Invasion',               serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null,    set_nummer: '1' },
  { name: '2 – Destroyer Droid Ambush',      serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '15,00', wert: '20,00', set_nummer: '2' },
  { name: '3 – Gungan Assault',              serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '15,00', wert: '20,00', set_nummer: '3' },
  { name: '4 – Sith Pursuit',                serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 1, kaufpreis: '15,00', wert: '20,00', set_nummer: '4' },
  { name: '5 – Trade Federation Raid',       serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null,    set_nummer: '5' },
  { name: '6 – Throne Room Reception',       serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null,    set_nummer: '6' },
  { name: "7 – Watto's Deal",                serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null,    set_nummer: '7' },
  { name: '8 – Generator Core Duel',         serie: 'Action Fleet Episode 1 : Mini-Scenes',   jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null,    set_nummer: '8' },

  // ── Alpha Series ──────────────────────────────────────────────────────────
  { name: 'Naboo Starfighter',                     serie: 'Action Fleet Episode 1 : Alpha Series',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: '826,25' },
  { name: 'Royal Starship',                        serie: 'Action Fleet Episode 1 : Alpha Series',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: '130,00' },
  { name: 'Sith Infiltrator',                      serie: 'Action Fleet Episode 1 : Alpha Series',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: '185,91' },
  { name: 'Trade Federation Droid Fighter',        serie: 'Action Fleet Episode 1 : Alpha Series',  jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: '140,00' },

  // ── Playsets ──────────────────────────────────────────────────────────────
  { name: 'Mos Espa Market',                       serie: 'Action Fleet Episode 1 : Playsets',      jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Naboo Hangar/Final Combat',             serie: 'Action Fleet Episode 1 : Playsets',      jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Otoh Gunga',                            serie: 'Action Fleet Episode 1 : Playsets',      jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Pod Racer Hangar Bay',                  serie: 'Action Fleet Episode 1 : Playsets',      jahr: 1999, in_sammlung: 1, lieferung_ausstehend: 0, kaufpreis: '10,00', wert: '30,00'  },
  { name: 'Theed Palace',                          serie: 'Action Fleet Episode 1 : Playsets',      jahr: 2000, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },

  // ── Miscellaneous ─────────────────────────────────────────────────────────
  { name: 'Electronic Fambaa',                     serie: 'Action Fleet Episode 1 : Miscellaneous', jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Electronic Trade Federation Tank',      serie: 'Action Fleet Episode 1 : Miscellaneous', jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Sneak Preview Gian Speeder & Theed Palace', serie: 'Action Fleet Episode 1 : Miscellaneous', jahr: 1998, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null, wert: null   },
  { name: 'Turbo Racers Gasgano',                  serie: 'Action Fleet Episode 1 : Miscellaneous', jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
  { name: 'Turbo Racers Ody Mandrell',             serie: 'Action Fleet Episode 1 : Miscellaneous', jahr: 1999, in_sammlung: 0, lieferung_ausstehend: 0, kaufpreis: null,    wert: null     },
];

async function main() {
  // Check for existing items in these series to avoid duplicates
  const series = [...new Set(ITEMS.map(i => i.serie))];
  const placeholders = series.map(() => '?').join(', ');
  const { rows: existing } = await db.execute({
    sql: `SELECT name, serie FROM items WHERE serie IN (${placeholders})`,
    args: series,
  });

  const existingKeys = new Set(existing.map(r => `${r.serie}::${r.name}`));

  let inserted = 0, skipped = 0;

  for (const item of ITEMS) {
    const key = `${item.serie}::${item.name}`;
    if (existingKeys.has(key)) {
      console.log(`  ⏭️  Exists: "${item.name}"  [${item.serie}]`);
      skipped++;
      continue;
    }

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO items (id, name, serie, set_nummer, jahr, zustand, wert, kaufpreis, in_sammlung, lieferung_ausstehend)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        item.name,
        item.serie,
        item.set_nummer ?? null,
        item.jahr,
        'Box Neuwertig',
        item.wert,
        item.kaufpreis,
        item.in_sammlung,
        item.lieferung_ausstehend,
      ],
    });

    const status = item.in_sammlung === 1
      ? (item.lieferung_ausstehend === 1 ? '🚚 ausstehend' : '✅ vorhanden')
      : '❌ fehlt';
    console.log(`  + ${status}  "${item.name}"  [${item.serie}]`);
    inserted++;
  }

  const { rows: r } = await db.execute('SELECT COUNT(*) as cnt FROM items');
  console.log(`\n✅ Done — ${inserted} inserted, ${skipped} skipped — ${r[0].cnt} total items in DB`);
}

main().catch(console.error);
