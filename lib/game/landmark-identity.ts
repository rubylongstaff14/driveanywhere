/**
 * Cartoon-readable identity for famous Canary Wharf / London landmarks.
 * Colours and labels track the real buildings' distinctive skyline cues.
 */

export interface LandmarkIdentity {
  /** Short player-facing label (shown on billboard). */
  label: string;
  /** Saturated cartoon body tint. */
  color: string;
  /** Accent / crown colour. */
  accent: string;
  /** Optional secondary band colour. */
  band?: string;
}

const IDENTITIES: Record<string, LandmarkIdentity> = {
  // Stainless steel prism + pyramid (Pelli).
  "One Canada Square": {
    label: "One Canada Square",
    color: "#d5dce4",
    accent: "#9eacb8",
    band: "#eceff2",
  },
  // Foster HQ: sheer glass shaft + illuminated halo (not a red box).
  "HSBC UK": {
    label: "HSBC Tower",
    color: "#a8c4d4",
    accent: "#e8f6ff",
    band: "#c8102e",
  },
  // 25 Canada Square — cool blue glass slab.
  Citi: {
    label: "Citi",
    color: "#4a8ec4",
    accent: "#0a3a68",
    band: "#7eb4e0",
  },
  "JP Morgan": {
    label: "JP Morgan",
    color: "#1e2830",
    accent: "#c9a227",
    band: "#3a4850",
  },
  "40 Bank Street": {
    label: "40 Bank Street",
    color: "#6a8498",
    accent: "#e8f0f6",
    band: "#4a6478",
  },
  // White tower with expressed diamond / X diagrid.
  "Newfoundland Quay": {
    label: "Newfoundland",
    color: "#f4f6f8",
    accent: "#1a2430",
    band: "#cfd6de",
  },
  // Tall flush glass residential needle.
  "Landmark Pinnacle": {
    label: "Landmark Pinnacle",
    color: "#e4eef4",
    accent: "#9ab0c0",
    band: "#f8fcff",
  },
  "Landmark East Tower": {
    label: "Landmark East",
    color: "#dce8f0",
    accent: "#6a8a9c",
  },
  "Landmark West Tower": {
    label: "Landmark West",
    color: "#d0dde6",
    accent: "#5a7a8c",
  },
  "Hampton Tower": {
    label: "Hampton Tower",
    color: "#b8ccd8",
    accent: "#2a4858",
    band: "#e0ecf2",
  },
  "Harcourt Tower": {
    label: "Harcourt Tower",
    color: "#a8c0ce",
    accent: "#3a5868",
  },
  "Novotel London Canary Wharf": {
    label: "Novotel",
    color: "#5a9ab8",
    accent: "#f0c040",
    band: "#7ab0c8",
  },
  "South Quay Plaza": {
    label: "South Quay Plaza",
    color: "#5a7080",
    accent: "#e8f0f4",
  },
  "Hobart Building (Wardian West)": {
    label: "Wardian West",
    color: "#6a889c",
    accent: "#e8f0f4",
  },
  "Bagshaw Building (Wardian East)": {
    label: "Wardian East",
    color: "#5a788c",
    accent: "#d8e4ec",
  },
  "1 West India Quay": {
    label: "West India Quay",
    color: "#8aa8bc",
    accent: "#e8c040",
  },
  "Bank of America": {
    label: "Bank of America",
    color: "#5a8098",
    accent: "#e04040",
  },
  "Cascades Tower": {
    label: "Cascades",
    color: "#88a4b4",
    accent: "#284850",
  },
  "Berkeley Tower": {
    label: "Berkeley Tower",
    color: "#9cb0be",
    accent: "#385060",
  },
  "Canary Wharf DLR": {
    label: "Canary Wharf DLR",
    color: "#2e9a58",
    accent: "#f4fff6",
  },
  "Morgan Stanley": {
    label: "Morgan Stanley",
    color: "#3a5060",
    accent: "#c9a84a",
    band: "#1a2830",
  },
  "Credit Suisse": {
    label: "1 Cabot Square",
    color: "#6a8898",
    accent: "#d4e4ec",
    band: "#4a6878",
  },
  Barclays: {
    label: "Barclays",
    color: "#0a5a40",
    accent: "#20c080",
    band: "#083828",
  },
  "Hilton London Canary Wharf": {
    label: "Hilton Canary Wharf",
    color: "#8a9cac",
    accent: "#c8a050",
  },
  "Cabot Place West": {
    label: "Cabot Place",
    color: "#7a98a8",
    accent: "#e0ecf4",
  },
  "Northern Trust": {
    label: "Northern Trust",
    color: "#4a6880",
    accent: "#a8c4d8",
  },
  "Sierra Quebec Bravo": {
    label: "SQB Tower",
    color: "#c8d4dc",
    accent: "#5a7080",
  },
  "East Wintergarden": {
    label: "East Wintergarden",
    color: "#a8c8b8",
    accent: "#e8f8f0",
  },
  "West Wintergarden": {
    label: "West Wintergarden",
    color: "#98b8a8",
    accent: "#d8f0e4",
  },
  "7 Westferry Circus": {
    label: "Westferry Circus",
    color: "#6a8494",
    accent: "#c8dce8",
  },

  // ---- Westminster ----
  "Foreign Office": {
    label: "Foreign Office",
    color: "#8a7860",
    accent: "#d4c4a8",
    band: "#5a4a38",
  },
  "Treasury Building": {
    label: "Treasury",
    color: "#9a8a72",
    accent: "#e0d4bc",
  },
  "Portcullis House": {
    label: "Portcullis House",
    color: "#6a8498",
    accent: "#c8dce8",
  },
  "Millbank Tower": {
    label: "Millbank Tower",
    color: "#a8b0b8",
    accent: "#e8eef2",
    band: "#687078",
  },
  "MI6 Building": {
    label: "MI6 Building",
    color: "#5a7080",
    accent: "#c9a84a",
    band: "#3a4850",
  },
  "Tate Britain": {
    label: "Tate Britain",
    color: "#c8c0b0",
    accent: "#8a8070",
  },
  "Lambeth Palace": {
    label: "Lambeth Palace",
    color: "#8a7060",
    accent: "#d4b898",
    band: "#5a4838",
  },
  "Methodist Central Hall": {
    label: "Central Hall",
    color: "#9a9080",
    accent: "#e8e0d0",
  },
  "Scotland Yard": {
    label: "Scotland Yard",
    color: "#4a6070",
    accent: "#20a0e0",
  },
  "Churchill War Rooms": {
    label: "War Rooms",
    color: "#6a5a48",
    accent: "#c8b898",
  },
  "Banqueting House": { label: "Banqueting House", color: "#c8bca8", accent: "#e8dcc8" },
  "Admiralty Arch": { label: "Admiralty Arch", color: "#b0a898", accent: "#e0d8c8" },
  "Vauxhall Tower": { label: "Vauxhall Tower", color: "#c8d4e0", accent: "#e8f4fc" },
  "St Thomas' Hospital": { label: "St Thomas'", color: "#a8b0b8", accent: "#d8e0e8" },
  "Imperial War Museum": { label: "IWM", color: "#9a9080", accent: "#d4c8b0" },

  // ---- Embankment ----
  "Somerset House": {
    label: "Somerset House",
    color: "#c4b8a0",
    accent: "#8a7858",
  },
  "Savoy Hotel": {
    label: "Savoy Hotel",
    color: "#a89070",
    accent: "#e8d8b8",
    band: "#c9a84a",
  },
  "Shell Mex House": {
    label: "Shell Mex House",
    color: "#8a9aa4",
    accent: "#e0e8ec",
  },
  "Cleopatra's Needle": {
    label: "Cleopatra's Needle",
    color: "#a89878",
    accent: "#d4c4a0",
  },
  "National Theatre": {
    label: "National Theatre",
    color: "#7a7870",
    accent: "#c8c4b8",
  },
  "Royal Festival Hall": {
    label: "Festival Hall",
    color: "#9a9488",
    accent: "#e0dcd0",
  },
  "Oxo Tower": {
    label: "Oxo Tower",
    color: "#8a6048",
    accent: "#e8c040",
  },
  "Unilever House": {
    label: "Unilever House",
    color: "#b0a898",
    accent: "#e8e0d4",
  },
  "Temple Church": {
    label: "Temple Church",
    color: "#908878",
    accent: "#d8d0c0",
  },
  "Waterloo Station": {
    label: "Waterloo Station",
    color: "#6a7078",
    accent: "#c8d0d8",
  },
  "Hungerford Bridge": { label: "Hungerford Bridge", color: "#6a7078", accent: "#c8d0d8" },
  "Tate Modern": { label: "Tate Modern", color: "#8a9098", accent: "#c8d0d8" },
  "Globe Theatre": { label: "Globe Theatre", color: "#a89068", accent: "#d8c498" },
  "The Shard": { label: "The Shard", color: "#d8e4f0", accent: "#f0f8ff" },
  "Southwark Cathedral": { label: "Southwark Cathedral", color: "#908878", accent: "#d0c8b8" },
  "City Hall": { label: "City Hall", color: "#88a8b8", accent: "#d0e8f0" },

  // ---- Giza / Egypt ----
  "Mena House": {
    label: "Mena House",
    color: "#c4a06a",
    accent: "#e8d0a0",
  },
  "Giza Plateau Lodge": {
    label: "Plateau Lodge",
    color: "#b88850",
    accent: "#d4b878",
  },
  "Valley Temple": {
    label: "Valley Temple",
    color: "#a89068",
    accent: "#d8c498",
  },
  "Sphinx Temple": {
    label: "Sphinx Temple",
    color: "#9a7850",
    accent: "#c8a878",
  },
  "Grand Egyptian Museum": {
    label: "Grand Museum",
    color: "#c8c0b0",
    accent: "#c9a84a",
    band: "#8a8070",
  },
  "Solar Boat Museum": {
    label: "Solar Boat Museum",
    color: "#b89868",
    accent: "#e0c890",
  },
  "Khentkawes Complex": {
    label: "Khentkawes",
    color: "#a88048",
    accent: "#d4b060",
  },
  "Workers Village": {
    label: "Workers Village",
    color: "#9a8058",
    accent: "#c8b088",
  },
  "Sound and Light Theatre": {
    label: "Sound & Light",
    color: "#8a7060",
    accent: "#e8c060",
  },
  "Citadel of Saladin": {
    label: "Citadel of Saladin",
    color: "#a88858",
    accent: "#e0c888",
    band: "#6a5030",
  },
  "Khafre Temple Annex": { label: "Khafre Annex", color: "#a88858", accent: "#d4b878" },
  "Osiris Pavilion": { label: "Osiris Pavilion", color: "#b89868", accent: "#e0c890" },
  "Desert Rest House": { label: "Desert Rest House", color: "#9a8058", accent: "#c8b088" },

  // ---- Dubai ----
  "Burj Khalifa": { label: "Burj Khalifa", color: "#b8c8d6", accent: "#d8e8f4", band: "#7a90a4" },
  "Burj Al Arab": { label: "Burj Al Arab", color: "#d8e4ee", accent: "#b89840", band: "#98b0c4" },
  "Cayan Tower": { label: "Cayan Tower", color: "#6a9ab0", accent: "#c8dce8", band: "#3a7088" },
  "Emirates Tower One": { label: "Emirates One", color: "#a8c4d8", accent: "#f0f8ff", band: "#6a90a8" },
  "Emirates Tower Two": { label: "Emirates Two", color: "#98b8cc", accent: "#e8f4fc", band: "#5a8098" },
  "Address Downtown": { label: "Address Downtown", color: "#d0dde8", accent: "#c9a84a", band: "#8a9cac" },
  "Marina 101": { label: "Marina 101", color: "#b0ccd8", accent: "#f4fcff", band: "#6a8898" },
  "Princess Tower": { label: "Princess Tower", color: "#c4d4e0", accent: "#e8f0f8", band: "#7a98a8" },
  "Address Beach Resort": { label: "Address Beach", color: "#d8e4ec", accent: "#f0c878", band: "#9ab0c0" },
  "Gate Village DIFC": { label: "Gate Village", color: "#a8b8c4", accent: "#e0ecf4", band: "#687888" },
  "Museum of the Future": { label: "Museum of the Future", color: "#1a2430", accent: "#e8f4ff", band: "#4a6070" },
  "Dubai Frame": { label: "Dubai Frame", color: "#c9a84a", accent: "#f4e0a0", band: "#8a7030" },
  "JW Marriott Marquis": { label: "JW Marriott", color: "#b8ccd8", accent: "#e8f4fc", band: "#6a8494" },
  "Elite Residence": { label: "Elite Residence", color: "#a8c0d0", accent: "#f0f8ff", band: "#5a7888" },
  "Ocean Heights": { label: "Ocean Heights", color: "#88b0c8", accent: "#d8f0ff", band: "#4a8098" },
  "HHHR Tower": { label: "HHHR Tower", color: "#9ab4c4", accent: "#e4f0f8", band: "#5a7888" },
  "Almas Tower": { label: "Almas Tower", color: "#c0d4e0", accent: "#f8fcff", band: "#7a98a8" },
  "Torch Tower": { label: "Torch Tower", color: "#d4a060", accent: "#f4d090", band: "#8a6030" },
  "Cielo Tower": { label: "Cielo Tower", color: "#a8c8d8", accent: "#e8f8ff", band: "#5a8898" },
  "Damac Heights": { label: "Damac Heights", color: "#b0c4d0", accent: "#e8f0f8", band: "#688090" },
  "Emirates Crown": { label: "Emirates Crown", color: "#c8b898", accent: "#e8d8b0", band: "#8a7858" },
  "23 Marina": { label: "23 Marina", color: "#98b8c8", accent: "#e0f0f8", band: "#4a7080" },
  "The Palm Tower": { label: "Palm Tower", color: "#d0c0a0", accent: "#f0e0c0", band: "#8a7858" },
  "Atlantis The Royal": { label: "Atlantis Royal", color: "#e8e0d0", accent: "#c9a84a", band: "#a89878" },
  "One Za'abeel": { label: "One Za'abeel", color: "#d8dde4", accent: "#f0f4f8", band: "#8a949e" },
  "ICD Brookfield Place": { label: "ICD Brookfield", color: "#a8b8c4", accent: "#e0ecf4", band: "#607080" },
  "Boulevard Plaza 1": { label: "Boulevard Plaza 1", color: "#b8c8d4", accent: "#e8f4fc", band: "#708090" },
  "Boulevard Plaza 2": { label: "Boulevard Plaza 2", color: "#a8bcc8", accent: "#e0f0f8", band: "#607888" },
  "The Index": { label: "The Index", color: "#98b0c0", accent: "#d8ecf8", band: "#4a7080" },
  "Rose Rayhaan": { label: "Rose Rayhaan", color: "#d8a0b0", accent: "#f0d0dc", band: "#986070" },
  "Burj Vista 1": { label: "Burj Vista 1", color: "#c0d0dc", accent: "#e8f4fc", band: "#7890a0" },
  "Burj Vista 2": { label: "Burj Vista 2", color: "#b4c8d4", accent: "#e0f0f8", band: "#688898" },

  // ---- New York ----
  "Empire State Building": { label: "Empire State", color: "#b8b4a8", accent: "#d8d4c8", band: "#7a7670" },
  "Chrysler Building": { label: "Chrysler", color: "#98a0a8", accent: "#d4c080", band: "#586068" },
  "One World Trade Center": { label: "One WTC", color: "#b8c8d6", accent: "#e0ecf4", band: "#7a90a4" },
  Flatiron: { label: "Flatiron", color: "#c4b8a4", accent: "#e8dcc8", band: "#8a7e6c" },
  "Citigroup Center": { label: "Citigroup Center", color: "#a0c0d0", accent: "#e0f4ff", band: "#508090" },
  "Woolworth Building": { label: "Woolworth", color: "#9a9080", accent: "#d4c8b0", band: "#6a6050" },
  "30 Rockefeller Plaza": { label: "30 Rock", color: "#b0a898", accent: "#e0d8c8", band: "#706858" },
  "Seagram Building": { label: "Seagram", color: "#4a5858", accent: "#c8a84a", band: "#2a3838" },
  "Lever House": { label: "Lever House", color: "#88a8b8", accent: "#e0f0f8", band: "#4a7080" },
  "432 Park Avenue": { label: "432 Park", color: "#e8eef4", accent: "#f8fcff", band: "#a8b4c0" },
  "Hearst Tower": { label: "Hearst Tower", color: "#a8b8c4", accent: "#1a2430", band: "#687888" },
  "MetLife Building": { label: "MetLife", color: "#b8c0c8", accent: "#e8f0f4", band: "#788088" },
  "Brooklyn Bridge": { label: "Brooklyn Bridge", color: "#8a8478", accent: "#d4c8b0", band: "#5a5448" },
  "Statue of Liberty": { label: "Statue of Liberty", color: "#4a8a72", accent: "#c9a84a", band: "#2a6a52" },
  "One Vanderbilt": { label: "One Vanderbilt", color: "#d0d8e0", accent: "#f0f4f8", band: "#8890a0" },
  "Central Park Tower": { label: "Central Park Tower", color: "#e0e8f0", accent: "#f8fcff", band: "#a0b0c0" },
  "111 West 57th Street": { label: "111 W 57th", color: "#c8d0d8", accent: "#e8f0f8", band: "#8898a8" },
  "Bank of America Tower": { label: "BoA Tower", color: "#a8c4b0", accent: "#e0f4e8", band: "#508868" },
  "4 Times Square": { label: "4 Times Square", color: "#8898a8", accent: "#e04040", band: "#586878" },
  "New York Times Building": { label: "NY Times", color: "#b0bcc8", accent: "#e8f0f8", band: "#687888" },
  "8 Spruce Street": { label: "8 Spruce", color: "#c0c8d0", accent: "#e8eef4", band: "#808890" },
  "56 Leonard": { label: "56 Leonard", color: "#d0d6dc", accent: "#f0f4f8", band: "#9098a0" },
  "VIA 57 West": { label: "VIA 57 West", color: "#a8b8a8", accent: "#d8e8d8", band: "#687868" },
  "The Edge": { label: "The Edge", color: "#98a8b8", accent: "#e0ecf4", band: "#586878" },
  One57: { label: "One57", color: "#c8d4e0", accent: "#e8f4fc", band: "#8898a8" },
  "15 Hudson Yards": { label: "15 Hudson Yards", color: "#b0c0d0", accent: "#e0f0f8", band: "#708090" },
  "30 Hudson Yards": { label: "30 Hudson Yards", color: "#c0d0dc", accent: "#f0f8ff", band: "#8090a0" },
  "Goldman Sachs Tower": { label: "Goldman Sachs", color: "#6a7888", accent: "#c9a84a", band: "#3a4858" },
  "40 Wall Street": { label: "40 Wall Street", color: "#a89878", accent: "#d8c8a0", band: "#6a5a40" },
  "70 Pine Street": { label: "70 Pine", color: "#908878", accent: "#d0c4a8", band: "#5a5040" },
  "120 Wall Street": { label: "120 Wall", color: "#8890a0", accent: "#d0d8e0", band: "#505868" },
  "American Copper Buildings": { label: "American Copper", color: "#b87850", accent: "#e0a878", band: "#784828" },
  "The Spiral": { label: "The Spiral", color: "#a8c0b0", accent: "#e0f4e8", band: "#608070" },
};

/** Exact OSM name matches first; then partial / height fallbacks. */
export function getLandmarkIdentity(
  name?: string,
  height = 0,
): LandmarkIdentity | null {
  if (name && IDENTITIES[name]) return IDENTITIES[name];
  if (!name) {
    if (height >= 200) {
      return {
        label: "Skyline Tower",
        color: "#7a92a4",
        accent: "#e8f0f4",
      };
    }
    return null;
  }

  const lower = name.toLowerCase();
  if (lower.includes("hsbc")) return IDENTITIES["HSBC UK"];
  if (lower.includes("citi")) return IDENTITIES.Citi;
  if (lower.includes("canada square")) return IDENTITIES["One Canada Square"];
  if (lower.includes("newfoundland")) return IDENTITIES["Newfoundland Quay"];
  if (lower.includes("pinnacle")) return IDENTITIES["Landmark Pinnacle"];
  if (lower.includes("jp morgan") || lower.includes("jpmorgan")) {
    return IDENTITIES["JP Morgan"];
  }
  if (lower.includes("novotel")) return IDENTITIES["Novotel London Canary Wharf"];
  if (lower.includes("hampton")) return IDENTITIES["Hampton Tower"];
  if (lower.includes("harcourt")) return IDENTITIES["Harcourt Tower"];
  if (lower.includes("wardian") && lower.includes("west")) {
    return IDENTITIES["Hobart Building (Wardian West)"];
  }
  if (lower.includes("wardian") && lower.includes("east")) {
    return IDENTITIES["Bagshaw Building (Wardian East)"];
  }
  // Allow short exact names used in seeded landmarks.
  if (lower === "wardian east") {
    return {
      label: "Wardian East",
      color: "#5a788c",
      accent: "#d8e4ec",
    };
  }
  if (lower === "wardian west") {
    return {
      label: "Wardian West",
      color: "#6a889c",
      accent: "#e8f0f4",
    };
  }
  if (lower.includes("morgan stanley")) return IDENTITIES["Morgan Stanley"];
  if (lower.includes("credit suisse") || lower.includes("cabot square")) {
    return IDENTITIES["Credit Suisse"];
  }
  if (lower.includes("barclays")) return IDENTITIES.Barclays;
  if (lower.includes("hilton")) return IDENTITIES["Hilton London Canary Wharf"];
  if (lower.includes("cabot place")) return IDENTITIES["Cabot Place West"];
  if (lower.includes("northern trust")) return IDENTITIES["Northern Trust"];
  if (lower.includes("sierra quebec") || lower.includes("sqb")) {
    return IDENTITIES["Sierra Quebec Bravo"];
  }
  if (lower.includes("wintergarden") && lower.includes("east")) {
    return IDENTITIES["East Wintergarden"];
  }
  if (lower.includes("wintergarden") && lower.includes("west")) {
    return IDENTITIES["West Wintergarden"];
  }
  if (lower.includes("westferry")) return IDENTITIES["7 Westferry Circus"];
  if (lower.includes("west india quay")) return IDENTITIES["1 West India Quay"];
  if (lower.includes("cascades")) return IDENTITIES["Cascades Tower"];
  if (lower.includes("berkeley")) return IDENTITIES["Berkeley Tower"];
  if (lower.includes("bank of america")) return IDENTITIES["Bank of America"];
  if (lower.includes("south quay")) return IDENTITIES["South Quay Plaza"];
  if (lower.includes("landmark east")) return IDENTITIES["Landmark East Tower"];
  if (lower.includes("landmark west")) return IDENTITIES["Landmark West Tower"];

  if (height >= 140) {
    return {
      label: name.length > 22 ? `${name.slice(0, 20)}…` : name,
      color: "#7a90a0",
      accent: "#e8f0f8",
      band: "#5a7080",
    };
  }

  return null;
}

export function isIdentifiableLandmark(name?: string, height = 0): boolean {
  return getLandmarkIdentity(name, height) !== null;
}
