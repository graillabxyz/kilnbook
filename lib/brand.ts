export const BRAND_ASSETS = {
  logo: "/flux-and-fire-logo.svg",
  wordmark: "/flux-and-fire-wordmark.svg",
  favicon: "/favicon.svg",
} as const;

export const BRAND_COLORS = {
  background: "#f6f2ec",
  surface: "#fffdf9",
  surfaceStrong: "#ffffff",
  ink: "#211d1a",
  muted: "#746b62",
  line: "#ded5c9",
  lineStrong: "#c8b8a9",
  terracotta: "#a34324",
  cobalt: "#315d67",
  moss: "#657b54",
  clay: "#c9794f",
  sun: "#d4a24c",
  iron: "#8f4f3a",
  stone: "#b9855f",
  ashBlue: "#9bb4bd",
  chartGrid: "#ddd5ca",
} as const;

export const BRAND_PROFILE_COLORS = [
  BRAND_COLORS.terracotta,
  BRAND_COLORS.cobalt,
  BRAND_COLORS.moss,
  BRAND_COLORS.iron,
  BRAND_COLORS.stone,
] as const;

export const BRAND_CHART_COLORS = {
  grid: BRAND_COLORS.chartGrid,
  actual: BRAND_COLORS.iron,
  target: BRAND_COLORS.cobalt,
  barPrimary: BRAND_COLORS.cobalt,
  barSecondary: BRAND_COLORS.iron,
} as const;
