export type ProjectType = "Residential" | "Cultural" | "Workplace";

export type Project = {
  id: string;
  name: string;
  location: string;
  year: number;
  type: ProjectType;
  area: string;
  summary: string;
  facts: [string, string][];
  palette: [string, string, string];
  shape: "terrace" | "vault" | "tower" | "courtyard";
};

/** Placeholder projects. Replace with your own work. */
export const projects: Project[] = [
  {
    id: "salt-house",
    name: "Salt House",
    location: "Coastal Norfolk",
    year: 2025,
    type: "Residential",
    area: "310 m²",
    summary:
      "A low house of lime render and oak that steps down toward the marsh. Deep reveals frame the horizon and keep summer sun off the living floor.",
    facts: [
      ["Structure", "Cross-laminated timber"],
      ["Envelope", "Lime render, oak shingles"],
      ["Energy", "Passive solar, ground source heat"],
    ],
    palette: ["#d9cdb8", "#b4532a", "#1d1b18"],
    shape: "terrace",
  },
  {
    id: "quarry-library",
    name: "Quarry Library",
    location: "Peak District",
    year: 2024,
    type: "Cultural",
    area: "1,240 m²",
    summary:
      "A reading room carved into a disused quarry face. A single vaulted roof gathers north light and turns the stone wall into the building's interior.",
    facts: [
      ["Structure", "Precast concrete vault"],
      ["Envelope", "Reclaimed gritstone"],
      ["Programme", "Library, archive, study rooms"],
    ],
    palette: ["#cfc6b4", "#5f6b4e", "#2a2824"],
    shape: "vault",
  },
  {
    id: "canal-works",
    name: "Canal Works",
    location: "Birmingham",
    year: 2023,
    type: "Workplace",
    area: "4,800 m²",
    summary:
      "The retrofit of a 1920s brass foundry into studios and workshops. Original trusses stay exposed; a new timber floor plate floats free of the brick shell.",
    facts: [
      ["Approach", "Retrofit and reuse"],
      ["Structure", "Retained steel, glulam infill"],
      ["Programme", "Studios, makerspace, café"],
    ],
    palette: ["#d8c9b1", "#8a4a2c", "#23211e"],
    shape: "tower",
  },
  {
    id: "orchard-court",
    name: "Orchard Court",
    location: "Kent",
    year: 2022,
    type: "Residential",
    area: "2,150 m²",
    summary:
      "Twelve homes arranged around a shared orchard. Each house has a dual aspect, a covered threshold and a garden room that opens onto the common ground.",
    facts: [
      ["Homes", "12 households"],
      ["Envelope", "Brick, timber cladding"],
      ["Landscape", "Heritage apple orchard"],
    ],
    palette: ["#e0d6c2", "#5f6b4e", "#3a3530"],
    shape: "courtyard",
  },
];

export const projectTypes: ("All" | ProjectType)[] = ["All", "Residential", "Cultural", "Workplace"];
