export const PRODUCT = {
  name: "Kilnbook",
  tagline: "A calm record of every firing, glaze, clay body, and result.",
  description:
    "Kilnbook helps ceramic artists preserve firing history, connect glaze results to real conditions, and share selected knowledge without exposing private recipes.",
  supportEmail: "support@kilnbook.example",
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
  "Firings",
  "Add",
  "Library",
  "Profile",
] as const;

export type PrimaryNavigationItem = (typeof PRIMARY_NAVIGATION)[number];

