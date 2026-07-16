export type GlazeResultSearchFacet = {
  group: string;
  intent: string;
  fields: string[];
};

export type GlazeResultDetailSection = {
  title: string;
  summary: string;
  evidence: string[];
};

export type FiringDetailLevel = {
  level: string;
  label: string;
  example: string;
};

export const GLAZE_RESULT_SEARCH_FACETS: GlazeResultSearchFacet[] = [
  {
    group: "Social signal",
    intent: "Start from the conversations people are already having.",
    fields: ["Keywords", "Author", "Has image", "Recent comments", "Likes and saves"],
  },
  {
    group: "Visual result",
    intent: "Find surfaces by what they look like before asking for chemistry.",
    fields: ["Color family", "Surface", "Opacity", "Defects", "Image result groups"],
  },
  {
    group: "Ceramic context",
    intent: "Search by the variables potters remember from a firing.",
    fields: ["Cone range", "Atmosphere", "Kiln type", "Clay body", "Application method"],
  },
  {
    group: "Recipe source",
    intent: "Support studio formulas and purchased commercial glaze profiles.",
    fields: ["Studio recipe", "Commercial supplier", "Recipe version", "Public recipe", "Private recipe"],
  },
  {
    group: "Chemistry",
    intent: "Give researchers the depth they expect without making it the default.",
    fields: ["Materials included", "Oxides included", "Oxides excluded", "UMF region", "Expansion risk"],
  },
  {
    group: "Evidence quality",
    intent: "Make analytics honest about how much context is known.",
    fields: ["Recipe known", "Firing known", "Clay known", "Environment known", "Live tracked"],
  },
];

export const GLAZE_RESULT_DETAIL_SECTIONS: GlazeResultDetailSection[] = [
  {
    title: "Post story",
    summary: "The social wrapper with caption, author, comments, saves, and shares.",
    evidence: ["Caption", "Comments", "Author", "Visibility"],
  },
  {
    title: "Image result groups",
    summary: "Specific areas in photos that can each link to their own ceramic records.",
    evidence: ["Photo", "Result group", "Glaze tags", "Clay tags"],
  },
  {
    title: "Glaze profile",
    summary: "A studio recipe or commercial glaze with versions and privacy-aware public previews.",
    evidence: ["Recipe version", "Supplier", "Surface", "Color"],
  },
  {
    title: "Firing profile",
    summary: "A sparse memory, structured firing, live tracker, or research-grade firing record.",
    evidence: ["Cone", "Atmosphere", "Kiln", "Schedule"],
  },
  {
    title: "Clay body profile",
    summary: "The substrate record that explains fit, color response, absorption, and texture.",
    evidence: ["Body type", "Cone range", "Absorption", "Shrinkage"],
  },
  {
    title: "Analytics",
    summary: "Modern comparisons across visual evidence, firing variables, recipes, and materials.",
    evidence: ["Confidence", "Similar results", "Defects", "UMF"],
  },
];

export const FIRING_DETAIL_LEVELS: FiringDetailLevel[] = [
  {
    level: "Memory",
    label: "Historic or incomplete",
    example: "Cone 7 gas oxidation, winter 2024",
  },
  {
    level: "Structured",
    label: "Searchable basics",
    example: "Cone, kiln type, atmosphere, clay, glaze, and notes",
  },
  {
    level: "Documented",
    label: "Repeatable process",
    example: "Schedule, holds, weather, damper notes, position, and defects",
  },
  {
    level: "Live tracked",
    label: "Current firing",
    example: "Readings, curve, environment, notes, and cleanup after unloading",
  },
  {
    level: "Research grade",
    label: "Replicable evidence",
    example: "Recipe versions, material lots, application, kiln curve, and comparisons",
  },
];

export const FLUX_FIRE_GLAZY_REVIEW_PRINCIPLES = [
  "Social-first posting should be the front door to the database.",
  "Image result groups are the evidence layer that connects posts to ceramic records.",
  "Chemistry, UMF, oxides, and kiln schedules should be available as progressive depth.",
  "Commercial glazes and studio recipes must both fit naturally.",
  "Incomplete historic firing data is valid and should remain searchable.",
  "Analytics should show confidence and context before making comparisons.",
] as const;
