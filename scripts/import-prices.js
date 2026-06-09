// Update/insert all sets with Kaufpreis and Wert data
// node scripts/import-prices.js

const { createClient } = require('../node_modules/@libsql/client');
const { randomUUID } = require('crypto');

const TURSO_URL   = 'libsql://star-wars-galoob-huberthorst.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg0OTMwMTEsImlkIjoiMDE5ZTE2NzAtYjgwMS03ZWI1LWIxYjYtNjM0NmYwMzNjOWM3IiwicmlkIjoiZDllZWRjYjktNjc1Ny00MzIyLTlhM2UtYTI3ZDVjOWE3YmYxIn0.sec1zhxbktTrfc8q2aYcpAbwtrMGYuT0Wxitzl0ogWzphxPnPrfmzJ6jiIqCKFOAPA6vXkk-RjkqMtbhXjTBAA';

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ---------------------------------------------------------------------------
// Full price dataset
// ---------------------------------------------------------------------------
const ITEMS = [
  // ── Action Fleet : Classic Vessel ─────────────────────────────────────────
  { name: 'All Terrain Armored Transport (AT-AT)',      serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'A-wing',                                     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'A-wing "Squadron Colors"',                   serie: 'Action Fleet : Classic Vessel',           kaufpreis: '45,00', wert: '70,00'  },
  { name: 'B-wing',                                     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '50,00'  },
  { name: "Boba Fett's Slave I",                        serie: 'Action Fleet : Classic Vessel',           kaufpreis: '47,00', wert: '50,00'  },
  { name: 'Cloud Car',                                  serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '35,00'  },
  { name: 'E-wing',                                     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '185,00', wert: '250,00' },
  { name: 'Imperial Landing Craft',                     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '60,00', wert: '79,00'  },
  { name: 'Imperial Shuttle Tyderium',                  serie: 'Action Fleet : Classic Vessel',           kaufpreis: '33,00', wert: '45,00'  },
  { name: "Jabba's Sail Barge",                         serie: 'Action Fleet : Classic Vessel',           kaufpreis: '90,00', wert: '130,00' },
  { name: 'Jawa Sandcrawler',                           serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'Millennium Falcon',                          serie: 'Action Fleet : Classic Vessel',           kaufpreis: '63,00', wert: '75,00'  },
  { name: 'Rancor',                                     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '55,00', wert: '60,00'  },
  { name: 'Rebel Blockade Runner',                      serie: 'Action Fleet : Classic Vessel',           kaufpreis: '42,00', wert: '55,00'  },
  { name: 'Snowspeeder',                                serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'Snowspeeder Rogue 2 "Squadron Colors"',      serie: 'Action Fleet : Classic Vessel',           kaufpreis: '60,00', wert: '70,00'  },
  { name: 'T-16 Skyhopper',                             serie: 'Action Fleet : Classic Vessel',           kaufpreis: '43,00', wert: '60,00'  },
  { name: 'TIE Advanced x1 "Darth Vader\'s TIE"',       serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'TIE Bomber',                                 serie: 'Action Fleet : Classic Vessel',           kaufpreis: '52,00', wert: '50,00'  },
  { name: 'TIE Defender',                               serie: 'Action Fleet : Classic Vessel',           kaufpreis: null,    wert: null     },
  { name: 'TIE Fighter',                                serie: 'Action Fleet : Classic Vessel',           kaufpreis: '31,00', wert: '45,00'  },
  { name: 'TIE Interceptor',                            serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'Virago',                                     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '44,00', wert: '60,00'  },
  { name: 'X-wing Red 5',                               serie: 'Action Fleet : Classic Vessel',           kaufpreis: '31,00', wert: '40,00'  },
  { name: 'X-wing Red 2 "Squadron Colors"',             serie: 'Action Fleet : Classic Vessel',           kaufpreis: '44,00', wert: '50,00'  },
  { name: 'X-wing Red 6 "Squadron Colors"',             serie: 'Action Fleet : Classic Vessel',           kaufpreis: null,    wert: null     },
  { name: 'Y-wing Gold Leader',                         serie: 'Action Fleet : Classic Vessel',           kaufpreis: '35,00', wert: '40,00'  },
  { name: 'Y-wing Blue Leader "Squadron Colors"',       serie: 'Action Fleet : Classic Vessel',           kaufpreis: '20,00', wert: '60,00'  },
  { name: 'Y-wing Yellow Leader "Squadron Colors"',     serie: 'Action Fleet : Classic Vessel',           kaufpreis: '56,00', wert: '70,00'  },

  // ── Action Fleet : Alpha Series ───────────────────────────────────────────
  { name: 'AT-AT',                                      serie: 'Action Fleet : Alpha Series',             kaufpreis: '40,00', wert: '50,00'  },
  { name: 'B-wing',                                     serie: 'Action Fleet : Alpha Series',             kaufpreis: '71,00', wert: '75,00'  },
  { name: 'Cloud Car',                                  serie: 'Action Fleet : Alpha Series',             kaufpreis: '72,00', wert: '75,00'  },
  { name: 'Imperial Shuttle',                           serie: 'Action Fleet : Alpha Series',             kaufpreis: '20,00', wert: '50,00'  },
  { name: 'Snowspeeder',                                serie: 'Action Fleet : Alpha Series',             kaufpreis: '20,00', wert: '50,00'  },
  { name: 'X-wing Red 3',                               serie: 'Action Fleet : Alpha Series',             kaufpreis: '20,00', wert: '50,00'  },
  { name: 'Y-wing Yellow Leader',                       serie: 'Action Fleet : Alpha Series',             kaufpreis: '74,00', wert: '75,00'  },

  // ── Action Fleet : Transforming Playsets ──────────────────────────────────
  { name: 'Ice Planet Hoth',                            serie: 'Action Fleet : Transforming Playsets',    kaufpreis: '84,00', wert: '100,00' },
  { name: 'Death Star',                                 serie: 'Action Fleet : Transforming Playsets',    kaufpreis: '104,00', wert: '100,00'},
  { name: 'Yavin Rebel Base',                           serie: 'Action Fleet : Transforming Playsets',    kaufpreis: '109,00', wert: '120,00'},

  // ── Action Fleet : Sonderserie ────────────────────────────────────────────
  { name: 'Droids',                                             serie: 'Action Fleet : Sonderserie', kaufpreis: null,     wert: null      },
  { name: 'Classic Duels TIE Interceptor vs Millennium Falcon', serie: 'Action Fleet : Sonderserie', kaufpreis: '85,00',  wert: '100,00'  },
  { name: 'Classic Duels TIE Fighter vs X-wing',               serie: 'Action Fleet : Sonderserie', kaufpreis: null,     wert: null      },
  { name: "Flight Controller Darth Vader's TIE",               serie: 'Action Fleet : Sonderserie', kaufpreis: '38,00',  wert: '50,00'   },
  { name: 'Flight Controller TIE Interceptor',                  serie: 'Action Fleet : Sonderserie', kaufpreis: '90,00',  wert: '120,00'  },
  { name: 'Flight Controller X-wing',                           serie: 'Action Fleet : Sonderserie', kaufpreis: '35,00',  wert: '50,00'   },
  { name: 'Flight Controller Y-wing',                           serie: 'Action Fleet : Sonderserie', kaufpreis: '100,00', wert: '120,00'  },
  { name: 'Electronic AT-AT (Kaybee Exclusive)',                 serie: 'Action Fleet : Sonderserie', kaufpreis: '41,00',  wert: '45,00'   },
  { name: 'Electronic AT-AT (JCPenney Exclusive)',               serie: 'Action Fleet : Sonderserie', kaufpreis: null,     wert: null      },
  { name: 'Galactic Battle X-Wing vs Vader\'s TIE (ZAAP! Exclusive)', serie: 'Action Fleet : Sonderserie', kaufpreis: '173,00', wert: '200,00'},
  { name: 'Landspeeder and AT-ST (Kaybee Exclusive)',            serie: 'Action Fleet : Sonderserie', kaufpreis: '50,00',  wert: '60,00'   },
  { name: "ToyFare Luke's X-Wing (Dagobah deco)",               serie: 'Action Fleet : Sonderserie', kaufpreis: '43,00',  wert: '60,00'   },

  // ── Action Fleet : Battle Packs ───────────────────────────────────────────
  { name: '1 – Rebel Alliance',           serie: 'Action Fleet : Battle Packs', kaufpreis: '24,00', wert: '29,00' },
  { name: '2 – Galactic Empire',          serie: 'Action Fleet : Battle Packs', kaufpreis: '19,00', wert: '29,00' },
  { name: '3 – Aliens & Creatures',       serie: 'Action Fleet : Battle Packs', kaufpreis: '25,00', wert: '29,00' },
  { name: '4 – Imperial Hunters',         serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '5 – Shadows of the Empire',    serie: 'Action Fleet : Battle Packs', kaufpreis: '25,00', wert: '29,00' },
  { name: '6 – Dune Sea',                 serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '7 – Droid Escape',             serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '8 – Desert Palace',            serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '9 – Endor Adventures',         serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '10 – Mos Eisley Spaceport',    serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '11 – Cantina Encounter',       serie: 'Action Fleet : Battle Packs', kaufpreis: '23,00', wert: '29,00' },
  { name: '12 – Cantina Smugglers & Spies', serie: 'Action Fleet : Battle Packs', kaufpreis: '30,00', wert: '40,00' },
  { name: '13 – Hoth Attack',             serie: 'Action Fleet : Battle Packs', kaufpreis: null,    wert: null    },
  { name: '14 – Death Star Escape',       serie: 'Action Fleet : Battle Packs', kaufpreis: null,    wert: null    },
  { name: '15 – Endor Victory',           serie: 'Action Fleet : Battle Packs', kaufpreis: '30,00', wert: '40,00' },
  { name: '16 – Lars Family Homestead',   serie: 'Action Fleet : Battle Packs', kaufpreis: null,    wert: null    },
  { name: '17 – Imperial Troops',         serie: 'Action Fleet : Battle Packs', kaufpreis: null,    wert: null    },
  { name: '18 – Rebel Troops',            serie: 'Action Fleet : Battle Packs', kaufpreis: null,    wert: null    },

  // ── Hasbro Saga Action Fleet 2002 : Vessel ────────────────────────────────
  { name: 'AT-AT',                                   serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: '10,00', wert: '50,00' },
  { name: 'AT-TE',                                   serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: "Jango Fett's Slave I",                    serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: 'Millennium Falcon',                       serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: 'Naboo Starfighter',                       serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: '10,00', wert: '40,00' },
  { name: 'Republic Assault Ship (Acclamator)',       serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: 'Republic Gunship',                        serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: 'Snowspeeder',                             serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: 'Solar Sailor',                            serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },
  { name: 'TIE Advanced x1 "Darth Vader\'s TIE"',   serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: '5,00',  wert: '20,00' },
  { name: 'X-wing Red 5',                            serie: 'Hasbro Saga Action Fleet 2002 : Vessel', kaufpreis: null,    wert: null    },

  // ── Hasbro Saga Action Fleet 2002 : Battle Packs ─────────────────────────
  { name: 'Dune Sea Ambush',          serie: 'Hasbro Saga Action Fleet 2002 : Battle Packs', kaufpreis: null, wert: null },
  { name: 'Imperial Endor Pursuit',   serie: 'Hasbro Saga Action Fleet 2002 : Battle Packs', kaufpreis: null, wert: null },
  { name: 'Mos Eisley Encounter',     serie: 'Hasbro Saga Action Fleet 2002 : Battle Packs', kaufpreis: null, wert: null },

  // ── Micro Machines : Playsets ─────────────────────────────────────────────
  { name: 'Death Star',  serie: 'Micro Machines : Playsets', kaufpreis: '25,00', wert: '50,00' },
  { name: 'Ice Planet Hoth', serie: 'Micro Machines : Playsets', kaufpreis: '50,00', wert: '50,00' },
  { name: 'Endor',       serie: 'Micro Machines : Playsets', kaufpreis: '40,00', wert: '50,00' },
  { name: 'Tatooine',    serie: 'Micro Machines : Playsets', kaufpreis: '30,00', wert: '60,00' },
  { name: 'Dagobah',     serie: 'Micro Machines : Playsets', kaufpreis: '30,00', wert: '50,00' },

  // ── Micro Machines : Transforming Action Sets ─────────────────────────────
  { name: 'Chewbacca – Endor',                          serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '45,00', wert: '59,00' },
  { name: 'C-3PO - Cantina',                            serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '25,00', wert: '59,00' },
  { name: "R2-D2 Jabba's Palace",                       serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '45,00', wert: '59,00' },
  { name: 'Darth Vader – Bespin',                       serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '44,00', wert: '59,00' },
  { name: 'Stormtrooper – The Death Star',              serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '41,00', wert: '59,00' },
  { name: 'Rebel Pilot Luke Skywalker – Hoth',          serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '30,00', wert: '59,00' },
  { name: 'Yoda – Dagobah',                             serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '65,00', wert: '69,00' },
  { name: 'Boba Fett – Cloud City',                     serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '35,00', wert: '59,00' },
  { name: 'Royal Guard – Death Star 2',                 serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '44,00', wert: '59,00' },
  { name: 'Jabba – Tatooine',                           serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '65,00', wert: '69,00' },
  { name: 'Tie Pilot – Imperial Academy',               serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '30,00', wert: '59,00' },
  { name: 'Slave 1 – Tatooine',                         serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '35,00', wert: '59,00' },
  { name: 'Rebel Transport – Playset',                  serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '50,00', wert: '89,00' },
  { name: 'Cloud City – Playset',                       serie: 'Micro Machines : Transforming Action Sets', kaufpreis: null,    wert: null    },
  { name: 'Star Destroyer – Space Fortress',            serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '80,00', wert: '89,00' },
  { name: "Luke Skywalker's Binoculars – Yavin Rebel Base", serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '45,00', wert: '59,00' },
  { name: "Darth Vader's Lightsaber – Death Star Trench", serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '41,00', wert: '59,00' },
  { name: 'Millennium Falcon',                          serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '58,00', wert: '90,00' },
  { name: 'Deathstar - Tatooine',                       serie: 'Micro Machines : Transforming Action Sets', kaufpreis: '105,00', wert: '109,00'},

  // ── Micro Machines : Original 3 Pack Filme ────────────────────────────────
  { name: 'A new Hope 1',            serie: 'Micro Machines : Original 3 Pack Filme', kaufpreis: '19,00', wert: '20,00' },
  { name: 'Empire Strikes Back 2',   serie: 'Micro Machines : Original 3 Pack Filme', kaufpreis: '19,00', wert: '20,00' },
  { name: 'Return of the Jedi 3',    serie: 'Micro Machines : Original 3 Pack Filme', kaufpreis: '18,00', wert: '20,00' },
  { name: 'A new Hope 4',            serie: 'Micro Machines : Original 3 Pack Filme', kaufpreis: '10,00', wert: '20,00' },
  { name: 'Empire Strikes Back 5',   serie: 'Micro Machines : Original 3 Pack Filme', kaufpreis: '5,00',  wert: '20,00' },
  { name: 'Return of the Jedi 6',    serie: 'Micro Machines : Original 3 Pack Filme', kaufpreis: null,    wert: null    },

  // ── Micro Machines : Original 3 Pack ─────────────────────────────────────
  { name: '1 – TIE Interceptor Star Destroyer Rebel Blockade Runner', serie: 'Micro Machines : Original 3 Pack', kaufpreis: null,    wert: null    },
  { name: '2 – Luke\'s Landspeeder Millennium Falcon Jawa Sandcrawler', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '3 – TIE Advanced x1 Y-wing X-wing',                         serie: 'Micro Machines : Original 3 Pack', kaufpreis: '19,00', wert: '20,00' },
  { name: '4 – Imperial Probot AT-AT Snowspeeder',                      serie: 'Micro Machines : Original 3 Pack', kaufpreis: null,    wert: null    },
  { name: '5 – Rebel Transport TIE Bomber AT-ST',                       serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '6 – Escort Frigate Boba Fett\'s Slave I Twin Pod Cloud Car', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '7 – Mon Calamari Star Cruiser (Liberty) Jabba\'s Sail Barge Speeder Bike with Leia', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '8 – Speeder Bike with Scout Trooper Imperial Shuttle Tydirium TIE Fighter', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '9 – Super Star Destroyer Executor A-wing B-wing',            serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '10 – T-16 Skyhopper Lars Family Landspeeder Death Star II',  serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '11 – Cloud City Mon Calamari Rebel Cruiser (Home One) Escape Pod', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '12 – A-wing (battle-damaged) Y-wing (battle-damaged) TIE Fighter (battle-damaged)', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '13 – Red Squadron X-wing Green Squadron X-wing Blue Squadron X-wing', serie: 'Micro Machines : Original 3 Pack', kaufpreis: '15,00', wert: '20,00' },
  { name: '14 – Imperial Landing Craft S-Swoop Death Star I',           serie: 'Micro Machines : Original 3 Pack', kaufpreis: null,    wert: null    },
  { name: '15 – V-35 Landspeeder Tibanna Gas Refinery Outrider',       serie: 'Micro Machines : Original 3 Pack', kaufpreis: '40,00', wert: '40,00' },

  // ── Micro Machines : X-Ray ────────────────────────────────────────────────
  { name: '1 – Vader TIE A-Wing',         serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },
  { name: '2 – X-Wing ATAT',              serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },
  { name: '3 – Millennium Falcon Sandcrawler', serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },
  { name: '4 – Slave 1 Y-Wing',           serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },
  { name: '5 – B-Wing Tie Bomber',        serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },
  { name: '6 – Landspeeder Tie Fighter',  serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },
  { name: '7 – Snowspeeder ATST',         serie: 'Micro Machines : X-Ray', kaufpreis: null, wert: null },

  // ── Micro Machines : Die Cast ─────────────────────────────────────────────
  { name: 'Star Destroyer',       serie: 'Micro Machines : Die Cast', kaufpreis: '10,00', wert: '10,00' },
  { name: 'A-Wing',               serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Super Star Destroyer', serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Slave 1',              serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'TIE Bomber',           serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Snowspeeder',          serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Landspeeder',          serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Deathstar',            serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Millennium Falcon',    serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Tie Fighter',          serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'Y-Wing',               serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },
  { name: 'X-Wing',               serie: 'Micro Machines : Die Cast', kaufpreis: null,    wert: null    },

  // ── Micro Machines : Epic Collections ────────────────────────────────────
  { name: '1 – Heir to the Empire',              serie: 'Micro Machines : Epic Collections', kaufpreis: '13,00',  wert: '20,00' },
  { name: '2 – Jedi Search',                     serie: 'Micro Machines : Epic Collections', kaufpreis: '17,50',  wert: '20,00' },
  { name: '3 – The Truce At Bakura',             serie: 'Micro Machines : Epic Collections', kaufpreis: '17,50',  wert: '20,00' },
  { name: '4 – Dark Apprentice',                 serie: 'Micro Machines : Epic Collections', kaufpreis: null,     wert: null    },
  { name: '5 – Dark Force Rising',               serie: 'Micro Machines : Epic Collections', kaufpreis: null,     wert: null    },
  { name: '6 – The Courtship of Princess Leia',  serie: 'Micro Machines : Epic Collections', kaufpreis: null,     wert: null    },

  // ── Micro Machines : Mini Figures ─────────────────────────────────────────
  { name: 'Rebel Pilots',                        serie: 'Micro Machines : Mini Figures', kaufpreis: '19,00',  wert: '20,00' },
  { name: 'Ewoks',                               serie: 'Micro Machines : Mini Figures', kaufpreis: '25,00',  wert: '40,00' },
  { name: 'Imperial Storm Troopers',             serie: 'Micro Machines : Mini Figures', kaufpreis: '19,00',  wert: '35,00' },
  { name: 'Imperial Pilots',                     serie: 'Micro Machines : Mini Figures', kaufpreis: '20,00',  wert: '25,00' },
  { name: 'Imperial Officers',                   serie: 'Micro Machines : Mini Figures', kaufpreis: '19,00',  wert: '25,00' },
  { name: 'Jawas',                               serie: 'Micro Machines : Mini Figures', kaufpreis: '22,50',  wert: '35,00' },
  { name: 'Echo Base Troops',                    serie: 'Micro Machines : Mini Figures', kaufpreis: '15,00',  wert: '25,00' },
  { name: 'Imperial Naval Troopers',             serie: 'Micro Machines : Mini Figures', kaufpreis: '20,00',  wert: '30,00' },
  { name: 'Tusken Raiders',                      serie: 'Micro Machines : Mini Figures', kaufpreis: '25,00',  wert: '35,00' },
  { name: 'Rebel Fleet Troopers',                serie: 'Micro Machines : Mini Figures', kaufpreis: '22,50',  wert: '35,00' },
  { name: 'Classic Characters (1st release)',    serie: 'Micro Machines : Mini Figures', kaufpreis: '20,00',  wert: '30,00' },
  { name: 'Classic Characters (2nd release)',    serie: 'Micro Machines : Mini Figures', kaufpreis: '20,00',  wert: '35,00' },
  { name: 'Endor Rebel Strike Team',             serie: 'Micro Machines : Mini Figures', kaufpreis: '70,00',  wert: '90,00' },
  { name: 'Scout Troopers',                      serie: 'Micro Machines : Mini Figures', kaufpreis: '70,00',  wert: '90,00' },
  { name: 'Bounty Hunters',                      serie: 'Micro Machines : Mini Figures', kaufpreis: '35,00',  wert: '60,00' },

  // ── Micro Machines : Gift Sets ────────────────────────────────────────────
  { name: 'Collectors Edition New Hope',                      serie: 'Micro Machines : Gift Sets', kaufpreis: '19,00', wert: '30,00' },
  { name: 'Collectors Edition Empire Strikes Back',           serie: 'Micro Machines : Gift Sets', kaufpreis: '19,00', wert: '30,00' },
  { name: 'Collectors Edition Return of the Jedi',            serie: 'Micro Machines : Gift Sets', kaufpreis: '19,00', wert: '30,00' },
  { name: 'Galaxy Battles 1st Edition - Rebel Pilot',         serie: 'Micro Machines : Gift Sets', kaufpreis: null,    wert: null    },
  { name: 'Galaxy Battles 2nd Edition - Nien Nunb',           serie: 'Micro Machines : Gift Sets', kaufpreis: null,    wert: null    },
  { name: 'Imperial Forces 1st Edition - Palpatine',          serie: 'Micro Machines : Gift Sets', kaufpreis: '20,00', wert: '40,00' },
  { name: 'Imperial Forces 2nd Edition - Darth Vader',        serie: 'Micro Machines : Gift Sets', kaufpreis: '20,00', wert: '30,00' },
  { name: 'Rebel Forces 1st Edition - Admiral Ackbar',        serie: 'Micro Machines : Gift Sets', kaufpreis: '20,00', wert: '40,00' },
  { name: 'Rebel Forces 2nd Edition - Han Solo',              serie: 'Micro Machines : Gift Sets', kaufpreis: '31,00', wert: '30,00' },
  { name: 'Rebel vs Imperial Forces - Royal Guard',           serie: 'Micro Machines : Gift Sets', kaufpreis: '30,00', wert: '40,00' },
  { name: '11-piece Gift set - no exclusives',                serie: 'Micro Machines : Gift Sets', kaufpreis: '30,00', wert: '40,00' },

  // ── Micro Machines : Mini Heads ───────────────────────────────────────────
  { name: 'Collection 1',        serie: 'Micro Machines : Mini Heads', kaufpreis: '12,00',  wert: '20,00' },
  { name: 'Collection 2',        serie: 'Micro Machines : Mini Heads', kaufpreis: '13,00',  wert: '20,00' },
  { name: 'Collections 3-9',     serie: 'Micro Machines : Mini Heads', kaufpreis: null,     wert: null    },
  { name: 'Head BOX Vader',      serie: 'Micro Machines : Mini Heads', kaufpreis: '35,00',  wert: '45,00' },
  { name: 'Head Box C3PO',       serie: 'Micro Machines : Mini Heads', kaufpreis: null,     wert: null    },
];

// ---------------------------------------------------------------------------
// Fuzzy matching helpers (Jaccard + coverage)
// ---------------------------------------------------------------------------
const STOP = new Set(['the','a','an','and','or','of','in','with','from','to','for','at','by','on',
  'featuring','series','classic','set','star','wars','action','fleet','micro','machines',
  'concept','design','prototype','battle','pack','packs']);

function tokenize(str) {
  return str.toLowerCase()
    .replace(/[''"`–—]/g, ' ')
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

function coverage(queryTokens, targetTokens) {
  if (queryTokens.length === 0) return 0;
  const st = new Set(targetTokens);
  const matched = queryTokens.filter(t => st.has(t)).length;
  return matched / queryTokens.length;
}

function score(a, b) {
  const ta = tokenize(a), tb = tokenize(b);
  return Math.max(jaccard(ta, tb), coverage(ta, tb), coverage(tb, ta));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Load all existing items from DB (only the series we need)
  const series = [...new Set(ITEMS.map(i => i.serie))];
  const placeholders = series.map(() => '?').join(', ');
  const { rows: existing } = await db.execute({
    sql: `SELECT id, name, serie, kaufpreis, wert FROM items WHERE serie IN (${placeholders})`,
    args: series,
  });

  console.log(`📦 ${existing.length} existing items loaded from DB across ${series.length} series\n`);

  // Group existing by serie for faster matching
  const byserie = {};
  for (const row of existing) {
    if (!byserie[row.serie]) byserie[row.serie] = [];
    byserie[row.serie].push(row);
  }

  let updated = 0, inserted = 0, skipped = 0, noData = 0;

  for (const item of ITEMS) {
    // Skip items with no price data at all — nothing to do
    if (item.kaufpreis === null && item.wert === null) {
      noData++;
      continue;
    }

    const candidates = byserie[item.serie] || [];

    // Try exact name match first
    let match = candidates.find(c => c.name.toLowerCase().trim() === item.name.toLowerCase().trim());

    // Fall back to fuzzy match
    if (!match && candidates.length > 0) {
      let best = 0, bestRow = null;
      for (const c of candidates) {
        const s = score(item.name, c.name);
        if (s > best) { best = s; bestRow = c; }
      }
      if (best >= 0.4) match = bestRow;
    }

    if (match) {
      // Update — only set fields that are non-null in the import data
      const updates = [];
      const args = [];
      if (item.kaufpreis !== null) { updates.push('kaufpreis = ?'); args.push(item.kaufpreis); }
      if (item.wert !== null)      { updates.push('wert = ?');      args.push(item.wert); }

      if (updates.length === 0) { skipped++; continue; }

      args.push(match.id);
      await db.execute({
        sql: `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });
      const kp = item.kaufpreis ? `kaufpreis=${item.kaufpreis}` : '';
      const wt = item.wert      ? `wert=${item.wert}`           : '';
      console.log(`  ✏️  Updated  "${match.name}"  [${item.serie}]  ${[kp, wt].filter(Boolean).join('  ')}`);
      updated++;
    } else {
      // Insert as new item
      const id = randomUUID();
      await db.execute({
        sql: `INSERT INTO items (id, name, serie, kaufpreis, wert, in_sammlung, lieferung_ausstehend)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.name,
          item.serie,
          item.kaufpreis,
          item.wert,
          item.kaufpreis !== null ? 1 : 0,  // in_sammlung = 1 if purchased
          0,
        ],
      });
      console.log(`  + Inserted  "${item.name}"  [${item.serie}]`);
      inserted++;
    }
  }

  const { rows: r } = await db.execute('SELECT COUNT(*) as cnt FROM items');
  console.log(`\n✅ Done — ${updated} updated, ${inserted} inserted, ${skipped} skipped, ${noData} no-data items — ${r[0].cnt} total in DB`);
}

main().catch(console.error);
