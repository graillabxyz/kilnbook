export const PRODUCT = {
  name: "Flux and Fire",
  tagline: "A calm record of every firing, glaze, clay body, and result.",
  description:
    "Flux and Fire helps ceramic artists, studios, educators, researchers, and collectives preserve firing history, connect glaze results to real conditions, and share selected knowledge without exposing private recipes.",
  supportEmail: "support@fluxandfire.example",
} as const;

export const PRIMARY_NAVIGATION = [
  "Home",
  "Dashboard",
  "Firings",
  "Glazes",
  "Clay Bodies",
  "Kilns",
  "Explore",
  "Messages",
  "Analytics",
  "Profile",
  "Settings",
] as const;

export const MOBILE_NAVIGATION = [
  "Home",
  "Explore",
  "Add",
  "Search",
  "Profile",
] as const;

export type PrimaryNavigationItem = (typeof PRIMARY_NAVIGATION)[number];
