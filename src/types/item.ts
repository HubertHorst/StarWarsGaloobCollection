export interface Item {
  id: string
  name: string
  serie: string | null        // Series: "Micro Machines", "Action Fleet", "Epic Force", etc.
  set_nummer: string | null   // Set number e.g. "#7"
  jahr: number | null         // Year e.g. 1994
  zustand: string | null      // Condition: "OVP", "Neu", "Sehr gut", "Gut", "Gebraucht", "Beschädigt"
  wert: string | null         // Estimated value e.g. "45,00"
  kaufpreis: string | null    // Purchase price e.g. "30,00"
  in_sammlung: number | null           // 1 = vorhanden, 0 = fehlt in Sammlung
  lieferung_ausstehend: number | null  // 0 = No, 1 = Yes
  cover_url: string | null
  user_photos: string[] | null
  created_at: string | null
}
