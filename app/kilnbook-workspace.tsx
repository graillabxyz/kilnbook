"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleX,
  ClipboardList,
  CloudSun,
  Flame,
  Gauge,
  Heart,
  Image as ImageIcon,
  Inbox,
  Layers3,
  LogOut,
  Mail,
  LockKeyhole,
  MessageCircle,
  Microscope,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Thermometer,
  Upload,
  UserRound,
  Wind,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";
import { BRAND_ASSETS, BRAND_CHART_COLORS, BRAND_COLORS } from "@/lib/brand";
import type {
  AtmosphereType,
  ClayBodyProfile,
  FiringEnvironmentRecord,
  FiringRecord,
  FiringType,
  GlazeRecipeVersion,
  GlazeProfile,
  KilnLocation,
  KilnProfile,
  Post,
  Profile,
  RecipeIngredient,
  Visibility,
} from "@/lib/domain";
import { getEntitlementDecision } from "@/lib/entitlements";
import { calculateRateOfChange, estimateFiringDuration } from "@/lib/firing-calculator";
import { rankPopularPosts } from "@/lib/feed-ranking";
import { PRODUCT, PRIMARY_NAVIGATION, type PrimaryNavigationItem } from "@/lib/product";
import type { KilnbookWorkspaceSnapshot } from "@/lib/services/kilnbook-repository";
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
  signInWithGoogle,
  signOutOfSupabase,
} from "@/lib/supabase/client";
import { profileFromSupabaseUser } from "@/lib/supabase/auth-profile";
import { BUSINESS_LAUNCH_OFFER, formatPlanLabel } from "@/lib/subscriptions";
import { formatTemperature } from "@/lib/units";

type View = PrimaryNavigationItem | "Library" | "Add";
type AddVisibility = Extract<Visibility, "private" | "followers" | "public">;
type AuthStatus =
  | { state: "loading"; message: string }
  | { state: "signed-in"; message: string }
  | { state: "signed-out"; message: string }
  | { state: "unconfigured"; message: string }
  | { state: "error"; message: string };
type AddKind = "glaze_recipe" | "live_firing" | "previous_firing" | "glaze_result";
type AddDraft = {
  id: string;
  kind: AddKind;
  visibility: AddVisibility;
  title: string;
  detail: string;
  createdAt: string;
};
type ActiveAddFlow = {
  kind: AddKind;
  visibility: AddVisibility;
  startedAt: string;
  firingId?: string;
};
type PreviousFiringPayload = {
  title: string;
  kilnId: string;
  glazeId: string;
  clayBodyId: string;
  targetTemperatureC: number;
  targetCone: string;
  actualStartAt: string;
  visibility: AddVisibility;
  notes: string;
};
type GlazeRecipePayload = {
  title: string;
  coneRange: string;
  baseMaterial: string;
  accentMaterial: string;
  visibility: AddVisibility;
};
type GlazeResultPayload = {
  title: string;
  firingId: string;
  glazeId: string;
  clayBodyId: string;
  rating: number;
  visibility: AddVisibility;
  imageName?: string;
};
type FiringEnvironmentPayload = Omit<FiringEnvironmentRecord, "id" | "firingId">;
type LiveFiringSetupPayload = {
  kilnId: string;
  firingType: FiringType;
  fuelType: string;
  targetTemperatureC: number;
  targetCone: string;
  atmosphere: AtmosphereType;
  environment: FiringEnvironmentPayload;
};
type CreatedGlazeRecord = {
  profile: GlazeProfile;
  recipeVersion: GlazeRecipeVersion;
};
type GlazeIngredientDraft = {
  id: string;
  materialName: string;
  percentage: string;
  role: RecipeIngredient["role"];
};
type SupplierGlazeCatalogEntry = {
  id: string;
  supplier: string;
  productLine: string;
  name: string;
  glazeType: string;
  surface: string;
  colorFamily: string[];
  opacity: string;
  coneRange: string;
  firingRange: string;
  atmosphereCompatibility: AtmosphereType[];
  heroImageColor: string;
  description: string;
  applicationNotes: string;
};
type ClayBodyCatalogEntry = {
  id: string;
  manufacturer: string;
  supplier: string;
  name: string;
  bodyType: string;
  rawColor: string;
  firedColor: string;
  texture: string;
  grogPercentage?: number;
  absorptionPercentage?: number;
  shrinkagePercentage?: number;
  coneRange: string;
  atmosphereSuitability: AtmosphereType[];
  imageColor: string;
  notes: string;
};
type KilnCatalogEntry = {
  id: string;
  manufacturer: string;
  model: string;
  name: string;
  kilnType: FiringType;
  fuelType: string;
  controllerType: string;
  usableVolumeLiters: number;
  maxTemperatureC: number;
  recommendedConeRange: string;
  defaultLocation: KilnLocation;
  powerKw?: number;
  notes: string;
};

type MobileNavItem =
  | { label: "Home" | "Explore" | "Profile"; view: View; icon: LucideIcon }
  | { label: "Add"; icon: LucideIcon; action: "add" }
  | { label: "Search"; icon: LucideIcon; action: "search" };

const MOBILE_SCROLL_VIEWS = new Set<View>(["Home", "Explore", "Profile", "Settings", "Add"]);
const FIRING_TYPE_OPTIONS: Array<{ value: FiringType; label: string }> = [
  { value: "electric", label: "Electric" },
  { value: "gas", label: "Gas" },
  { value: "wood", label: "Wood" },
  { value: "soda", label: "Soda" },
  { value: "salt", label: "Salt" },
  { value: "raku", label: "Raku" },
  { value: "pit", label: "Pit" },
  { value: "saggar", label: "Saggar" },
  { value: "experimental", label: "Experimental" },
  { value: "other", label: "Other" },
];
const ATMOSPHERE_OPTIONS: Array<{ value: AtmosphereType; label: string }> = [
  { value: "oxidation", label: "Oxidation" },
  { value: "neutral", label: "Neutral" },
  { value: "light_reduction", label: "Light reduction" },
  { value: "reduction", label: "Reduction" },
  { value: "heavy_reduction", label: "Heavy reduction" },
  { value: "localized_reduction", label: "Localized reduction" },
  { value: "carbon_trapping", label: "Carbon trapping" },
  { value: "flashing", label: "Flashing" },
  { value: "soda", label: "Soda" },
  { value: "salt", label: "Salt" },
  { value: "unknown", label: "Unknown" },
  { value: "other", label: "Other" },
];
const KILN_LOCATION_OPTIONS: Array<{ value: KilnLocation; label: string }> = [
  { value: "indoors", label: "Indoors" },
  { value: "semi_enclosed", label: "Semi-enclosed" },
  { value: "outdoors_uncovered", label: "Outdoors" },
  { value: "outdoors_partially_covered", label: "Outdoors covered" },
  { value: "outdoors_fully_covered_open_sided", label: "Covered open-sided" },
  { value: "other", label: "Other" },
];
const PROFILE_SWATCHES = [
  BRAND_COLORS.terracotta,
  BRAND_COLORS.cobalt,
  BRAND_COLORS.ashBlue,
  BRAND_COLORS.sun,
  BRAND_COLORS.moss,
  BRAND_COLORS.stone,
  BRAND_COLORS.iron,
];
const GLAZE_SUPPLIER_CATALOG: SupplierGlazeCatalogEntry[] = [
  {
    id: "amaco-potters-choice-blue-rutile",
    supplier: "AMACO",
    productLine: "Potter's Choice",
    name: "PC-20 Blue Rutile",
    glazeType: "commercial",
    surface: "glossy variegated blue",
    colorFamily: ["blue", "brown", "cream"],
    opacity: "variegated",
    coneRange: "5-6",
    firingRange: "Cone 5-6",
    atmosphereCompatibility: ["oxidation"],
    heroImageColor: BRAND_COLORS.ashBlue,
    description: "Commercial brush-on glaze profile for tracking bought glaze results.",
    applicationNotes: "Record coats, layering, clay body, and firing schedule with each result.",
  },
  {
    id: "amaco-celadon-snow",
    supplier: "AMACO",
    productLine: "Celadon",
    name: "C-10 Snow",
    glazeType: "commercial",
    surface: "glossy translucent white",
    colorFamily: ["white", "clear"],
    opacity: "translucent",
    coneRange: "5-6",
    firingRange: "Cone 5-6",
    atmosphereCompatibility: ["oxidation"],
    heroImageColor: "#ede8dd",
    description: "Commercial celadon glaze profile for repeatable test-tile tracking.",
    applicationNotes: "Note number of brushed coats and whether it is used alone or layered.",
  },
  {
    id: "mayco-stoneware-light-flux",
    supplier: "Mayco",
    productLine: "Stoneware",
    name: "SW-401 Light Flux",
    glazeType: "commercial",
    surface: "glossy flowing flux",
    colorFamily: ["cream", "tan"],
    opacity: "translucent",
    coneRange: "5-10",
    firingRange: "Cone 5-10",
    atmosphereCompatibility: ["oxidation", "reduction"],
    heroImageColor: BRAND_COLORS.sun,
    description: "Commercial flux profile for documenting combinations and movement.",
    applicationNotes: "Track placement, overlap order, and cleanup clearance near foot rings.",
  },
  {
    id: "mayco-stoneware-galaxy",
    supplier: "Mayco",
    productLine: "Stoneware",
    name: "SW-156 Galaxy",
    glazeType: "commercial",
    surface: "glossy speckled dark",
    colorFamily: ["black", "blue", "white"],
    opacity: "opaque",
    coneRange: "5-10",
    firingRange: "Cone 5-10",
    atmosphereCompatibility: ["oxidation", "reduction"],
    heroImageColor: "#1f1b19",
    description: "Commercial stoneware glaze profile for comparing clay body response.",
    applicationNotes: "Record coat count and whether the glaze breaks over texture.",
  },
  {
    id: "coyote-iron-saturate",
    supplier: "Coyote",
    productLine: "Mid-fire",
    name: "Iron Saturate",
    glazeType: "commercial",
    surface: "glossy iron red",
    colorFamily: ["red", "brown", "black"],
    opacity: "opaque",
    coneRange: "5-6",
    firingRange: "Cone 5-6",
    atmosphereCompatibility: ["oxidation"],
    heroImageColor: BRAND_COLORS.iron,
    description: "Commercial mid-fire profile for documenting color breaks and layering.",
    applicationNotes: "Track thickness, clay color, and cooling schedule for each result.",
  },
];
const CLAY_BODY_CATALOG: ClayBodyCatalogEntry[] = [
  {
    id: "laguna-b-mix-5",
    manufacturer: "Laguna",
    supplier: "Laguna distributor",
    name: "B-Mix 5",
    bodyType: "stoneware",
    rawColor: "light gray",
    firedColor: "warm white",
    texture: "smooth",
    absorptionPercentage: 2,
    shrinkagePercentage: 12,
    coneRange: "5-6",
    atmosphereSuitability: ["oxidation", "reduction"],
    imageColor: "#ded8cd",
    notes: "Commercial clay body profile for tracking glaze fit and fired color.",
  },
  {
    id: "laguna-speckled-buff",
    manufacturer: "Laguna",
    supplier: "Laguna distributor",
    name: "Speckled Buff",
    bodyType: "stoneware",
    rawColor: "buff gray",
    firedColor: "buff with iron speckle",
    texture: "medium speckle",
    grogPercentage: 3,
    absorptionPercentage: 2,
    shrinkagePercentage: 12,
    coneRange: "5-6",
    atmosphereSuitability: ["oxidation", "reduction"],
    imageColor: "#b9855f",
    notes: "Good candidate for comparing clear, white, and breaking glazes.",
  },
  {
    id: "standard-266",
    manufacturer: "Standard Ceramic",
    supplier: "Standard Ceramic distributor",
    name: "266 Dark Brown",
    bodyType: "stoneware",
    rawColor: "dark brown",
    firedColor: "deep brown",
    texture: "smooth",
    absorptionPercentage: 1.5,
    shrinkagePercentage: 12,
    coneRange: "4-6",
    atmosphereSuitability: ["oxidation"],
    imageColor: "#4b3028",
    notes: "Commercial clay body profile for testing opacity and liner glaze fit.",
  },
  {
    id: "aardvark-coleman-porcelain",
    manufacturer: "Aardvark",
    supplier: "Aardvark distributor",
    name: "Coleman Porcelain",
    bodyType: "porcelain",
    rawColor: "white",
    firedColor: "bright white",
    texture: "smooth",
    absorptionPercentage: 0.8,
    shrinkagePercentage: 14,
    coneRange: "5-10",
    atmosphereSuitability: ["oxidation", "reduction"],
    imageColor: "#f2eee6",
    notes: "Porcelain profile for celadon, ash, and translucent glaze testing.",
  },
];
const KILN_CATALOG: KilnCatalogEntry[] = [
  {
    id: "skutt-km-1027",
    manufacturer: "Skutt",
    model: "KM-1027",
    name: "Skutt KM-1027",
    kilnType: "electric",
    fuelType: "electric",
    controllerType: "digital controller",
    usableVolumeLiters: 198,
    maxTemperatureC: 1315,
    recommendedConeRange: "06-10",
    defaultLocation: "indoors",
    powerKw: 10.2,
    notes: "Electric kiln preset. Add your actual voltage, element age, and venting notes.",
  },
  {
    id: "skutt-km-1227",
    manufacturer: "Skutt",
    model: "KM-1227",
    name: "Skutt KM-1227",
    kilnType: "electric",
    fuelType: "electric",
    controllerType: "digital controller",
    usableVolumeLiters: 262,
    maxTemperatureC: 1315,
    recommendedConeRange: "06-10",
    defaultLocation: "indoors",
    powerKw: 11.5,
    notes: "Large electric kiln preset for cone 6 and cone 10 firing logs.",
  },
  {
    id: "ll-easy-fire-e23t",
    manufacturer: "L&L",
    model: "Easy-Fire e23T",
    name: "L&L Easy-Fire e23T",
    kilnType: "electric",
    fuelType: "electric",
    controllerType: "digital controller",
    usableVolumeLiters: 187,
    maxTemperatureC: 1315,
    recommendedConeRange: "06-10",
    defaultLocation: "indoors",
    powerKw: 9.6,
    notes: "Electric kiln preset. Record actual controller, vent, and thermocouple setup.",
  },
  {
    id: "bailey-gas-shuttle",
    manufacturer: "Bailey",
    model: "Gas shuttle",
    name: "Bailey Gas Shuttle",
    kilnType: "gas",
    fuelType: "natural gas",
    controllerType: "manual pyrometer",
    usableVolumeLiters: 510,
    maxTemperatureC: 1320,
    recommendedConeRange: "6-11",
    defaultLocation: "semi_enclosed",
    notes: "Gas kiln preset for reduction tracking, damper notes, and pressure readings.",
  },
];

function formatOptionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

function isOutdoorKilnLocation(location: KilnLocation) {
  return location !== "indoors";
}

function decimalInputValue(value: number | undefined) {
  return value === undefined ? "" : String(Math.round(value * 10) / 10);
}

function parseOptionalNumber(value: string) {
  const parsed = Number(value);
  return value.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
}

function parseRequiredNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createClientRecordId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

function colorFamiliesFromText(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function atmosphereValuesFromForm(form: HTMLFormElement) {
  const values = new FormData(form).getAll("atmosphere");
  return values.filter((value): value is AtmosphereType =>
    ATMOSPHERE_OPTIONS.some((option) => option.value === value),
  );
}

function recipeFingerprint(ingredients: RecipeIngredient[]) {
  if (ingredients.length === 0) return `commercial-${Date.now()}`;
  return ingredients
    .map((ingredient) =>
      [
        ingredient.role,
        ingredient.materialName.trim().toLowerCase(),
        Math.round(ingredient.percentage * 1000) / 1000,
      ].join(":"),
    )
    .join("|");
}

async function getWritableSupabaseClient() {
  if (!isSupabaseBrowserConfigured()) return null;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) return null;
  return { supabase, userId: data.session.user.id };
}

async function persistGlazeRecord(record: CreatedGlazeRecord) {
  const writable = await getWritableSupabaseClient();
  if (!writable) return;
  const { supabase, userId } = writable;
  const { profile, recipeVersion } = record;
  const totalPercentage = recipeVersion.ingredients.reduce(
    (sum, ingredient) => sum + ingredient.percentage,
    0,
  );
  const { error: glazeError } = await supabase.from("glazes").insert({
    id: profile.id,
    owner_id: userId,
    name: profile.name,
    creator_attribution: profile.creatorAttribution,
    source: profile.source,
    glaze_type: profile.glazeType,
    surface: profile.surface,
    color_family: profile.colorFamily,
    opacity: profile.opacity,
    firing_range: profile.firingRange,
    cone_range: profile.coneRange,
    atmosphere_compatibility: profile.atmosphereCompatibility,
    recipe_visibility: profile.recipeVisibility,
    profile_visibility: profile.profileVisibility,
    description: profile.description,
    application_notes: profile.applicationNotes,
  });
  if (glazeError) throw glazeError;

  const { error: recipeError } = await supabase.from("glaze_recipe_versions").insert({
    id: recipeVersion.id,
    glaze_id: profile.id,
    version_number: recipeVersion.versionNumber,
    effective_date: recipeVersion.effectiveDate,
    batch_size_grams: recipeVersion.batchSizeGrams,
    total_dry_weight_grams: recipeVersion.totalDryWeightGrams,
    water_amount_grams: recipeVersion.waterAmountGrams,
    source_attribution: recipeVersion.sourceAttribution,
    change_summary: recipeVersion.changeSummary,
    calculated_total_percentage: totalPercentage,
    recipe_fingerprint: recipeFingerprint(recipeVersion.ingredients),
    visibility: recipeVersion.visibility,
    notes: recipeVersion.privateNotes ?? "",
  });
  if (recipeError) throw recipeError;

  if (recipeVersion.ingredients.length === 0) return;
  const { error: ingredientError } = await supabase.from("glaze_recipe_ingredients").insert(
    recipeVersion.ingredients.map((ingredient, index) => ({
      recipe_version_id: recipeVersion.id,
      material_id: ingredient.materialId.startsWith("material-") ? null : ingredient.materialId,
      material_name_snapshot: ingredient.materialName,
      ingredient_role: ingredient.role,
      percentage: ingredient.percentage,
      weight_grams: ingredient.weightGrams,
      display_order: index + 1,
    })),
  );
  if (ingredientError) throw ingredientError;
}

async function persistClayBodyProfile(profile: ClayBodyProfile) {
  const writable = await getWritableSupabaseClient();
  if (!writable) return;
  const { supabase, userId } = writable;
  const { error } = await supabase.from("clay_bodies").insert({
    id: profile.id,
    owner_id: userId,
    name: profile.name,
    manufacturer: profile.manufacturer,
    supplier: profile.supplier,
    body_type: profile.bodyType,
    raw_color: profile.rawColor,
    fired_color: profile.firedColor,
    texture: profile.texture,
    grog_percentage: profile.grogPercentage,
    absorption_percentage: profile.absorptionPercentage,
    shrinkage_percentage: profile.shrinkagePercentage,
    cone_range: profile.coneRange,
    maturation_range: profile.coneRange,
    atmosphere_suitability: profile.atmosphereSuitability,
    recipe_visibility: profile.recipeVisibility,
    profile_visibility: profile.profileVisibility,
    notes: profile.notes,
  });
  if (error) throw error;
}

async function persistKilnProfile(profile: KilnProfile) {
  const writable = await getWritableSupabaseClient();
  if (!writable) return;
  const { supabase, userId } = writable;
  const { error } = await supabase.from("kilns").insert({
    id: profile.id,
    owner_id: userId,
    name: profile.name,
    manufacturer: profile.manufacturer,
    model: profile.model,
    kiln_type: profile.kilnType,
    fuel_type: profile.fuelType,
    controller_type: profile.controllerType,
    usable_volume_liters: profile.usableVolumeLiters,
    maximum_temperature_c: profile.maxTemperatureC,
    recommended_cone_range: profile.recommendedConeRange,
    default_location: profile.defaultLocation,
    power_kw: profile.powerKw,
    active: profile.active,
    visibility: profile.visibility,
    notes: profile.notes,
  });
  if (error) throw error;
}

function windDirectionFromDegrees(value: number | undefined) {
  if (value === undefined) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(value / 45) % directions.length];
}

function weatherCodeLabel(code: number | undefined) {
  if (code === undefined) return "Current conditions";
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storm";
  return "Current conditions";
}

const firingFormSchema = z.object({
  title: z.string().min(3, "Give the firing a clear title."),
  kilnId: z.string().min(1, "Choose a kiln."),
  clayBodyId: z.string().min(1, "Choose at least one clay body."),
  glazeId: z.string().min(1, "Choose at least one glaze."),
  targetTemperatureC: z.coerce.number().min(600).max(1400),
  targetCone: z.string().min(1),
  location: z.enum(["indoors", "semi_enclosed", "outdoors_partially_covered"]),
  humidity: z.coerce.number().min(0).max(100),
  windSpeedKph: z.coerce.number().min(0).max(150),
});

type FiringFormValues = z.infer<typeof firingFormSchema>;
type FiringFormInput = z.input<typeof firingFormSchema>;

const navIcons: Record<PrimaryNavigationItem, typeof BookOpen> = {
  Home: BookOpen,
  Dashboard: BarChart3,
  Firings: Flame,
  Glazes: Layers3,
  "Clay Bodies": Microscope,
  Kilns: Gauge,
  Explore: Search,
  Messages: Inbox,
  Analytics: Activity,
  Profile: UserRound,
  Settings: Settings,
};

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]));
}

function isMobileAppViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
}

function initialAuthStatus(): AuthStatus {
  return isSupabaseBrowserConfigured()
    ? {
        state: "loading",
        message: "Checking Supabase session.",
      }
    : {
        state: "unconfigured",
        message:
          "Supabase browser client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      };
}

function initialFeedTab(): "Following" | "Popular" {
  if (typeof window === "undefined") return "Following";
  const saved = window.localStorage.getItem("flux-and-fire.feed-tab");
  return saved === "Following" || saved === "Popular" ? saved : "Following";
}

export function KilnbookWorkspace({
  snapshot,
}: {
  snapshot: KilnbookWorkspaceSnapshot;
}) {
  const [view, setView] = useState<View>("Home");
  const [viewer, setViewer] = useState<Profile>(snapshot.viewer);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(initialAuthStatus);
  const [feedTab, setFeedTab] = useState<"Following" | "Popular">(initialFeedTab);
  const [firings, setFirings] = useState<FiringRecord[]>(snapshot.firings);
  const [glazes, setGlazes] = useState<GlazeProfile[]>(snapshot.glazes);
  const [glazeRecipeVersions, setGlazeRecipeVersions] = useState<GlazeRecipeVersion[]>(
    snapshot.glazeRecipeVersions,
  );
  const [clayBodies, setClayBodies] = useState<ClayBodyProfile[]>(snapshot.clayBodies);
  const [kilns, setKilns] = useState<KilnProfile[]>(snapshot.kilns);
  const [environmentRecords, setEnvironmentRecords] = useState<FiringEnvironmentRecord[]>(
    snapshot.firingEnvironmentRecords,
  );
  const [liveReadings, setLiveReadings] = useState(snapshot.firingLogPoints);
  const [selectedFiringId, setSelectedFiringId] = useState(snapshot.firings[0]?.id ?? "");
  const [imageTags, setImageTags] = useState(snapshot.images[1]?.glazeIds ?? []);
  const [query, setQuery] = useState("");
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const [addDrafts, setAddDrafts] = useState<AddDraft[]>([]);
  const [activeAddFlow, setActiveAddFlow] = useState<ActiveAddFlow | null>(null);
  const kilnById = useMemo(() => createRecordMap(kilns), [kilns]);
  const glazeById = useMemo(() => createRecordMap(glazes), [glazes]);
  const firingById = useMemo(() => createRecordMap(firings), [firings]);
  const environmentByFiringId = useMemo(
    () => new Map(environmentRecords.map((record) => [record.firingId, record])),
    [environmentRecords],
  );
  const popularPosts = useMemo(() => rankPopularPosts(snapshot.posts), [snapshot.posts]);

  useEffect(() => {
    let active = true;

    if (!isSupabaseBrowserConfigured()) {
      return () => {
        active = false;
      };
    }

    const supabase = createSupabaseBrowserClient();
    const profileForUser = (userId: string) =>
      snapshot.profiles.find((profile) => profile.id === userId) ?? snapshot.viewer;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        if (data.session?.user) {
          setViewer(profileFromSupabaseUser(data.session.user, profileForUser(data.session.user.id)));
          setAuthStatus({
            state: "signed-in",
            message: "Signed in with Supabase Auth.",
          });
          return;
        }
        setViewer(snapshot.viewer);
        setAuthStatus({
          state: "signed-out",
          message: "Signed out. Public content is visible; sign in to create and save records.",
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setViewer(snapshot.viewer);
        setAuthStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Unable to read Supabase session.",
        });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setViewer(profileFromSupabaseUser(session.user, profileForUser(session.user.id)));
        setAuthStatus({
          state: "signed-in",
          message: "Signed in with Supabase Auth.",
        });
        return;
      }
      setViewer(snapshot.viewer);
      setAuthStatus({
        state: "signed-out",
        message: "Signed out. Public content is visible; sign in to create and save records.",
      });
    });
    const unsubscribe = () => data.subscription.unsubscribe();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [snapshot.profiles, snapshot.viewer]);

  useEffect(() => {
    window.localStorage.setItem("flux-and-fire.feed-tab", feedTab);
  }, [feedTab]);

  const selectedFiring = useMemo(
    () => firingById.get(selectedFiringId) ?? firings[0],
    [firingById, firings, selectedFiringId],
  );
  const selectedKiln = useMemo(
    () => (selectedFiring ? kilnById.get(selectedFiring.kilnId) : undefined),
    [kilnById, selectedFiring],
  );
  const activeFiring = useMemo(
    () => (activeAddFlow?.firingId ? firingById.get(activeAddFlow.firingId) : undefined),
    [activeAddFlow, firingById],
  );
  const activeEnvironment = useMemo(
    () =>
      activeAddFlow?.firingId
        ? environmentByFiringId.get(activeAddFlow.firingId)
        : undefined,
    [activeAddFlow, environmentByFiringId],
  );

  const ratePoints = useMemo(
    () =>
      calculateRateOfChange(
        liveReadings.filter((point) => point.firingId === selectedFiring?.id),
      ),
    [liveReadings, selectedFiring?.id],
  );
  const selectedEnvironment = useMemo(
    () => (selectedFiring ? environmentByFiringId.get(selectedFiring.id) : undefined),
    [environmentByFiringId, selectedFiring],
  );

  const estimate = useMemo(
    () =>
      estimateFiringDuration({
        kilnType: selectedFiring?.firingType ?? "electric",
        fuelType: selectedFiring?.firingType === "electric" ? "electric" : "gas",
        kilnVolumeLiters: selectedKiln?.usableVolumeLiters ?? 262,
        powerKw: selectedKiln?.powerKw ?? 11.5,
        kilnAgeYears: 6,
        loadFullnessPercentage: selectedFiring?.loadFullnessPercentage ?? 65,
        wareDensity: "medium",
        averageWallThicknessMm: 6,
        targetTemperatureC: selectedFiring?.targetTemperatureC ?? 1222,
        targetCone: selectedFiring?.targetCone ?? "6",
        atmosphere: selectedFiring?.atmosphere ?? "oxidation",
        plannedPreheatHours: 1.5,
        holdMinutes: 20,
        controlledCooling: true,
        startingAmbientC: 22,
        kilnLocation:
          selectedEnvironment?.kilnLocation ??
          selectedKiln?.defaultLocation ??
          "indoors",
        humidityPercentage: selectedEnvironment?.humidityStartPercentage ?? 64,
        windSpeedKph: selectedEnvironment?.windSpeedKph ?? 14,
        comparableFirings: firings
          .filter((firing) => firing.id !== selectedFiring?.id && firing.totalHeatingMinutes)
          .map((firing) => ({
            id: firing.id,
            title: firing.title,
            targetTemperatureC: firing.targetTemperatureC,
            loadFullnessPercentage: firing.loadFullnessPercentage,
            atmosphere: firing.atmosphere,
            totalHeatingMinutes: firing.totalHeatingMinutes ?? 0,
            totalCoolingMinutes: firing.totalCoolingMinutes ?? 0,
          })),
      }),
    [firings, selectedEnvironment, selectedFiring, selectedKiln],
  );

  const handleQuickReading = () => {
    if (!selectedFiring) return;
    const previous = ratePoints.at(-1);
    const elapsedMinutes = previous ? previous.elapsedMinutes + 30 : 30;
    const actualTemperatureC = previous
      ? Math.min(previous.actualTemperatureC + 76, selectedFiring.targetTemperatureC + 8)
      : 90;

    setLiveReadings((points) => [
      ...points,
      {
        id: `log-${selectedFiring.id}-${Date.now()}`,
        firingId: selectedFiring.id,
        timestamp: new Date().toISOString(),
        elapsedMinutes,
        targetTemperatureC: selectedFiring.targetTemperatureC,
        actualTemperatureC,
        atmosphere: selectedFiring.atmosphere,
        notes: "Manual quick reading",
        manual: true,
      },
    ]);
  };

  const createEnvironmentPayload = (
    kiln: KilnProfile | undefined,
    observedAt: string,
    overrides: Partial<FiringEnvironmentPayload> = {},
  ): FiringEnvironmentPayload => {
    const kilnLocation = overrides.kilnLocation ?? kiln?.defaultLocation ?? "indoors";
    const outdoor = isOutdoorKilnLocation(kilnLocation);
    return {
      kilnLocation,
      locationLabel: overrides.locationLabel ?? viewer.locationLabel,
      observedAt: overrides.observedAt ?? observedAt,
      weatherSource: overrides.weatherSource ?? "manual",
      outsideStartTemperatureC:
        overrides.outsideStartTemperatureC ?? (outdoor ? 22 : undefined),
      outsideLowC: overrides.outsideLowC ?? (outdoor ? 18 : undefined),
      outsideHighC: overrides.outsideHighC ?? (outdoor ? 27 : undefined),
      indoorAmbientTemperatureC:
        overrides.indoorAmbientTemperatureC ?? (outdoor ? undefined : 22),
      humidityStartPercentage: overrides.humidityStartPercentage ?? 58,
      humidityLowPercentage: overrides.humidityLowPercentage,
      humidityHighPercentage: overrides.humidityHighPercentage,
      windSpeedKph: overrides.windSpeedKph ?? (outdoor ? 8 : 0),
      windDirection: overrides.windDirection ?? (outdoor ? "W" : undefined),
      windGustKph: overrides.windGustKph ?? (outdoor ? 14 : undefined),
      dewPointC: overrides.dewPointC,
      atmosphericPressureHpa: overrides.atmosphericPressureHpa,
      surfacePressureHpa: overrides.surfacePressureHpa,
      cloudCoverPercentage: overrides.cloudCoverPercentage,
      precipitationMm: overrides.precipitationMm,
      weatherCode: overrides.weatherCode,
      rainConditions: overrides.rainConditions ?? (outdoor ? "dry" : undefined),
      ventilationNotes:
        overrides.ventilationNotes ??
        (outdoor ? "Outdoor airflow reading pending." : "Ventilation notes pending."),
      weatherNotes:
        overrides.weatherNotes ??
        (outdoor
          ? "Use location data or manual observations to capture the outdoor firing atmosphere."
          : "Indoor ambient reading captured manually."),
      latitude: overrides.latitude,
      longitude: overrides.longitude,
      elevationMeters: overrides.elevationMeters,
    };
  };

  const upsertEnvironmentRecord = (firingId: string, environment: FiringEnvironmentPayload) => {
    setEnvironmentRecords((records) => {
      const existing = records.find((record) => record.firingId === firingId);
      if (existing) {
        return records.map((record) =>
          record.firingId === firingId ? { ...record, ...environment } : record,
        );
      }
      return [
        {
          id: `environment-${firingId}`,
          firingId,
          ...environment,
        },
        ...records,
      ];
    });
  };

  const handleCreateFiring = (values: FiringFormValues) => {
    const kiln = kilnById.get(values.kilnId);
    const createdAt = new Date().toISOString();
    const newFiring: FiringRecord = {
      id: `firing-${Date.now()}`,
      ownerId: viewer.id,
      title: values.title,
      readableNumber: `Firing ${String(firings.length + 40).padStart(3, "0")}`,
      kilnId: values.kilnId,
      kilnNameSnapshot: kiln?.name ?? "Unknown kiln",
      kilnSpecSnapshot: kiln
        ? `${kiln.manufacturer} ${kiln.model}, ${kiln.usableVolumeLiters} L`
        : "Snapshot unavailable",
      firingType: kiln?.kilnType ?? "electric",
      status: "planned",
      visibility: "private",
      plannedStartAt: createdAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      leadFirer: viewer.displayName,
      targetTemperatureC: values.targetTemperatureC,
      targetCone: values.targetCone,
      atmosphere: kiln?.kilnType === "gas" ? "reduction" : "oxidation",
      loadFullnessPercentage: 62,
      notes: `Linked ${values.glazeId} to ${values.clayBodyId}. Environment: ${values.location}, humidity ${values.humidity}%, wind ${values.windSpeedKph} kph.`,
    };
    setFirings((items) => [newFiring, ...items]);
    setSelectedFiringId(newFiring.id);
    upsertEnvironmentRecord(
      newFiring.id,
      createEnvironmentPayload(kiln, createdAt, {
        kilnLocation: values.location,
        humidityStartPercentage: values.humidity,
        windSpeedKph: values.windSpeedKph,
        locationLabel: viewer.locationLabel,
      }),
    );
  };

  const navigateToView = (nextView: View) => {
    setActiveAddFlow(null);
    setView(nextView === "Add" ? "Home" : nextView);
  };

  const completeAddFlow = (desktopView: View) => {
    setActiveAddFlow(null);
    setView(isMobileAppViewport() ? "Profile" : desktopView);
  };

  const recordAddDraft = (
    kind: AddKind,
    visibility: AddVisibility,
    title: string,
    detail: string,
  ) => {
    setAddDrafts((items) => [
      {
        id: `add-${kind}-${Date.now()}`,
        kind,
        visibility,
        title,
        detail,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ]);
  };

  const createInlineGlazeProfile = () => {
    const createdAt = Date.now();
    const profileId = createClientRecordId("glaze");
    const recipeId = createClientRecordId("recipe");
    const profile: GlazeProfile = {
      id: profileId,
      ownerId: viewer.id,
      name: `Draft glaze profile ${glazes.length + 1}`,
      creatorAttribution: viewer.displayName,
      source: "Created from post composer",
      glazeType: "studio_test",
      surface: "Surface pending",
      colorFamily: ["Unsorted"],
      opacity: "unknown",
      firingRange: "Cone 6-10",
      coneRange: "6-10",
      atmosphereCompatibility: ["oxidation", "reduction"],
      recipeVisibility: "public",
      profileVisibility: "public",
      description: "Draft glaze profile. Add recipe details, surface notes, and fired images.",
      applicationNotes: "Application notes pending.",
      heroImageColor: BRAND_COLORS.sun,
      currentRecipeVersionId: recipeId,
    };
    const recipeVersion: GlazeRecipeVersion = {
      id: recipeId,
      glazeId: profile.id,
      versionNumber: 1,
      effectiveDate: new Date(createdAt).toISOString().slice(0, 10),
      batchSizeGrams: 1000,
      totalDryWeightGrams: 1000,
      ingredients: [],
      sourceAttribution: viewer.displayName,
      changeSummary: "Quick profile created from the post composer. Add recipe details in the glaze library.",
      visibility: "public",
    };
    setGlazes((items) => [profile, ...items]);
    setGlazeRecipeVersions((items) => [recipeVersion, ...items]);
    return profile;
  };

  const createInlineClayBodyProfile = () => {
    const profile: ClayBodyProfile = {
      id: createClientRecordId("clay"),
      ownerId: viewer.id,
      name: `Draft clay body profile ${clayBodies.length + 1}`,
      manufacturer: "Studio mixed",
      supplier: "Studio",
      bodyType: "stoneware",
      rawColor: "unknown",
      firedColor: "pending",
      texture: "unspecified",
      absorptionPercentage: 0,
      shrinkagePercentage: 0,
      coneRange: "6-10",
      atmosphereSuitability: ["oxidation", "reduction"],
      recipeVisibility: "public",
      profileVisibility: "public",
      notes: "Draft clay body profile. Add fit, shrinkage, absorption, and fired color notes.",
      imageColor: BRAND_COLORS.stone,
    };
    setClayBodies((items) => [profile, ...items]);
    return profile;
  };

  const createInlineKilnProfile = () => {
    const profile: KilnProfile = {
      id: createClientRecordId("kiln"),
      ownerId: viewer.id,
      name: `Draft kiln profile ${kilns.length + 1}`,
      manufacturer: "Unknown",
      model: "Draft",
      kilnType: "electric",
      fuelType: "electric",
      controllerType: "unspecified",
      usableVolumeLiters: 0,
      maxTemperatureC: 1300,
      recommendedConeRange: "04-10",
      defaultLocation: "indoors",
      active: true,
      visibility: "public",
      notes: "Draft kiln profile. Add dimensions, controller, location, and maintenance details.",
    };
    setKilns((items) => [profile, ...items]);
    return profile;
  };

  const createAddFiring = (
    kind: Extract<AddKind, "live_firing" | "previous_firing">,
    visibility: AddVisibility,
    createdAt: string,
    payload?: Partial<PreviousFiringPayload>,
  ) => {
    const kiln = (payload?.kilnId ? kilnById.get(payload.kilnId) : undefined) ?? kilns[0];
    const newFiring: FiringRecord = {
      id: `firing-add-${Date.now()}`,
      ownerId: viewer.id,
      title:
        payload?.title ??
        (kind === "live_firing"
          ? `Live firing ${new Date(createdAt).toLocaleDateString()}`
          : "Previous firing record"),
      readableNumber: `Firing ${String(firings.length + 40).padStart(3, "0")}`,
      kilnId: kiln?.id ?? "kiln-draft",
      kilnNameSnapshot: kiln?.name ?? "Select kiln",
      kilnSpecSnapshot: kiln
        ? `${kiln.manufacturer} ${kiln.model}, ${kiln.usableVolumeLiters} L`
        : "Kiln details pending",
      firingType: kiln?.kilnType ?? "electric",
      status: kind === "live_firing" ? "in_progress" : "completed",
      visibility,
      plannedStartAt: createdAt,
      actualStartAt: payload?.actualStartAt ?? (kind === "live_firing" ? createdAt : undefined),
      actualEndAt:
        kind === "previous_firing"
          ? new Date(new Date(payload?.actualStartAt ?? createdAt).getTime() + 10 * 60 * 60 * 1000).toISOString()
          : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      leadFirer: viewer.displayName,
      targetTemperatureC: payload?.targetTemperatureC ?? 1222,
      targetCone: payload?.targetCone ?? "6",
      atmosphere: kiln?.kilnType === "gas" ? "reduction" : "oxidation",
      loadFullnessPercentage: kind === "live_firing" ? 48 : 64,
      totalHeatingMinutes: kind === "previous_firing" ? 620 : undefined,
      totalCoolingMinutes: kind === "previous_firing" ? 840 : undefined,
      successRating: kind === "previous_firing" ? 82 : undefined,
      notes:
        payload?.notes ||
        (kind === "live_firing"
          ? "Live firing started from the Add flow."
          : "Previous firing backfilled from the Add flow."),
    };

    setFirings((items) => [newFiring, ...items]);
    setSelectedFiringId(newFiring.id);
    return newFiring;
  };

  const handleGoogleSignIn = async () => {
    setAuthStatus({ state: "loading", message: "Opening Google sign-in." });
    const { error } = await signInWithGoogle("/");
    if (error) {
      setAuthStatus({ state: "error", message: error.message });
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOutOfSupabase();
    if (error) {
      setAuthStatus({ state: "error", message: error.message });
      return;
    }
    setViewer(snapshot.viewer);
    setAuthStatus({
      state: "signed-out",
      message: "Signed out. Public content is visible; sign in to create and save records.",
    });
  };

  const handleAddChoice = (
    kind: AddKind,
    visibility: AddVisibility,
  ) => {
    const now = new Date();
    const createdAt = now.toISOString();
    let firingId: string | undefined;

    if (kind === "live_firing") {
      const firing = createAddFiring("live_firing", visibility, createdAt);
      const kiln = kilnById.get(firing.kilnId);
      firingId = firing.id;
      upsertEnvironmentRecord(
        firing.id,
        createEnvironmentPayload(kiln, createdAt, {
          kilnLocation: kiln?.defaultLocation ?? "indoors",
        }),
      );
      setLiveReadings((points) => [
        ...points,
        {
          id: `log-${firing.id}-${now.getTime()}`,
          firingId: firing.id,
          timestamp: createdAt,
          elapsedMinutes: 0,
          targetTemperatureC: firing.targetTemperatureC,
          actualTemperatureC: 24,
          atmosphere: firing.atmosphere,
          notes: "Live firing started.",
          manual: true,
        },
      ]);
      recordAddDraft(
        "live_firing",
        visibility,
        firing.title,
        "Live tracker started. Add temperature readings as the firing progresses.",
      );
    }

    setActiveAddFlow({ kind, visibility, startedAt: createdAt, firingId });
    setAddChooserOpen(false);
  };

  const handleSaveGlazeRecipe = (payload: GlazeRecipePayload) => {
    const createdAt = Date.now();
    const profileId = createClientRecordId("glaze");
    const recipeId = createClientRecordId("recipe");
    const ingredients: RecipeIngredient[] = [
      {
        materialId: `material-${createdAt}-base`,
        materialName: payload.baseMaterial,
        percentage: 80,
        weightGrams: 800,
        role: "base",
      },
      {
        materialId: `material-${createdAt}-accent`,
        materialName: payload.accentMaterial,
        percentage: 20,
        weightGrams: 200,
        role: "colorant",
      },
    ];
    const profile: GlazeProfile = {
      id: profileId,
      ownerId: viewer.id,
      name: payload.title,
      creatorAttribution: viewer.displayName,
      source: "Studio recipe",
      glazeType: "studio_recipe",
      surface: "Surface pending",
      colorFamily: ["Unsorted"],
      opacity: "unknown",
      firingRange: payload.coneRange,
      coneRange: payload.coneRange,
      atmosphereCompatibility: ["oxidation", "reduction"],
      recipeVisibility: payload.visibility,
      profileVisibility: payload.visibility,
      description: "New glaze recipe profile. Add fired images, surface notes, and application details as results come in.",
      applicationNotes: "Application notes pending.",
      heroImageColor: BRAND_COLORS.sun,
      currentRecipeVersionId: recipeId,
    };
    const recipeVersion: GlazeRecipeVersion = {
      id: recipeId,
      glazeId: profileId,
      versionNumber: 1,
      effectiveDate: new Date(createdAt).toISOString().slice(0, 10),
      batchSizeGrams: 1000,
      totalDryWeightGrams: 1000,
      ingredients,
      sourceAttribution: viewer.displayName,
      changeSummary: "Initial recipe saved from the Add flow.",
      visibility: payload.visibility,
    };
    setGlazes((items) => [profile, ...items]);
    setGlazeRecipeVersions((items) => [recipeVersion, ...items]);
    void persistGlazeRecord({ profile, recipeVersion }).catch((error: unknown) => {
      console.error("Unable to persist glaze recipe", error);
    });
    recordAddDraft(
      "glaze_recipe",
      payload.visibility,
      payload.title,
      `${payload.coneRange} recipe with ${payload.baseMaterial} and ${payload.accentMaterial}.`,
    );
    completeAddFlow("Glazes");
  };

  const handleCreateGlazeRecord = (record: CreatedGlazeRecord) => {
    setGlazes((items) => [record.profile, ...items]);
    setGlazeRecipeVersions((items) => [record.recipeVersion, ...items]);
    void persistGlazeRecord(record).catch((error: unknown) => {
      console.error("Unable to persist glaze profile", error);
    });
    recordAddDraft(
      "glaze_recipe",
      record.profile.recipeVisibility === "studio" ? "followers" : record.profile.recipeVisibility,
      record.profile.name,
      record.recipeVersion.ingredients.length > 0
        ? `${record.recipeVersion.ingredients.length} ingredients saved as version ${record.recipeVersion.versionNumber}.`
        : `${record.profile.source} profile added for result tracking.`,
    );
  };

  const handleCreateClayBodyProfile = (profile: ClayBodyProfile) => {
    setClayBodies((items) => [profile, ...items]);
    void persistClayBodyProfile(profile).catch((error: unknown) => {
      console.error("Unable to persist clay body profile", error);
    });
  };

  const handleCreateKilnProfile = (profile: KilnProfile) => {
    setKilns((items) => [profile, ...items]);
    void persistKilnProfile(profile).catch((error: unknown) => {
      console.error("Unable to persist kiln profile", error);
    });
  };

  const handleSavePreviousFiring = (payload: PreviousFiringPayload) => {
    const firing = createAddFiring("previous_firing", payload.visibility, new Date().toISOString(), payload);
    recordAddDraft(
      "previous_firing",
      payload.visibility,
      firing.title,
      `Backfilled ${firing.readableNumber} with ${payload.glazeId} and ${payload.clayBodyId}.`,
    );
    completeAddFlow("Firings");
  };

  const handleSaveGlazeResult = (payload: GlazeResultPayload) => {
    const glaze = glazeById.get(payload.glazeId);
    const firing = firingById.get(payload.firingId);
    recordAddDraft(
      "glaze_result",
      payload.visibility,
      payload.title,
      `${payload.rating}/100 result${payload.imageName ? ` with ${payload.imageName}` : ""}${firing ? ` linked to ${firing.readableNumber}` : ""}${glaze ? ` for ${glaze.name}` : ""}.`,
    );
    completeAddFlow("Glazes");
  };

  const handleUpdateLiveFiringSetup = (firingId: string, payload: LiveFiringSetupPayload) => {
    const kiln = kilnById.get(payload.kilnId);
    setFirings((items) =>
      items.map((firing) =>
        firing.id === firingId
          ? {
              ...firing,
              kilnId: payload.kilnId,
              kilnNameSnapshot: kiln?.name ?? "Custom kiln",
              kilnSpecSnapshot: kiln
                ? `${kiln.manufacturer} ${kiln.model}, ${kiln.usableVolumeLiters} L`
                : `${formatOptionLabel(FIRING_TYPE_OPTIONS, payload.firingType)} kiln`,
              firingType: payload.firingType,
              targetTemperatureC: payload.targetTemperatureC,
              targetCone: payload.targetCone,
              atmosphere: payload.atmosphere,
              notes: `Live setup: ${payload.fuelType}, ${formatOptionLabel(KILN_LOCATION_OPTIONS, payload.environment.kilnLocation)}, humidity ${payload.environment.humidityStartPercentage ?? "n/a"}%, wind ${payload.environment.windSpeedKph ?? 0} kph.`,
            }
          : firing,
      ),
    );
    upsertEnvironmentRecord(firingId, payload.environment);
  };

  const handleFinishLiveFiring = (firingId: string) => {
    const finishedAt = new Date().toISOString();
    setFirings((items) =>
      items.map((firing) =>
        firing.id === firingId
          ? {
              ...firing,
              status: "completed",
              actualEndAt: finishedAt,
              totalHeatingMinutes: Math.max(ratePoints.at(-1)?.elapsedMinutes ?? 0, 30),
              totalCoolingMinutes: 0,
            }
          : firing,
      ),
    );
    const firing = firingById.get(firingId);
    const draftVisibility: AddVisibility =
      firing?.visibility === "private" || firing?.visibility === "followers" || firing?.visibility === "public"
        ? firing.visibility
        : "public";
    recordAddDraft(
      "live_firing",
      draftVisibility,
      firing?.title ?? "Completed live firing",
      "Live firing ended and saved to the firing journal.",
    );
    completeAddFlow("Firings");
  };

  const displayView: View = activeAddFlow ? "Add" : view;
  const mainClassName = [
    "kb-main",
    displayView === "Home" ? "kb-main-home" : "",
    MOBILE_SCROLL_VIEWS.has(displayView) ? "kb-main-scrollable" : "kb-main-contained",
  ].filter(Boolean).join(" ");

  return (
    <main className="kb-app-root min-h-screen bg-[var(--kb-bg)] text-[var(--kb-ink)]">
      <div className="kb-shell">
        <Sidebar view={displayView} onViewChange={navigateToView} />
        <section className={mainClassName}>
          <Header
            viewerName={viewer.displayName}
            view={displayView}
            authStatus={authStatus}
            query={query}
            onQueryChange={setQuery}
            onCreate={() => setAddChooserOpen(true)}
            onOpenNotifications={() => navigateToView("Settings")}
            onOpenProfile={() => navigateToView("Profile")}
            onSearchSubmit={() => navigateToView("Explore")}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
          />
          {activeAddFlow ? (
            <AddFlowScreen
              flow={activeAddFlow}
              viewer={viewer}
              firings={firings}
              activeFiring={activeFiring}
              activeEnvironment={activeEnvironment}
              kilns={kilns}
              glazes={glazes}
              clayBodies={clayBodies}
              ratePoints={ratePoints}
              estimate={estimate}
              onBack={() => setActiveAddFlow(null)}
              onQuickReading={handleQuickReading}
              onSaveGlazeRecipe={handleSaveGlazeRecipe}
              onSavePreviousFiring={handleSavePreviousFiring}
              onSaveGlazeResult={handleSaveGlazeResult}
              onUpdateLiveFiringSetup={handleUpdateLiveFiringSetup}
              onFinishLiveFiring={handleFinishLiveFiring}
            />
          ) : view === "Home" ? (
            <HomeScreen
              feedTab={feedTab}
              onFeedTabChange={setFeedTab}
              posts={feedTab === "Following" ? snapshot.posts : popularPosts}
              firings={firings}
              glazes={glazes}
              clayBodies={clayBodies}
              kilns={kilns}
              onOpenExplore={() => navigateToView("Explore")}
              onCreateGlazeProfile={createInlineGlazeProfile}
              onCreateClayBodyProfile={createInlineClayBodyProfile}
              onCreateKilnProfile={createInlineKilnProfile}
            />
          ) : null}
          {!activeAddFlow && view === "Dashboard" && (
            <DashboardScreen
              firings={firings}
              glazes={glazes}
              clayBodies={clayBodies}
              selectedFiring={selectedFiring}
              ratePoints={ratePoints}
            />
          )}
          {!activeAddFlow && view === "Firings" && selectedFiring && (
            <FiringsScreen
              firings={firings}
              selectedFiring={selectedFiring}
              kilns={kilns}
              glazes={glazes}
              clayBodies={clayBodies}
              applications={snapshot.glazeApplications}
              ratePoints={ratePoints}
              estimate={estimate}
              imageTags={imageTags}
              addDrafts={addDrafts.filter((draft) =>
                draft.kind === "live_firing" || draft.kind === "previous_firing",
              )}
              onSelectFiring={setSelectedFiringId}
              onQuickReading={handleQuickReading}
              onCreateFiring={handleCreateFiring}
              onTagsChange={setImageTags}
            />
          )}
          {!activeAddFlow && view === "Glazes" && (
            <GlazesScreen
              viewer={viewer}
              glazes={glazes}
              recipes={glazeRecipeVersions}
              applications={snapshot.glazeApplications}
              clayBodies={clayBodies}
              firings={firings}
              addDrafts={addDrafts.filter((draft) =>
                draft.kind === "glaze_recipe" || draft.kind === "glaze_result",
              )}
              onCreateGlazeRecord={handleCreateGlazeRecord}
            />
          )}
          {!activeAddFlow && view === "Clay Bodies" && (
            <ClayBodiesScreen
              viewer={viewer}
              clayBodies={clayBodies}
              glazes={glazes}
              applications={snapshot.glazeApplications}
              firings={firings}
              onCreateClayBodyProfile={handleCreateClayBodyProfile}
            />
          )}
          {!activeAddFlow && view === "Kilns" && (
            <KilnsScreen
              viewer={viewer}
              kilns={kilns}
              firings={firings}
              onCreateKilnProfile={handleCreateKilnProfile}
            />
          )}
          {!activeAddFlow && view === "Explore" && (
            <ExploreScreen
              query={query}
              profiles={snapshot.profiles}
              glazes={glazes}
              clayBodies={clayBodies}
              posts={snapshot.posts}
              firings={firings}
            />
          )}
          {!activeAddFlow && view === "Messages" && (
            <MessagesScreen conversations={snapshot.conversations} />
          )}
          {!activeAddFlow && view === "Analytics" && (
            <AnalyticsScreen
              plan={viewer.subscriptionTier}
              firings={firings}
              glazes={glazes}
              clayBodies={clayBodies}
            />
          )}
          {!activeAddFlow && view === "Profile" && (
            <ProfileScreen
              viewer={viewer}
              authStatus={authStatus}
              posts={snapshot.posts}
              drafts={addDrafts}
              onOpenSettings={() => setView("Settings")}
              onGoogleSignIn={handleGoogleSignIn}
            />
          )}
          {!activeAddFlow && view === "Settings" && (
            <SettingsScreen
              viewer={viewer}
              authStatus={authStatus}
              onGoogleSignIn={handleGoogleSignIn}
            />
          )}
          {!activeAddFlow && view === "Library" && (
            <LibraryScreen
              glazes={glazes}
              clayBodies={clayBodies}
              kilns={kilns}
              onViewChange={setView}
            />
          )}
        </section>
      </div>
      <MobileNav
        view={displayView}
        onViewChange={navigateToView}
        onAdd={() => setAddChooserOpen(true)}
        onSearch={() => navigateToView("Explore")}
      />
      {addChooserOpen && (
        <AddChooser
          onClose={() => setAddChooserOpen(false)}
          onConfirm={handleAddChoice}
        />
      )}
    </main>
  );
}

function Sidebar({
  view,
  onViewChange,
}: {
  view: View;
  onViewChange: (view: View) => void;
}) {
  return (
    <aside className="kb-sidebar" aria-label="Primary navigation">
      <div className="kb-brand">
        <Image className="kb-brand-mark" src={BRAND_ASSETS.logo} alt="" width={40} height={40} />
        <div className="kb-brand-text">
          <Image
            className="kb-wordmark"
            src={BRAND_ASSETS.wordmark}
            alt={PRODUCT.name}
            width={184}
            height={30}
            priority
          />
          <span>Ceramic process library</span>
        </div>
      </div>
      <nav className="kb-nav">
        {PRIMARY_NAVIGATION.map((item) => {
          const Icon = navIcons[item];
          return (
            <button
              key={item}
              type="button"
              className={view === item ? "active" : ""}
              onClick={() => onViewChange(item)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{item}</span>
            </button>
          );
        })}
      </nav>
      <div className="kb-sidebar-card">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>Private recipes stay server-protected by policy, not hidden UI.</span>
      </div>
    </aside>
  );
}

function Header({
  viewerName,
  view,
  authStatus,
  query,
  onQueryChange,
  onCreate,
  onOpenNotifications,
  onOpenProfile,
  onSearchSubmit,
  onGoogleSignIn,
  onSignOut,
}: {
  viewerName: string;
  view: View;
  authStatus: AuthStatus;
  query: string;
  onQueryChange: (query: string) => void;
  onCreate: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onSearchSubmit: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}) {
  const isAddView = view === "Add";
  const connected = authStatus.state === "signed-in";
  const authBusy = authStatus.state === "loading";
  const authDisabled = authBusy || authStatus.state === "unconfigured";
  return (
    <header
      className={[
        "kb-header",
        view === "Home" ? "kb-home-header" : "",
        isAddView ? "kb-header-simple" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="kb-title-lockup">
        <Image className="kb-header-logo" src={BRAND_ASSETS.logo} alt="" width={40} height={40} />
        <div className="kb-title-text">
          <p className="kb-kicker">Workspace</p>
          {view === "Home" ? (
            <>
              <Image
                className="kb-header-wordmark"
                src={BRAND_ASSETS.wordmark}
                alt=""
                width={235}
                height={39}
                priority
              />
              <h1 className="sr-only">{PRODUCT.name}</h1>
            </>
          ) : (
            <h1>{view === "Library" ? "Library" : view}</h1>
          )}
        </div>
      </div>
      <form
        className="kb-search"
        hidden={isAddView}
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">Search Flux and Fire</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search firings, glazes, clay bodies"
        />
      </form>
      <div className="kb-header-actions">
        {!isAddView && (
          <>
            <button
              type="button"
              className="kb-icon-button"
              aria-label="Open notification settings"
              onClick={onOpenNotifications}
            >
              <Bell size={18} />
            </button>
            <button type="button" className="kb-primary-button" onClick={onCreate}>
              <Plus size={18} />
              <span>Add</span>
            </button>
          </>
        )}
        {connected ? (
          <>
            <button type="button" className="kb-account-chip" onClick={onOpenProfile}>
              <UserRound size={16} aria-hidden="true" />
              <span>{viewerName}</span>
            </button>
            <button type="button" className="kb-quiet-button" onClick={onSignOut}>
              <LogOut size={17} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="kb-quiet-button"
            onClick={onGoogleSignIn}
            disabled={authDisabled}
            title={authStatus.state === "unconfigured" || authStatus.state === "error" ? authStatus.message : undefined}
          >
            <Mail size={17} aria-hidden="true" />
            <span>{authBusy ? "Checking" : "Sign in"}</span>
          </button>
        )}
      </div>
    </header>
  );
}

function AddChooser({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (
    kind: AddKind,
    visibility: AddVisibility,
  ) => void;
}) {
  const [kind, setKind] = useState<AddKind>("glaze_recipe");
  const [visibility, setVisibility] = useState<AddVisibility>("public");
  const addOptions: Array<{
    kind: AddKind;
    title: string;
    body: string;
    icon: LucideIcon;
  }> = [
    {
      kind: "glaze_recipe",
      title: "Glaze recipe",
      body: "Share materials, version notes, firing range, and optional private notes.",
      icon: Layers3,
    },
    {
      kind: "live_firing",
      title: "Live firing data",
      body: "Start tracking readings, atmosphere, notes, and photos during a firing.",
      icon: Flame,
    },
    {
      kind: "previous_firing",
      title: "Previous firing",
      body: "Backfill an older firing with kiln data, clay bodies, and glaze links.",
      icon: ClipboardList,
    },
    {
      kind: "glaze_result",
      title: "Glaze result",
      body: "Add finished images and connect the result to a firing, recipe, and clay body.",
      icon: Camera,
    },
  ];
  const visibilityOptions: Array<{
    visibility: AddVisibility;
    title: string;
    body: string;
  }> = [
    {
      visibility: "public",
      title: "Public",
      body: "Default for sharing recipes and results with the ceramics community.",
    },
    {
      visibility: "followers",
      title: "Followers only",
      body: "Visible on your profile to people who follow you.",
    },
    {
      visibility: "private",
      title: "Private",
      body: "Only visible to you. Useful for experiments or recipes you are not ready to share.",
    },
  ];
  const selectedOption = addOptions.find((option) => option.kind === kind) ?? addOptions[0];
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="kb-modal-backdrop" role="presentation">
      <section
        className="kb-add-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-dialog-title"
      >
        <div className="kb-section-title compact">
          <div>
            <p className="kb-kicker">Add to profile</p>
            <h2 id="add-dialog-title">What do you want to add?</h2>
          </div>
          <button type="button" className="kb-icon-button" aria-label="Close add chooser" onClick={onClose}>
            <CircleX size={18} />
          </button>
        </div>
        <div className="kb-add-mobile-list">
          {addOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                type="button"
                key={option.kind}
                onClick={() => onConfirm(option.kind, "public")}
              >
                <Icon size={20} />
                <strong>{option.title}</strong>
              </button>
            );
          })}
        </div>
        <div className="kb-add-option-grid">
          {addOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                type="button"
                key={option.kind}
                className={kind === option.kind ? "kb-add-option active" : "kb-add-option"}
                aria-pressed={kind === option.kind}
                onClick={() => setKind(option.kind)}
              >
                <Icon size={20} />
                <strong>{option.title}</strong>
                <span>{option.body}</span>
              </button>
            );
          })}
        </div>
        <div className="kb-add-privacy">
          <div>
            <p className="kb-kicker">Visibility</p>
            <h3>Choose how this appears on your profile</h3>
          </div>
          <div className="kb-add-visibility-grid">
            {visibilityOptions.map((option) => (
              <button
                type="button"
                key={option.visibility}
                className={visibility === option.visibility ? "active" : ""}
                aria-pressed={visibility === option.visibility}
                onClick={() => setVisibility(option.visibility)}
              >
                <strong>{option.title}</strong>
                <span>{option.body}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="kb-add-summary">
          <SelectedIcon size={18} />
          <span>
            {selectedOption.title} will be saved to your profile as{" "}
            <strong>{visibility === "followers" ? "followers only" : visibility}</strong>.
          </span>
        </div>
        <div className="kb-add-actions">
          <button type="button" className="kb-quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="kb-primary-button" onClick={() => onConfirm(kind, visibility)}>
            <Plus size={18} />
            <span>Continue</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function AddFlowScreen({
  flow,
  viewer,
  firings,
  activeFiring,
  activeEnvironment,
  kilns,
  glazes,
  clayBodies,
  ratePoints,
  estimate,
  onBack,
  onQuickReading,
  onSaveGlazeRecipe,
  onSavePreviousFiring,
  onSaveGlazeResult,
  onUpdateLiveFiringSetup,
  onFinishLiveFiring,
}: {
  flow: ActiveAddFlow;
  viewer: Profile;
  firings: FiringRecord[];
  activeFiring?: FiringRecord;
  activeEnvironment?: FiringEnvironmentRecord;
  kilns: KilnProfile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  ratePoints: ReturnType<typeof calculateRateOfChange>;
  estimate: ReturnType<typeof estimateFiringDuration>;
  onBack: () => void;
  onQuickReading: () => void;
  onSaveGlazeRecipe: (payload: GlazeRecipePayload) => void;
  onSavePreviousFiring: (payload: PreviousFiringPayload) => void;
  onSaveGlazeResult: (payload: GlazeResultPayload) => void;
  onUpdateLiveFiringSetup: (firingId: string, payload: LiveFiringSetupPayload) => void;
  onFinishLiveFiring: (firingId: string) => void;
}) {
  const shared = {
    flow,
    viewer,
    onBack,
  };

  if (flow.kind === "live_firing") {
    return (
      <LiveFiringAddFlow
        {...shared}
        firing={activeFiring}
        environment={activeEnvironment}
        kilns={kilns}
        ratePoints={ratePoints}
        estimate={estimate}
        onQuickReading={onQuickReading}
        onUpdateSetup={onUpdateLiveFiringSetup}
        onFinishLiveFiring={onFinishLiveFiring}
      />
    );
  }

  if (flow.kind === "previous_firing") {
    return (
      <PreviousFiringAddFlow
        {...shared}
        kilns={kilns}
        glazes={glazes}
        clayBodies={clayBodies}
        onSave={onSavePreviousFiring}
      />
    );
  }

  if (flow.kind === "glaze_result") {
    return (
      <GlazeResultAddFlow
        {...shared}
        firings={firings}
        glazes={glazes}
        clayBodies={clayBodies}
        onSave={onSaveGlazeResult}
      />
    );
  }

  return (
    <GlazeRecipeAddFlow
      {...shared}
      glazes={glazes}
      onSave={onSaveGlazeRecipe}
    />
  );
}

function AddFlowHero({
  icon: Icon,
  kicker,
  title,
  body,
  onBack,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  body: string;
  onBack: () => void;
}) {
  return (
    <section className="kb-flow-hero">
      <button type="button" className="kb-flow-back" onClick={onBack}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>
      <div className="kb-flow-heading">
        <Icon size={24} aria-hidden="true" />
        <div>
          <p className="kb-kicker">{kicker}</p>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      </div>
    </section>
  );
}

function VisibilitySelector({
  value,
  onChange,
}: {
  value: AddVisibility;
  onChange: (visibility: AddVisibility) => void;
}) {
  const options: Array<{ value: AddVisibility; label: string; detail: string }> = [
    { value: "public", label: "Public", detail: "Share on your profile and public feed." },
    { value: "followers", label: "Followers", detail: "Visible to followers only." },
    { value: "private", label: "Private", detail: "Only visible to you." },
  ];

  return (
    <div className="kb-flow-visibility" aria-label="Visibility">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <strong>{option.label}</strong>
          <span>{option.detail}</span>
        </button>
      ))}
    </div>
  );
}

function GlazeRecipeAddFlow({
  flow,
  viewer,
  glazes,
  onBack,
  onSave,
}: {
  flow: ActiveAddFlow;
  viewer: Profile;
  glazes: GlazeProfile[];
  onBack: () => void;
  onSave: (payload: GlazeRecipePayload) => void;
}) {
  const [title, setTitle] = useState("New glaze recipe");
  const [coneRange, setConeRange] = useState(glazes[0]?.coneRange ?? "Cone 6");
  const [baseMaterial, setBaseMaterial] = useState("Custer Feldspar");
  const [accentMaterial, setAccentMaterial] = useState("Red iron oxide");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<AddVisibility>(flow.visibility);
  const canSave = title.trim().length >= 3;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      title: title.trim(),
      coneRange,
      baseMaterial: baseMaterial.trim() || "base material",
      accentMaterial: accentMaterial.trim() || "accent material",
      visibility,
    });
  };

  return (
    <div className="kb-add-flow">
      <AddFlowHero
        icon={Layers3}
        kicker="Glaze recipe"
        title="Write the recipe once, then decide how much to share."
        body={`Saving to @${viewer.username}. Recipes default to public sharing, with private still available for experiments.`}
        onBack={onBack}
      />
      <div className="kb-flow-layout">
        <form className="kb-panel kb-flow-card kb-form" onSubmit={submit}>
          <label>
            <span>Recipe name</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="kb-form-grid">
            <label>
              <span>Cone range</span>
              <input value={coneRange} onChange={(event) => setConeRange(event.target.value)} />
            </label>
            <label>
              <span>Base material</span>
              <input value={baseMaterial} onChange={(event) => setBaseMaterial(event.target.value)} />
            </label>
          </div>
          <label>
            <span>Colorant or modifier</span>
            <input value={accentMaterial} onChange={(event) => setAccentMaterial(event.target.value)} />
          </label>
          <label>
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Specific gravity, sieve, application thickness, or firing notes"
            />
          </label>
          <VisibilitySelector value={visibility} onChange={setVisibility} />
          <button type="submit" className="kb-primary-button full" disabled={!canSave}>
            <Save size={17} />
            <span>Save glaze recipe</span>
          </button>
        </form>
        <aside className="kb-panel kb-flow-sidebar">
          <p className="kb-kicker">Preview</p>
          <h3>{title || "New glaze recipe"}</h3>
          <div className="kb-hero-swatch" style={{ background: glazes[0]?.heroImageColor ?? BRAND_COLORS.sun }} />
          <div className="kb-chip-row">
            <span className="kb-chip">{coneRange}</span>
            <span className="kb-chip">{visibility}</span>
          </div>
          <div className="kb-spec-list">
            <span>Base <strong>{baseMaterial || "Not set"}</strong></span>
            <span>Accent <strong>{accentMaterial || "Not set"}</strong></span>
            <span>Notes <strong>{notes.trim() ? "Added" : "Optional"}</strong></span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LiveFiringAddFlow({
  flow,
  viewer,
  firing,
  environment,
  kilns,
  ratePoints,
  estimate,
  onBack,
  onQuickReading,
  onUpdateSetup,
  onFinishLiveFiring,
}: {
  flow: ActiveAddFlow;
  viewer: Profile;
  firing?: FiringRecord;
  environment?: FiringEnvironmentRecord;
  kilns: KilnProfile[];
  ratePoints: ReturnType<typeof calculateRateOfChange>;
  estimate: ReturnType<typeof estimateFiringDuration>;
  onBack: () => void;
  onQuickReading: () => void;
  onUpdateSetup: (firingId: string, payload: LiveFiringSetupPayload) => void;
  onFinishLiveFiring: (firingId: string) => void;
}) {
  const latest = ratePoints.at(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [atmosphere, setAtmosphere] = useState<AtmosphereType>(firing?.atmosphere ?? "oxidation");
  const [kilnId, setKilnId] = useState(firing?.kilnId ?? kilns[0]?.id ?? "");
  const [firingType, setFiringType] = useState<FiringType>(
    firing?.firingType ?? kilns[0]?.kilnType ?? "electric",
  );
  const [fuelType, setFuelType] = useState(kilns.find((kiln) => kiln.id === firing?.kilnId)?.fuelType ?? "electric");
  const [targetTemperatureC, setTargetTemperatureC] = useState(String(firing?.targetTemperatureC ?? 1222));
  const [targetCone, setTargetCone] = useState(firing?.targetCone ?? "6");
  const [kilnLocation, setKilnLocation] = useState<KilnLocation>(
    environment?.kilnLocation ??
      kilns.find((kiln) => kiln.id === firing?.kilnId)?.defaultLocation ??
      "indoors",
  );
  const [locationLabel, setLocationLabel] = useState(environment?.locationLabel ?? viewer.locationLabel ?? "");
  const [outsideTemperatureC, setOutsideTemperatureC] = useState(decimalInputValue(environment?.outsideStartTemperatureC));
  const [outsideLowC, setOutsideLowC] = useState(decimalInputValue(environment?.outsideLowC));
  const [outsideHighC, setOutsideHighC] = useState(decimalInputValue(environment?.outsideHighC));
  const [indoorAmbientTemperatureC, setIndoorAmbientTemperatureC] = useState(
    decimalInputValue(environment?.indoorAmbientTemperatureC ?? 22),
  );
  const [humidityStartPercentage, setHumidityStartPercentage] = useState(
    decimalInputValue(environment?.humidityStartPercentage ?? 58),
  );
  const [humidityLowPercentage, setHumidityLowPercentage] = useState(decimalInputValue(environment?.humidityLowPercentage));
  const [humidityHighPercentage, setHumidityHighPercentage] = useState(decimalInputValue(environment?.humidityHighPercentage));
  const [windSpeedKph, setWindSpeedKph] = useState(decimalInputValue(environment?.windSpeedKph ?? 0));
  const [windDirection, setWindDirection] = useState(environment?.windDirection ?? "");
  const [windGustKph, setWindGustKph] = useState(decimalInputValue(environment?.windGustKph));
  const [dewPointC, setDewPointC] = useState(decimalInputValue(environment?.dewPointC));
  const [atmosphericPressureHpa, setAtmosphericPressureHpa] = useState(decimalInputValue(environment?.atmosphericPressureHpa));
  const [surfacePressureHpa, setSurfacePressureHpa] = useState(decimalInputValue(environment?.surfacePressureHpa));
  const [cloudCoverPercentage, setCloudCoverPercentage] = useState(decimalInputValue(environment?.cloudCoverPercentage));
  const [precipitationMm, setPrecipitationMm] = useState(decimalInputValue(environment?.precipitationMm));
  const [weatherCode, setWeatherCode] = useState(decimalInputValue(environment?.weatherCode));
  const [rainConditions, setRainConditions] = useState(environment?.rainConditions ?? "dry");
  const [ventilationNotes, setVentilationNotes] = useState(environment?.ventilationNotes ?? "");
  const [weatherNotes, setWeatherNotes] = useState(environment?.weatherNotes ?? "");
  const [weatherStatus, setWeatherStatus] = useState(environment?.weatherSource ?? "Manual reading");
  const [latitude, setLatitude] = useState(decimalInputValue(environment?.latitude));
  const [longitude, setLongitude] = useState(decimalInputValue(environment?.longitude));
  const [setupSaved, setSetupSaved] = useState("");
  const outdoorExposure = isOutdoorKilnLocation(kilnLocation);

  const handleKilnChange = (nextKilnId: string) => {
    const kiln = kilns.find((item) => item.id === nextKilnId);
    setKilnId(nextKilnId);
    if (!kiln) return;
    setFiringType(kiln.kilnType);
    setFuelType(kiln.fuelType);
    setKilnLocation(kiln.defaultLocation);
  };

  const applyOutdoorLocationReading = async () => {
    setWeatherStatus("Requesting location...");
    if (!navigator.geolocation) {
      setWeatherStatus("Location unavailable. Enter the outdoor reading manually.");
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 10 * 60 * 1000,
          timeout: 12000,
        });
      });
      const nextLatitude = Number(position.coords.latitude.toFixed(5));
      const nextLongitude = Number(position.coords.longitude.toFixed(5));
      const params = new URLSearchParams({
        latitude: String(nextLatitude),
        longitude: String(nextLongitude),
        current:
          "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm",
        timezone: "auto",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!response.ok) throw new Error("Weather request failed.");
      const weather = await response.json() as {
        current?: Record<string, number | string | undefined>;
      };
      const current = weather.current ?? {};
      const currentTemperature = typeof current.temperature_2m === "number" ? current.temperature_2m : undefined;
      const currentHumidity = typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : undefined;
      const currentWind = typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : undefined;
      const currentWindGust = typeof current.wind_gusts_10m === "number" ? current.wind_gusts_10m : undefined;
      const currentWindDirection =
        typeof current.wind_direction_10m === "number" ? current.wind_direction_10m : undefined;
      const currentWeatherCode = typeof current.weather_code === "number" ? current.weather_code : undefined;

      setLatitude(String(nextLatitude));
      setLongitude(String(nextLongitude));
      setLocationLabel(`Device location ${nextLatitude}, ${nextLongitude}`);
      setOutsideTemperatureC(decimalInputValue(currentTemperature));
      setOutsideLowC(decimalInputValue(currentTemperature));
      setOutsideHighC(decimalInputValue(currentTemperature));
      setHumidityStartPercentage(decimalInputValue(currentHumidity));
      setHumidityLowPercentage(decimalInputValue(currentHumidity));
      setHumidityHighPercentage(decimalInputValue(currentHumidity));
      setWindSpeedKph(decimalInputValue(currentWind));
      setWindGustKph(decimalInputValue(currentWindGust));
      setWindDirection(windDirectionFromDegrees(currentWindDirection));
      setDewPointC(decimalInputValue(typeof current.dew_point_2m === "number" ? current.dew_point_2m : undefined));
      setAtmosphericPressureHpa(decimalInputValue(typeof current.pressure_msl === "number" ? current.pressure_msl : undefined));
      setSurfacePressureHpa(decimalInputValue(typeof current.surface_pressure === "number" ? current.surface_pressure : undefined));
      setCloudCoverPercentage(decimalInputValue(typeof current.cloud_cover === "number" ? current.cloud_cover : undefined));
      setPrecipitationMm(decimalInputValue(typeof current.precipitation === "number" ? current.precipitation : undefined));
      setWeatherCode(decimalInputValue(currentWeatherCode));
      setRainConditions(weatherCodeLabel(currentWeatherCode).toLowerCase());
      setWeatherNotes(`${weatherCodeLabel(currentWeatherCode)} from current location weather.`);
      setWeatherStatus("Outdoor reading added from location.");
    } catch (error) {
      setWeatherStatus(error instanceof Error ? error.message : "Location/weather unavailable. Enter reading manually.");
    }
  };

  const saveSetup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firing) return;
    const environmentPayload: FiringEnvironmentPayload = {
      kilnLocation,
      locationLabel: locationLabel.trim() || undefined,
      latitude: parseOptionalNumber(latitude),
      longitude: parseOptionalNumber(longitude),
      observedAt: new Date().toISOString(),
      weatherSource: weatherStatus.includes("location") ? "device location + Open-Meteo" : "manual",
      outsideStartTemperatureC: outdoorExposure ? parseOptionalNumber(outsideTemperatureC) : undefined,
      outsideLowC: outdoorExposure ? parseOptionalNumber(outsideLowC) : undefined,
      outsideHighC: outdoorExposure ? parseOptionalNumber(outsideHighC) : undefined,
      indoorAmbientTemperatureC: outdoorExposure ? undefined : parseOptionalNumber(indoorAmbientTemperatureC),
      humidityStartPercentage: parseOptionalNumber(humidityStartPercentage),
      humidityLowPercentage: parseOptionalNumber(humidityLowPercentage),
      humidityHighPercentage: parseOptionalNumber(humidityHighPercentage),
      windSpeedKph: parseOptionalNumber(windSpeedKph),
      windDirection: windDirection.trim() || undefined,
      windGustKph: parseOptionalNumber(windGustKph),
      dewPointC: parseOptionalNumber(dewPointC),
      atmosphericPressureHpa: parseOptionalNumber(atmosphericPressureHpa),
      surfacePressureHpa: parseOptionalNumber(surfacePressureHpa),
      cloudCoverPercentage: parseOptionalNumber(cloudCoverPercentage),
      precipitationMm: parseOptionalNumber(precipitationMm),
      weatherCode: parseOptionalNumber(weatherCode),
      rainConditions: rainConditions.trim() || undefined,
      ventilationNotes: ventilationNotes.trim() || undefined,
      weatherNotes: weatherNotes.trim() || undefined,
    };
    onUpdateSetup(firing.id, {
      kilnId,
      firingType,
      fuelType: fuelType.trim() || formatOptionLabel(FIRING_TYPE_OPTIONS, firingType),
      targetTemperatureC: Number(targetTemperatureC),
      targetCone: targetCone.trim() || firing.targetCone,
      atmosphere,
      environment: environmentPayload,
    });
    setSetupSaved("Kiln and atmospheric setup saved.");
  };

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteDraft.trim()) return;
    setSavedNote(noteDraft.trim());
    setNoteDraft("");
  };

  if (!firing) {
    return (
      <div className="kb-add-flow">
        <AddFlowHero
          icon={Flame}
          kicker="Live firing"
          title="Start live tracking"
          body="The active firing could not be found. Go back and start a new live firing."
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="kb-add-flow">
      <AddFlowHero
        icon={Flame}
        kicker="Live firing"
        title="Live tracker is running"
        body={`Started for ${viewer.displayName}. Add readings as the kiln changes; this is a record, not a kiln controller.`}
        onBack={onBack}
      />
      <section className="kb-panel kb-live-start">
        <div className="kb-live-start-main">
          <span className="kb-add-kind">Active now</span>
          <h2>{latest ? formatTemperature(latest.actualTemperatureC, "c") : "24C"}</h2>
          <p>
            {firing.title} · Target {formatTemperature(firing.targetTemperatureC, "c")} · Cone {firing.targetCone}
          </p>
          <div className="kb-chip-row">
            <VisibilityPill visibility={firing.visibility} />
            <span className="kb-chip">{firing.kilnNameSnapshot}</span>
            <span className="kb-chip">{atmosphere.replaceAll("_", " ")}</span>
          </div>
        </div>
        <button type="button" className="kb-flow-primary-action" onClick={onQuickReading}>
          <Thermometer size={24} />
          <span>Add temperature reading</span>
        </button>
      </section>
      <form className="kb-panel kb-flow-card kb-form kb-live-setup" onSubmit={saveSetup}>
        <div className="kb-section-title compact">
          <div>
            <p className="kb-kicker">Kiln and atmospheric setup</p>
            <h3>Record the kiln type, exposure, and weather conditions.</h3>
          </div>
          <button type="submit" className="kb-quiet-button">
            <Save size={17} />
            <span>Save setup</span>
          </button>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Kiln</span>
            <span className="kb-select-wrap">
              <select value={kilnId} onChange={(event) => handleKilnChange(event.target.value)}>
                {kilns.map((kiln) => (
                  <option key={kiln.id} value={kiln.id}>{kiln.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label>
            <span>Kiln type</span>
            <span className="kb-select-wrap">
              <select value={firingType} onChange={(event) => setFiringType(event.target.value as FiringType)}>
                {FIRING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Fuel or heat source</span>
            <input value={fuelType} onChange={(event) => setFuelType(event.target.value)} />
          </label>
          <label>
            <span>Firing atmosphere</span>
            <span className="kb-select-wrap">
              <select value={atmosphere} onChange={(event) => setAtmosphere(event.target.value as AtmosphereType)}>
                {ATMOSPHERE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Target C</span>
            <input type="number" value={targetTemperatureC} onChange={(event) => setTargetTemperatureC(event.target.value)} />
          </label>
          <label>
            <span>Target cone</span>
            <input value={targetCone} onChange={(event) => setTargetCone(event.target.value)} />
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Kiln exposure</span>
            <span className="kb-select-wrap">
              <select value={kilnLocation} onChange={(event) => setKilnLocation(event.target.value as KilnLocation)}>
                {KILN_LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label>
            <span>Location label</span>
            <input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} />
          </label>
        </div>
        {outdoorExposure ? (
          <div className="kb-atmosphere-reading">
            <div className="kb-flow-action-row">
              <button type="button" className="kb-primary-button" onClick={applyOutdoorLocationReading}>
                <CloudSun size={17} />
                <span>Use outdoor location reading</span>
              </button>
              <span className="kb-muted-note">{weatherStatus}</span>
            </div>
            <div className="kb-form-grid">
              <label>
                <span>Latitude</span>
                <input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
              </label>
              <label>
                <span>Longitude</span>
                <input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
              </label>
            </div>
            <div className="kb-form-grid three">
              <label>
                <span>Outside C</span>
                <input type="number" value={outsideTemperatureC} onChange={(event) => setOutsideTemperatureC(event.target.value)} />
              </label>
              <label>
                <span>Low C</span>
                <input type="number" value={outsideLowC} onChange={(event) => setOutsideLowC(event.target.value)} />
              </label>
              <label>
                <span>High C</span>
                <input type="number" value={outsideHighC} onChange={(event) => setOutsideHighC(event.target.value)} />
              </label>
            </div>
            <div className="kb-form-grid three">
              <label>
                <span>Humidity %</span>
                <input type="number" value={humidityStartPercentage} onChange={(event) => setHumidityStartPercentage(event.target.value)} />
              </label>
              <label>
                <span>Humidity low %</span>
                <input type="number" value={humidityLowPercentage} onChange={(event) => setHumidityLowPercentage(event.target.value)} />
              </label>
              <label>
                <span>Humidity high %</span>
                <input type="number" value={humidityHighPercentage} onChange={(event) => setHumidityHighPercentage(event.target.value)} />
              </label>
            </div>
            <div className="kb-form-grid three">
              <label>
                <span>Wind kph</span>
                <input type="number" value={windSpeedKph} onChange={(event) => setWindSpeedKph(event.target.value)} />
              </label>
              <label>
                <span>Gust kph</span>
                <input type="number" value={windGustKph} onChange={(event) => setWindGustKph(event.target.value)} />
              </label>
              <label>
                <span>Wind direction</span>
                <input value={windDirection} onChange={(event) => setWindDirection(event.target.value)} />
              </label>
            </div>
            <div className="kb-form-grid three">
              <label>
                <span>Dew point C</span>
                <input type="number" value={dewPointC} onChange={(event) => setDewPointC(event.target.value)} />
              </label>
              <label>
                <span>Pressure hPa</span>
                <input type="number" value={atmosphericPressureHpa} onChange={(event) => setAtmosphericPressureHpa(event.target.value)} />
              </label>
              <label>
                <span>Surface hPa</span>
                <input type="number" value={surfacePressureHpa} onChange={(event) => setSurfacePressureHpa(event.target.value)} />
              </label>
            </div>
            <div className="kb-form-grid three">
              <label>
                <span>Cloud cover %</span>
                <input type="number" value={cloudCoverPercentage} onChange={(event) => setCloudCoverPercentage(event.target.value)} />
              </label>
              <label>
                <span>Precip mm</span>
                <input type="number" value={precipitationMm} onChange={(event) => setPrecipitationMm(event.target.value)} />
              </label>
              <label>
                <span>Weather code</span>
                <input type="number" value={weatherCode} onChange={(event) => setWeatherCode(event.target.value)} />
              </label>
            </div>
            <label>
              <span>Rain or weather conditions</span>
              <input value={rainConditions} onChange={(event) => setRainConditions(event.target.value)} />
            </label>
          </div>
        ) : (
          <div className="kb-form-grid">
            <label>
              <span>Indoor ambient C</span>
              <input type="number" value={indoorAmbientTemperatureC} onChange={(event) => setIndoorAmbientTemperatureC(event.target.value)} />
            </label>
            <label>
              <span>Humidity %</span>
              <input type="number" value={humidityStartPercentage} onChange={(event) => setHumidityStartPercentage(event.target.value)} />
            </label>
          </div>
        )}
        <div className="kb-form-grid">
          <label>
            <span>Ventilation notes</span>
            <textarea value={ventilationNotes} onChange={(event) => setVentilationNotes(event.target.value)} />
          </label>
          <label>
            <span>Weather notes</span>
            <textarea value={weatherNotes} onChange={(event) => setWeatherNotes(event.target.value)} />
          </label>
        </div>
        {setupSaved && <p className="kb-muted-note">{setupSaved}</p>}
      </form>
      <div className="kb-flow-layout">
        <form className="kb-panel kb-flow-card kb-form" onSubmit={saveNote}>
          <label>
            <span>Firing note</span>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Damper change, cone movement, reduction note, odor, sound, or visual observation"
            />
          </label>
          <div className="kb-flow-action-row">
            <button type="submit" className="kb-quiet-button" disabled={!noteDraft.trim()}>
              <Save size={17} />
              <span>Save note</span>
            </button>
            <button
              type="button"
              className="kb-quiet-button"
              onClick={() =>
                setAtmosphere((current) =>
                  current === "oxidation" ? "reduction" : current === "reduction" ? "neutral" : "oxidation",
                )
              }
            >
              <Wind size={17} />
              <span>{atmosphere.replaceAll("_", " ")}</span>
            </button>
            <button type="button" className="kb-quiet-button" onClick={() => fileInputRef.current?.click()}>
              <Camera size={17} />
              <span>Photo</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/*"
            aria-label="Add live firing photo"
            onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")}
          />
          {(savedNote || photoName) && (
            <div className="kb-muted-note">
              {savedNote && <span>Latest note: {savedNote}</span>}
              {photoName && <span>Queued photo: {photoName}</span>}
            </div>
          )}
          <button type="button" className="kb-primary-button full" onClick={() => onFinishLiveFiring(firing.id)}>
            <Square size={15} />
            <span>End and save firing</span>
          </button>
        </form>
        <aside className="kb-panel kb-flow-sidebar">
          <p className="kb-kicker">Tracking cadence</p>
          <div className="kb-spec-list">
            <span>Logging interval <strong>{estimate.recommendedLoggingIntervalMinutes} min</strong></span>
            <span>Projected total <strong>{estimate.totalHoursRange[0]}-{estimate.totalHoursRange[1]} h</strong></span>
            <span>Readings <strong>{ratePoints.length}</strong></span>
            <span>Kiln type <strong>{formatOptionLabel(FIRING_TYPE_OPTIONS, firingType)}</strong></span>
            <span>Exposure <strong>{formatOptionLabel(KILN_LOCATION_OPTIONS, kilnLocation)}</strong></span>
            <span>Humidity <strong>{humidityStartPercentage || "n/a"}%</strong></span>
            <span>Wind <strong>{windSpeedKph || "0"} kph</strong></span>
            <span>
              Started{" "}
              <strong>{new Date(flow.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong>
            </span>
          </div>
          <p className="kb-safety-note">
            Manual readings are historical notes. Follow the kiln manufacturer, ventilation, and studio safety procedure while firing.
          </p>
        </aside>
      </div>
    </div>
  );
}

function PreviousFiringAddFlow({
  flow,
  kilns,
  glazes,
  clayBodies,
  onBack,
  onSave,
}: {
  flow: ActiveAddFlow;
  viewer: Profile;
  kilns: KilnProfile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  onBack: () => void;
  onSave: (payload: PreviousFiringPayload) => void;
}) {
  const [title, setTitle] = useState("Backfilled cone 6 firing");
  const [kilnId, setKilnId] = useState(kilns[0]?.id ?? "");
  const [glazeId, setGlazeId] = useState(glazes[0]?.id ?? "");
  const [clayBodyId, setClayBodyId] = useState(clayBodies[0]?.id ?? "");
  const [targetTemperatureC, setTargetTemperatureC] = useState("1222");
  const [targetCone, setTargetCone] = useState("6");
  const [actualStartAt, setActualStartAt] = useState(flow.startedAt.slice(0, 16));
  const [notes, setNotes] = useState("Liked the glaze response; adding the older firing for comparison.");
  const [visibility, setVisibility] = useState<AddVisibility>(flow.visibility);
  const canSave = title.trim().length >= 3 && kilnId && glazeId && clayBodyId;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      title: title.trim(),
      kilnId,
      glazeId,
      clayBodyId,
      targetTemperatureC: Number(targetTemperatureC),
      targetCone,
      actualStartAt: new Date(actualStartAt).toISOString(),
      visibility,
      notes,
    });
  };

  return (
    <div className="kb-add-flow">
      <AddFlowHero
        icon={CalendarDays}
        kicker="Previous firing"
        title="Backfill the firing details you remember."
        body="Connect the old firing to the glaze or clay result that made it worth saving."
        onBack={onBack}
      />
      <form className="kb-panel kb-flow-card kb-form" onSubmit={submit}>
        <label>
          <span>Firing name</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="kb-form-grid">
          <label>
            <span>Date and time</span>
            <input type="datetime-local" value={actualStartAt} onChange={(event) => setActualStartAt(event.target.value)} />
          </label>
          <label>
            <span>Kiln</span>
            <span className="kb-select-wrap">
              <select value={kilnId} onChange={(event) => setKilnId(event.target.value)}>
                {kilns.map((kiln) => (
                  <option key={kiln.id} value={kiln.id}>{kiln.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Glaze</span>
            <span className="kb-select-wrap">
              <select value={glazeId} onChange={(event) => setGlazeId(event.target.value)}>
                {glazes.map((glaze) => (
                  <option key={glaze.id} value={glaze.id}>{glaze.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label>
            <span>Clay body</span>
            <span className="kb-select-wrap">
              <select value={clayBodyId} onChange={(event) => setClayBodyId(event.target.value)}>
                {clayBodies.map((clay) => (
                  <option key={clay.id} value={clay.id}>{clay.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Target C</span>
            <input type="number" value={targetTemperatureC} onChange={(event) => setTargetTemperatureC(event.target.value)} />
          </label>
          <label>
            <span>Cone</span>
            <input value={targetCone} onChange={(event) => setTargetCone(event.target.value)} />
          </label>
        </div>
        <label>
          <span>What mattered</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <VisibilitySelector value={visibility} onChange={setVisibility} />
        <button type="submit" className="kb-primary-button full" disabled={!canSave}>
          <Save size={17} />
          <span>Save previous firing</span>
        </button>
      </form>
    </div>
  );
}

function GlazeResultAddFlow({
  flow,
  firings,
  glazes,
  clayBodies,
  onBack,
  onSave,
}: {
  flow: ActiveAddFlow;
  viewer: Profile;
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  onBack: () => void;
  onSave: (payload: GlazeResultPayload) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("Glaze result");
  const [firingId, setFiringId] = useState(firings[0]?.id ?? "");
  const [glazeId, setGlazeId] = useState(glazes[0]?.id ?? "");
  const [clayBodyId, setClayBodyId] = useState(clayBodies[0]?.id ?? "");
  const [rating, setRating] = useState(86);
  const [imageName, setImageName] = useState("");
  const [visibility, setVisibility] = useState<AddVisibility>(flow.visibility);
  const canSave = title.trim().length >= 3 && firingId && glazeId && clayBodyId;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      title: title.trim(),
      firingId,
      glazeId,
      clayBodyId,
      rating,
      visibility,
      imageName,
    });
  };

  return (
    <div className="kb-add-flow">
      <AddFlowHero
        icon={Camera}
        kicker="Glaze result"
        title="Add the image, then tag the process behind it."
        body="Each result can connect to a firing, one glaze, one clay body, and profile visibility."
        onBack={onBack}
      />
      <div className="kb-flow-layout">
        <form className="kb-panel kb-flow-card kb-form" onSubmit={submit}>
          <button type="button" className="kb-flow-upload" onClick={() => fileInputRef.current?.click()}>
            <Upload size={24} />
            <span>{imageName || "Choose result image"}</span>
          </button>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/*"
            aria-label="Choose glaze result image"
            onChange={(event) => setImageName(event.target.files?.[0]?.name ?? "")}
          />
          <label>
            <span>Result title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="kb-form-grid">
            <label>
              <span>Firing</span>
              <span className="kb-select-wrap">
                <select value={firingId} onChange={(event) => setFiringId(event.target.value)}>
                  {firings.map((firing) => (
                    <option key={firing.id} value={firing.id}>{firing.readableNumber} · {firing.title}</option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
            <label>
              <span>Glaze</span>
              <span className="kb-select-wrap">
                <select value={glazeId} onChange={(event) => setGlazeId(event.target.value)}>
                  {glazes.map((glaze) => (
                    <option key={glaze.id} value={glaze.id}>{glaze.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          </div>
          <label>
            <span>Clay body</span>
            <span className="kb-select-wrap">
              <select value={clayBodyId} onChange={(event) => setClayBodyId(event.target.value)}>
                {clayBodies.map((clay) => (
                  <option key={clay.id} value={clay.id}>{clay.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label>
            <span>Result score: {rating}</span>
            <input type="range" min="1" max="100" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
          </label>
          <VisibilitySelector value={visibility} onChange={setVisibility} />
          <button type="submit" className="kb-primary-button full" disabled={!canSave}>
            <Save size={17} />
            <span>Save glaze result</span>
          </button>
        </form>
        <aside className="kb-panel kb-flow-sidebar">
          <p className="kb-kicker">Image tags</p>
          <h3>{title}</h3>
          <div className="kb-ceramic-photo pale" />
          <div className="kb-chip-row">
            <span className="kb-chip image">{glazes.find((glaze) => glaze.id === glazeId)?.name ?? "Glaze"}</span>
            <span className="kb-chip clay">{clayBodies.find((clay) => clay.id === clayBodyId)?.name ?? "Clay body"}</span>
            <span className="kb-chip record">{firings.find((firing) => firing.id === firingId)?.readableNumber ?? "Firing"}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function HomeScreen({
  feedTab,
  onFeedTabChange,
  posts,
  firings,
  glazes,
  clayBodies,
  kilns,
  onOpenExplore,
  onCreateGlazeProfile,
  onCreateClayBodyProfile,
  onCreateKilnProfile,
}: {
  feedTab: "Following" | "Popular";
  onFeedTabChange: (tab: "Following" | "Popular") => void;
  posts: Post[];
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  kilns: KilnProfile[];
  onOpenExplore: () => void;
  onCreateGlazeProfile: () => GlazeProfile;
  onCreateClayBodyProfile: () => ClayBodyProfile;
  onCreateKilnProfile: () => KilnProfile;
}) {
  const firingById = useMemo(() => createRecordMap(firings), [firings]);
  const glazeById = useMemo(() => createRecordMap(glazes), [glazes]);
  const clayBodyById = useMemo(() => createRecordMap(clayBodies), [clayBodies]);

  return (
    <div className="kb-grid-two kb-home-grid">
      <section className="kb-panel kb-feed-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Home feed</p>
            <h2>Ceramic process from people you follow</h2>
          </div>
          <div className="kb-segmented" role="tablist" aria-label="Feed tabs">
            {(["Following", "Popular"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={feedTab === tab}
                type="button"
                className={feedTab === tab ? "active" : ""}
                onClick={() => onFeedTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <PostComposer
          glazes={glazes}
          clayBodies={clayBodies}
          kilns={kilns}
          firings={firings}
          onCreateGlazeProfile={onCreateGlazeProfile}
          onCreateClayBodyProfile={onCreateClayBodyProfile}
          onCreateKilnProfile={onCreateKilnProfile}
        />
        <div className="kb-feed-list">
          {posts.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Your Following feed is quiet"
              body="Follow profiles or switch to Popular to see recent shared firing results."
              actionLabel="Explore profiles"
              onAction={onOpenExplore}
            />
          ) : (
            posts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                firing={post.linkedFiringId ? firingById.get(post.linkedFiringId) : undefined}
                glaze={post.linkedGlazeId ? glazeById.get(post.linkedGlazeId) : undefined}
                clayBody={post.linkedClayBodyId ? clayBodyById.get(post.linkedClayBodyId) : undefined}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

type ComposerImageDraft = {
  id: string;
  label: string;
  tone: "dark" | "pale";
  glazeIds: string[];
  clayBodyIds: string[];
};

type PickerOption = {
  label: string;
  detail?: string;
  icon: LucideIcon;
  onSelect: () => void;
};

type PickerGroup = {
  label: string;
  options: PickerOption[];
};

function PostComposer({
  glazes,
  clayBodies,
  kilns,
  firings,
  onCreateGlazeProfile,
  onCreateClayBodyProfile,
  onCreateKilnProfile,
}: {
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  kilns: KilnProfile[];
  firings: FiringRecord[];
  onCreateGlazeProfile: () => GlazeProfile;
  onCreateClayBodyProfile: () => ClayBodyProfile;
  onCreateKilnProfile: () => KilnProfile;
}) {
  const [postText, setPostText] = useState("");
  const [publishNotice, setPublishNotice] = useState("");
  const [selectedFiringId, setSelectedFiringId] = useState("");
  const [selectedGlazeIds, setSelectedGlazeIds] = useState<string[]>([]);
  const [selectedClayBodyIds, setSelectedClayBodyIds] = useState<string[]>([]);
  const [selectedKilnIds, setSelectedKilnIds] = useState<string[]>([]);
  const [composerImages, setComposerImages] = useState<ComposerImageDraft[]>([]);

  const selectedFiring = firings.find((firing) => firing.id === selectedFiringId);
  const hasImageTags = composerImages.some(
    (image) => image.glazeIds.length > 0 || image.clayBodyIds.length > 0,
  );
  const canPublish =
    Boolean(postText.trim()) ||
    Boolean(selectedFiringId) ||
    selectedGlazeIds.length > 0 ||
    selectedClayBodyIds.length > 0 ||
    selectedKilnIds.length > 0 ||
    hasImageTags;

  const addUnique = (values: string[], value: string) =>
    value && !values.includes(value) ? [...values, value] : values;

  const addImageGlaze = (imageId: string, glazeId: string) => {
    setComposerImages((images) =>
      images.map((image) =>
        image.id === imageId
          ? { ...image, glazeIds: addUnique(image.glazeIds, glazeId) }
          : image,
      ),
    );
  };

  const addImageClayBody = (imageId: string, clayBodyId: string) => {
    setComposerImages((images) =>
      images.map((image) =>
        image.id === imageId
          ? { ...image, clayBodyIds: addUnique(image.clayBodyIds, clayBodyId) }
          : image,
      ),
    );
  };

  const createAndLinkGlaze = () => {
    const profile = onCreateGlazeProfile();
    setSelectedGlazeIds((ids) => addUnique(ids, profile.id));
  };

  const createAndLinkClayBody = () => {
    const profile = onCreateClayBodyProfile();
    setSelectedClayBodyIds((ids) => addUnique(ids, profile.id));
  };

  const createAndLinkKiln = () => {
    const profile = onCreateKilnProfile();
    setSelectedKilnIds((ids) => addUnique(ids, profile.id));
  };

  const createAndTagImageGlaze = (imageId: string) => {
    const profile = onCreateGlazeProfile();
    addImageGlaze(imageId, profile.id);
  };

  const createAndTagImageClayBody = (imageId: string) => {
    const profile = onCreateClayBodyProfile();
    addImageClayBody(imageId, profile.id);
  };

  const removeImageGlaze = (imageId: string, glazeId: string) => {
    setComposerImages((images) =>
      images.map((image) =>
        image.id === imageId
          ? { ...image, glazeIds: image.glazeIds.filter((id) => id !== glazeId) }
          : image,
      ),
    );
  };

  const removeImageClayBody = (imageId: string, clayBodyId: string) => {
    setComposerImages((images) =>
      images.map((image) =>
        image.id === imageId
          ? { ...image, clayBodyIds: image.clayBodyIds.filter((id) => id !== clayBodyId) }
          : image,
      ),
    );
  };

  const addImageDraft = () => {
    setComposerImages((images) => [
      ...images,
      {
        id: `composer-image-${Date.now()}`,
        label: `Image ${images.length + 1}`,
        tone: images.length % 2 === 0 ? "dark" : "pale",
        glazeIds: [],
        clayBodyIds: [],
      },
    ]);
  };

  const handlePublish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPublish) {
      setPublishNotice("Add text, a record link, or an image tag before publishing.");
      return;
    }
    setPublishNotice("Post draft is ready with the selected links and image tags.");
    setPostText("");
  };

  return (
    <form className="kb-composer" onSubmit={handlePublish}>
      <label>
        <span className="sr-only">Post text</span>
        <textarea
          value={postText}
          onChange={(event) => setPostText(event.target.value)}
          placeholder="Post an old firing, a glaze result you liked, or a kiln-opening note. Link only the process data you want to share."
          rows={3}
        />
      </label>
      <div className="kb-composer-grid">
        <section className="kb-compose-module" aria-labelledby="post-record-links">
          <div className="kb-module-head">
            <div>
              <p className="kb-kicker" id="post-record-links">Optional record links</p>
              <strong>Choose what the post should connect to</strong>
            </div>
            <VisibilityPill visibility="followers" />
          </div>
          <div className="kb-compose-controls compact">
            <label className="kb-select-field">
              <span>Firing record</span>
              <span className="kb-select-wrap">
                <select
                  aria-label="Link firing"
                  value={selectedFiringId}
                  onChange={(event) => setSelectedFiringId(event.target.value)}
                >
                  <option value="">No firing linked</option>
                  {firings.map((firing) => (
                    <option key={firing.id} value={firing.id}>
                      {firing.readableNumber} · {firing.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
            <div className="kb-select-field">
              <span>Profiles</span>
              <InlinePicker
                label="Add profile"
                icon={Plus}
                groups={[
                  {
                    label: "Create profile",
                    options: [
                      {
                        label: "New glaze profile",
                        detail: "Create and link a draft glaze",
                        icon: Layers3,
                        onSelect: createAndLinkGlaze,
                      },
                      {
                        label: "New clay body profile",
                        detail: "Create and link a draft clay body",
                        icon: Microscope,
                        onSelect: createAndLinkClayBody,
                      },
                      {
                        label: "New kiln profile",
                        detail: "Create and link a draft kiln",
                        icon: Gauge,
                        onSelect: createAndLinkKiln,
                      },
                    ],
                  },
                  {
                    label: "Glazes",
                    options: glazes.map((glaze) => ({
                      label: glaze.name,
                      detail: glaze.coneRange,
                      icon: Layers3,
                      onSelect: () =>
                        setSelectedGlazeIds((ids) => addUnique(ids, glaze.id)),
                    })),
                  },
                  {
                    label: "Clay bodies",
                    options: clayBodies.map((clay) => ({
                      label: clay.name,
                      detail: clay.coneRange,
                      icon: Microscope,
                      onSelect: () =>
                        setSelectedClayBodyIds((ids) => addUnique(ids, clay.id)),
                    })),
                  },
                  {
                    label: "Kilns",
                    options: kilns.map((kiln) => ({
                      label: kiln.name,
                      detail: kiln.recommendedConeRange,
                      icon: Gauge,
                      onSelect: () =>
                        setSelectedKilnIds((ids) => addUnique(ids, kiln.id)),
                    })),
                  },
                ]}
              />
            </div>
          </div>
          <div className="kb-selected-summary">
            {selectedFiring && (
              <span className="kb-chip record">
                <Flame size={14} aria-hidden="true" />
                {selectedFiring.readableNumber}
              </span>
            )}
            {selectedGlazeIds.map((glazeId) => {
              const glaze = glazes.find((item) => item.id === glazeId);
              return (
                <button
                  type="button"
                  className="kb-chip removable"
                  key={glazeId}
                  onClick={() =>
                    setSelectedGlazeIds((ids) => ids.filter((id) => id !== glazeId))
                  }
                >
                  <Layers3 size={14} aria-hidden="true" />
                  {glaze?.name ?? glazeId}
                  <CircleX size={14} aria-hidden="true" />
                </button>
              );
            })}
            {selectedClayBodyIds.map((clayBodyId) => {
              const clay = clayBodies.find((item) => item.id === clayBodyId);
              return (
                <button
                  type="button"
                  className="kb-chip removable clay"
                  key={clayBodyId}
                  onClick={() =>
                    setSelectedClayBodyIds((ids) => ids.filter((id) => id !== clayBodyId))
                  }
                >
                  <Microscope size={14} aria-hidden="true" />
                  {clay?.name ?? clayBodyId}
                  <CircleX size={14} aria-hidden="true" />
                </button>
              );
            })}
            {selectedKilnIds.map((kilnId) => {
              const kiln = kilns.find((item) => item.id === kilnId);
              return (
                <button
                  type="button"
                  className="kb-chip removable kiln"
                  key={kilnId}
                  onClick={() =>
                    setSelectedKilnIds((ids) => ids.filter((id) => id !== kilnId))
                  }
                >
                  <Gauge size={14} aria-hidden="true" />
                  {kiln?.name ?? kilnId}
                  <CircleX size={14} aria-hidden="true" />
                </button>
              );
            })}
            {!selectedFiring &&
              selectedGlazeIds.length === 0 &&
              selectedClayBodyIds.length === 0 &&
              selectedKilnIds.length === 0 && (
                <span className="kb-muted-note">No record links selected</span>
              )}
          </div>
        </section>
        <section className="kb-compose-module" aria-labelledby="post-image-tags">
          <div className="kb-module-head">
            <div>
              <p className="kb-kicker" id="post-image-tags">Images</p>
              <strong>Each image can show different glazes</strong>
            </div>
            <button type="button" className="kb-quiet-button" onClick={addImageDraft}>
              <ImageIcon size={17} />
              <span>Add image</span>
            </button>
          </div>
          <div className="kb-image-tag-list">
            {composerImages.length === 0 ? (
              <div className="kb-empty-inline">
                <ImageIcon size={18} aria-hidden="true" />
                <span>Add images when a photo needs its own glaze or clay body tags.</span>
              </div>
            ) : composerImages.map((image) => (
              <div className="kb-image-tag-card" key={image.id}>
                <div className={`kb-ceramic-thumb ${image.tone}`} />
                <div>
                  <div className="kb-image-card-head">
                    <strong>{image.label}</strong>
                    {composerImages.length > 1 && (
                      <button
                        type="button"
                        className="kb-icon-button mini"
                        aria-label={`Remove ${image.label}`}
                        onClick={() =>
                          setComposerImages((images) =>
                            images.filter((item) => item.id !== image.id),
                          )
                        }
                      >
                        <CircleX size={15} />
                      </button>
                    )}
                  </div>
                  <div className="kb-selected-summary compact">
                    {image.glazeIds.map((glazeId) => {
                      const glaze = glazes.find((item) => item.id === glazeId);
                      return (
                        <button
                          type="button"
                          className="kb-chip removable image"
                          key={glazeId}
                          onClick={() => removeImageGlaze(image.id, glazeId)}
                        >
                          {glaze?.name ?? glazeId}
                          <CircleX size={13} aria-hidden="true" />
                        </button>
                      );
                    })}
                    {image.clayBodyIds.map((clayBodyId) => {
                      const clay = clayBodies.find((item) => item.id === clayBodyId);
                      return (
                        <button
                          type="button"
                          className="kb-chip removable image clay"
                          key={clayBodyId}
                          onClick={() => removeImageClayBody(image.id, clayBodyId)}
                        >
                          {clay?.name ?? clayBodyId}
                          <CircleX size={13} aria-hidden="true" />
                        </button>
                      );
                    })}
                    {image.glazeIds.length === 0 && image.clayBodyIds.length === 0 && (
                      <span className="kb-muted-note">No image tags yet</span>
                    )}
                  </div>
                  <div className="kb-inline-controls">
                    <InlinePicker
                      label="Tag glaze or clay"
                      icon={Plus}
                      compact
                      groups={[
                        {
                          label: "Create profile",
                          options: [
                            {
                              label: "New glaze profile",
                              detail: "Create and tag this image",
                              icon: Layers3,
                              onSelect: () => createAndTagImageGlaze(image.id),
                            },
                            {
                              label: "New clay body profile",
                              detail: "Create and tag this image",
                              icon: Microscope,
                              onSelect: () => createAndTagImageClayBody(image.id),
                            },
                          ],
                        },
                        {
                          label: "Glazes",
                          options: glazes.map((glaze) => ({
                            label: glaze.name,
                            detail: glaze.coneRange,
                            icon: Layers3,
                            onSelect: () => addImageGlaze(image.id, glaze.id),
                          })),
                        },
                        {
                          label: "Clay bodies",
                          options: clayBodies.map((clay) => ({
                            label: clay.name,
                            detail: clay.coneRange,
                            icon: Microscope,
                            onSelect: () => addImageClayBody(image.id, clay.id),
                          })),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="kb-composer-footer">
        <p>Public previews read from canonical records and only include fields the viewer is authorized to see.</p>
        <button type="submit" className="kb-primary-button" disabled={!canPublish}>
          <Send size={17} />
          <span>Publish</span>
        </button>
      </div>
      {publishNotice && <p className="kb-muted-note">{publishNotice}</p>}
    </form>
  );
}

function InlinePicker({
  label,
  icon: Icon,
  groups,
  compact = false,
}: {
  label: string;
  icon: LucideIcon;
  groups: PickerGroup[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const availableGroups = groups
    .map((group) => ({
      ...group,
      options: group.options.filter(Boolean),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <div
      className={["kb-picker", compact ? "compact" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget instanceof Node ? event.relatedTarget : null;
        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="kb-picker-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon size={16} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="kb-picker-menu" role="menu">
          {availableGroups.map((group) => (
            <div className="kb-picker-group" key={group.label}>
              <span>{group.label}</span>
              {group.options.map((option, optionIndex) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    type="button"
                    role="menuitem"
                    key={`${group.label}-${option.label}-${optionIndex}`}
                    onClick={() => {
                      option.onSelect();
                      setOpen(false);
                    }}
                  >
                    <OptionIcon size={16} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                      {option.detail && <small>{option.detail}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedCard({
  post,
  firing,
  glaze,
  clayBody,
}: {
  post: Post;
  firing?: FiringRecord;
  glaze?: GlazeProfile;
  clayBody?: ClayBodyProfile;
}) {
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [commenting, setCommenting] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleLike = () => {
    setLiked((current) => {
      setLikes((count) => count + (current ? -1 : 1));
      return !current;
    });
  };

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentDraft.trim()) return;
    setComments((count) => count + 1);
    setCommentDraft("");
    setCommenting(false);
  };

  return (
    <article className="kb-feed-card">
      <div className="kb-feed-author">
        <div className="kb-avatar">{post.authorName.slice(0, 1)}</div>
        <div>
          <strong>{post.authorName}</strong>
          <span>@{post.authorUsername} · {relativeDate(post.createdAt)}</span>
        </div>
        <VisibilityPill visibility={post.visibility} />
      </div>
      <p>{post.body}</p>
      <div className="kb-image-strip" aria-label="Post images">
        <div className="kb-ceramic-photo dark" />
        <div className="kb-ceramic-photo pale" />
      </div>
      {firing && (
        <div className="kb-record-preview">
          <Flame size={18} aria-hidden="true" />
          <div>
            <strong>{firing.readableNumber}: {firing.title}</strong>
            <span>
              {firing.kilnNameSnapshot} · Cone {firing.targetCone} · {formatTemperature(firing.targetTemperatureC, "c")}
            </span>
          </div>
        </div>
      )}
      <div className="kb-chip-row">
        {post.structuredTagLabels.map((tag) => (
          <span className="kb-chip record" key={tag}>{tag}</span>
        ))}
        {glaze && <span className="kb-chip image">{glaze.surface}</span>}
        {clayBody && <span className="kb-chip image clay">{clayBody.bodyType}</span>}
      </div>
      <div className="kb-feed-actions">
        <button type="button" aria-pressed={liked} onClick={toggleLike}>
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
          <span>{likes}</span>
        </button>
        <button type="button" aria-expanded={commenting} onClick={() => setCommenting((open) => !open)}>
          <MessageCircle size={17} />
          <span>{comments}</span>
        </button>
        <button type="button" aria-pressed={saved} onClick={() => setSaved((current) => !current)}>
          <BookOpen size={17} fill={saved ? "currentColor" : "none"} />
          <span>{saved ? "Saved" : "Save"}</span>
        </button>
      </div>
      {commenting && (
        <form className="kb-inline-comment" onSubmit={handleCommentSubmit}>
          <input
            aria-label={`Comment on ${post.authorName}'s post`}
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Add a concise process note"
          />
          <button type="submit" className="kb-primary-button" disabled={!commentDraft.trim()}>
            <Send size={16} />
            <span>Post</span>
          </button>
        </form>
      )}
    </article>
  );
}

function DashboardScreen({
  firings,
  glazes,
  clayBodies,
  selectedFiring,
  ratePoints,
}: {
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  selectedFiring?: FiringRecord;
  ratePoints: ReturnType<typeof calculateRateOfChange>;
}) {
  const [timeframe, setTimeframe] = useState<"7" | "30" | "90" | "365" | "all">("90");
  const timeframeLabel =
    timeframe === "all" ? "All time" : timeframe === "365" ? "This year" : `Last ${timeframe} days`;
  const latestFiringTime = Math.max(
    ...firings
      .map((firing) => new Date(firing.actualStartAt ?? firing.plannedStartAt ?? 0).getTime())
      .filter(Number.isFinite),
  );
  const filteredFirings = firings.filter((firing) => {
    if (timeframe === "all") return true;
    const timestamp = firing.actualStartAt ?? firing.plannedStartAt;
    if (!timestamp) return false;
    return latestFiringTime - new Date(timestamp).getTime() <= Number(timeframe) * 24 * 60 * 60 * 1000;
  });
  const completed = filteredFirings.filter((firing) => firing.status === "completed");
  const kilnHours = completed.reduce(
    (total, firing) => total + (firing.totalHeatingMinutes ?? 0) / 60,
    0,
  );
  const successAverage =
    completed.reduce((total, firing) => total + (firing.successRating ?? 0), 0) /
    Math.max(completed.length, 1);

  return (
    <div className="kb-stack">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">{timeframeLabel}</p>
            <h2>Firing and process dashboard</h2>
          </div>
          <span className="kb-select-wrap kb-timeframe-select">
            <select
              aria-label="Dashboard timeframe"
              value={timeframe}
              onChange={(event) =>
                setTimeframe(event.target.value as "7" | "30" | "90" | "365" | "all")
              }
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">This year</option>
              <option value="all">All time</option>
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </div>
        <div className="kb-metrics">
          <MetricCard label="Total firings" value={String(filteredFirings.length)} detail={`${completed.length} completed`} icon={Flame} />
          <MetricCard label="Kiln hours" value={kilnHours.toFixed(1)} detail="Heating time recorded" icon={Gauge} />
          <MetricCard label="Successful results" value={`${Math.round(successAverage)}%`} detail="Based on rated applications" icon={CheckCircle2} />
          <MetricCard label="Glaze tests" value={String(glazes.length + 5)} detail={`${clayBodies.length} clay bodies represented`} icon={Layers3} />
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Actual curve · {selectedFiring?.readableNumber}</h3>
            <span>Manual readings</span>
          </div>
          <div className="kb-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ratePoints}>
                <CartesianGrid strokeDasharray="4 6" stroke={BRAND_CHART_COLORS.grid} />
                <XAxis dataKey="elapsedMinutes" tickFormatter={(value) => `${value / 60}h`} />
                <YAxis tickFormatter={(value) => `${value}C`} />
                <Tooltip formatter={(value) => [`${value}C`, "Temperature"]} />
                <Line type="monotone" dataKey="actualTemperatureC" stroke={BRAND_CHART_COLORS.actual} strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="targetTemperatureC" stroke={BRAND_CHART_COLORS.target} strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Firings by atmosphere</h3>
            <span>Clear unit labels</span>
          </div>
          <div className="kb-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={atmosphereData(filteredFirings)}>
                <CartesianGrid strokeDasharray="4 6" stroke={BRAND_CHART_COLORS.grid} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={BRAND_CHART_COLORS.barPrimary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function FiringsScreen({
  firings,
  selectedFiring,
  kilns,
  glazes,
  clayBodies,
  applications,
  ratePoints,
  estimate,
  imageTags,
  onSelectFiring,
  onQuickReading,
  onCreateFiring,
  onTagsChange,
  addDrafts,
}: {
  firings: FiringRecord[];
  selectedFiring: FiringRecord;
  kilns: KilnProfile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  applications: { firingId: string; glazeId: string; clayBodyId: string | null; resultRating?: number; resultStatus: string }[];
  ratePoints: ReturnType<typeof calculateRateOfChange>;
  estimate: ReturnType<typeof estimateFiringDuration>;
  imageTags: string[];
  onSelectFiring: (id: string) => void;
  onQuickReading: () => void;
  onCreateFiring: (values: FiringFormValues) => void;
  onTagsChange: (tags: string[]) => void;
  addDrafts: AddDraft[];
}) {
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Firing journal</p>
            <h2>Records, live firing, schedule, and results</h2>
          </div>
        </div>
        <AddDraftList drafts={addDrafts} />
        <div className="kb-firing-layout">
          <div className="kb-list">
            {firings.map((firing) => (
              <button
                key={firing.id}
                type="button"
                className={selectedFiring.id === firing.id ? "active" : ""}
                onClick={() => onSelectFiring(firing.id)}
              >
                <strong>{firing.readableNumber}</strong>
                <span>{firing.title}</span>
                <small>{firing.status.replaceAll("_", " ")} · Cone {firing.targetCone}</small>
              </button>
            ))}
          </div>
          <div className="kb-detail">
            <div className="kb-detail-head">
              <div>
                <h3>{selectedFiring.title}</h3>
                <span>{selectedFiring.kilnNameSnapshot} · {selectedFiring.kilnSpecSnapshot}</span>
              </div>
              <VisibilityPill visibility={selectedFiring.visibility} />
            </div>
            <div className="kb-metrics compact">
              <MetricCard label="Target" value={formatTemperature(selectedFiring.targetTemperatureC, "c")} detail={`Cone ${selectedFiring.targetCone}`} icon={Thermometer} />
              <MetricCard label="Atmosphere" value={selectedFiring.atmosphere.replaceAll("_", " ")} detail={selectedFiring.firingType} icon={CloudSun} />
              <MetricCard label="Load" value={`${selectedFiring.loadFullnessPercentage}%`} detail="Estimated fullness" icon={ClipboardList} />
            </div>
            <LiveFiringPanel
              selectedFiring={selectedFiring}
              ratePoints={ratePoints}
              estimate={estimate}
              onQuickReading={onQuickReading}
            />
            <ScheduleEditor ratePoints={ratePoints} />
            <ResultPanel
              applications={applications.filter((app) => app.firingId === selectedFiring.id)}
              glazes={glazes}
              clayBodies={clayBodies}
              imageTags={imageTags}
              onTagsChange={onTagsChange}
            />
          </div>
        </div>
      </section>
      <aside className="kb-stack">
        <CreateFiringForm kilns={kilns} glazes={glazes} clayBodies={clayBodies} onSubmit={onCreateFiring} />
        <FiringComparison firings={firings} />
      </aside>
    </div>
  );
}

function LiveFiringPanel({
  selectedFiring,
  ratePoints,
  estimate,
  onQuickReading,
}: {
  selectedFiring: FiringRecord;
  ratePoints: ReturnType<typeof calculateRateOfChange>;
  estimate: ReturnType<typeof estimateFiringDuration>;
  onQuickReading: () => void;
}) {
  const latest = ratePoints.at(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [atmosphere, setAtmosphere] = useState(selectedFiring.atmosphere);
  const [photoName, setPhotoName] = useState("");

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteDraft.trim()) return;
    setSavedNote(noteDraft.trim());
    setNoteDraft("");
  };

  return (
    <section className="kb-live-panel">
      <div>
        <p className="kb-kicker">Live firing mode</p>
        <h3>{latest ? formatTemperature(latest.actualTemperatureC, "c") : "No readings"}</h3>
        <span>
          Target {formatTemperature(selectedFiring.targetTemperatureC, "c")} · Rate{" "}
          {latest?.rateCPerHour ? `${latest.rateCPerHour} C/hr` : "pending"}
        </span>
      </div>
      <div className="kb-live-actions">
        <button type="button" onClick={onQuickReading}>
          <Thermometer size={19} />
          <span>Add reading</span>
        </button>
        <button type="button" onClick={() => setNoteDraft((value) => value || "Damper held steady; cones beginning to bend.")}>
          <ClipboardList size={19} />
          <span>Note</span>
        </button>
        <button
          type="button"
          onClick={() =>
            setAtmosphere((current) =>
              current === "oxidation" ? "reduction" : current === "reduction" ? "neutral" : "oxidation",
            )
          }
        >
          <Wind size={19} />
          <span>Atmosphere</span>
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          <Camera size={19} />
          <span>Photo</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        hidden
        type="file"
        accept="image/*"
        aria-label="Add firing photo"
        onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")}
      />
      <form className="kb-live-tool-panel" onSubmit={saveNote}>
        <label>
          <span>Firing note</span>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add an observation from this firing"
          />
        </label>
        <button type="submit" className="kb-quiet-button" disabled={!noteDraft.trim()}>
          Save note
        </button>
      </form>
      {(savedNote || photoName) && (
        <div className="kb-muted-note">
          {savedNote && <span>Latest note: {savedNote}</span>}
          {photoName && <span>Queued photo: {photoName}</span>}
        </div>
      )}
      <p className="kb-safety-note">
        Current atmosphere note: {atmosphere.replaceAll("_", " ")}. Advisory range {estimate.totalHoursRange[0]}-{estimate.totalHoursRange[1]} hours. Manual readings are not kiln-control data; follow kiln manufacturer and local safety procedures.
      </p>
    </section>
  );
}

function ScheduleEditor({
  ratePoints,
}: {
  ratePoints: ReturnType<typeof calculateRateOfChange>;
}) {
  const [mode, setMode] = useState<"Graph" | "Table" | "Segments">("Graph");
  const segmentPoints = ratePoints.slice(-3);

  return (
    <section className="kb-subpanel">
      <div className="kb-section-title compact">
        <h3>Schedule editor</h3>
        <div className="kb-segmented small" role="tablist" aria-label="Schedule editor modes">
          {(["Graph", "Table", "Segments"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              className={mode === item ? "active" : ""}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {mode === "Graph" && (
        <div className="kb-chart short">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ratePoints}>
              <defs>
                <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND_CHART_COLORS.actual} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={BRAND_CHART_COLORS.actual} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke={BRAND_CHART_COLORS.grid} />
              <XAxis dataKey="elapsedMinutes" tickFormatter={(value) => `${value / 60}h`} />
              <YAxis tickFormatter={(value) => `${value}C`} />
              <Tooltip />
              <Area type="monotone" dataKey="actualTemperatureC" stroke={BRAND_CHART_COLORS.actual} fill="url(#curveFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {mode === "Table" && (
        <div className="kb-log-table" role="table" aria-label="Firing log readings">
          <div role="row">
            <span role="columnheader">Elapsed</span>
            <span role="columnheader">Actual</span>
            <span role="columnheader">Rate</span>
            <span role="columnheader">Atmosphere</span>
          </div>
          {ratePoints.slice(-4).map((point) => (
            <div role="row" key={point.id}>
              <span role="cell">{point.elapsedMinutes} min</span>
              <span role="cell">{formatTemperature(point.actualTemperatureC, "c")}</span>
              <span role="cell">{point.rateCPerHour ? `${point.rateCPerHour} C/hr` : "first point"}</span>
              <span role="cell">{point.atmosphere?.replaceAll("_", " ") ?? "not set"}</span>
            </div>
          ))}
        </div>
      )}
      {mode === "Segments" && (
        <div className="kb-comparison-list">
          {segmentPoints.map((point, index) => (
            <div key={point.id}>
              <strong>Segment {index + 1}</strong>
              <span>{point.elapsedMinutes} min · {formatTemperature(point.actualTemperatureC, "c")}</span>
              <progress
                value={Math.min(point.actualTemperatureC, 1300)}
                max={1300}
                aria-label={`Segment ${index + 1} temperature progress`}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ResultPanel({
  applications,
  glazes,
  clayBodies,
  imageTags,
  onTagsChange,
}: {
  applications: { glazeId: string; clayBodyId: string | null; resultRating?: number; resultStatus: string }[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  imageTags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const suggestedTags = glazes.slice(0, 3);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [queuedImage, setQueuedImage] = useState("");

  return (
    <section className="kb-subpanel">
      <div className="kb-section-title compact">
        <h3>Completed results and image tags</h3>
        <button type="button" className="kb-quiet-button" onClick={() => uploadInputRef.current?.click()}>
          <Camera size={17} />
          <span>Add image</span>
        </button>
        <input
          ref={uploadInputRef}
          hidden
          type="file"
          accept="image/*"
          aria-label="Add result image"
          onChange={(event) => setQueuedImage(event.target.files?.[0]?.name ?? "")}
        />
      </div>
      {queuedImage && <p className="kb-muted-note">Queued image: {queuedImage}</p>}
      <div className="kb-result-grid">
        {applications.map((application) => {
          const glaze = glazes.find((item) => item.id === application.glazeId);
          const clay = clayBodies.find((item) => item.id === application.clayBodyId);
          return (
            <div className="kb-result-card" key={`${application.glazeId}-${application.clayBodyId}`}>
              <div className="kb-ceramic-photo small" />
              <strong>{glaze?.name ?? "Unknown glaze"}</strong>
              <span>{clay?.name ?? "Unknown clay body"} · {application.resultStatus.replaceAll("_", " ")}</span>
              <small>{application.resultRating ?? "Not rated"} result score</small>
            </div>
          );
        })}
      </div>
      <div className="kb-tag-workflow">
        <div>
          <p className="kb-kicker">Image-level structured tags</p>
          <div className="kb-chip-row">
            {imageTags.map((tag) => {
              const glaze = glazes.find((item) => item.id === tag);
              return (
                <button
                  type="button"
                  className="kb-chip removable"
                  key={tag}
                  onClick={() => onTagsChange(imageTags.filter((item) => item !== tag))}
                >
                  {glaze?.name ?? tag}
                </button>
              );
            })}
          </div>
        </div>
        <div className="kb-chip-row">
          {suggestedTags.map((glaze) => (
            <button
              type="button"
              className="kb-chip action"
              key={glaze.id}
              onClick={() =>
                onTagsChange(imageTags.includes(glaze.id) ? imageTags : [...imageTags, glaze.id])
              }
            >
              Add {glaze.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreateFiringForm({
  kilns,
  glazes,
  clayBodies,
  onSubmit,
}: {
  kilns: KilnProfile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  onSubmit: (values: FiringFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FiringFormInput, unknown, FiringFormValues>({
    resolver: zodResolver(firingFormSchema),
    defaultValues: {
      title: "Cone 6 liner test",
      kilnId: kilns[0]?.id,
      clayBodyId: clayBodies[0]?.id,
      glazeId: glazes[0]?.id,
      targetTemperatureC: 1222,
      targetCone: "6",
      location: "indoors",
      humidity: 58,
      windSpeedKph: 0,
    },
  });

  return (
    <section className="kb-panel">
      <div className="kb-section-title compact">
        <h3>Create firing</h3>
        <span>Phase 1 form</span>
      </div>
      <form className="kb-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          <span>Title</span>
          <input {...register("title")} />
          {errors.title && <small>{errors.title.message}</small>}
        </label>
        <label>
          <span>Kiln</span>
          <span className="kb-select-wrap">
            <select {...register("kilnId")}>
              {kilns.map((kiln) => (
                <option key={kiln.id} value={kiln.id}>{kiln.name}</option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <div className="kb-form-grid">
          <label>
            <span>Glaze</span>
            <span className="kb-select-wrap">
              <select {...register("glazeId")}>
                {glazes.map((glaze) => (
                  <option key={glaze.id} value={glaze.id}>{glaze.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label>
            <span>Clay body</span>
            <span className="kb-select-wrap">
              <select {...register("clayBodyId")}>
                {clayBodies.map((clay) => (
                  <option key={clay.id} value={clay.id}>{clay.name}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Target C</span>
            <input type="number" {...register("targetTemperatureC")} />
          </label>
          <label>
            <span>Cone</span>
            <input {...register("targetCone")} />
          </label>
        </div>
        <div className="kb-form-grid">
          <label>
            <span>Location</span>
            <span className="kb-select-wrap">
              <select {...register("location")}>
                <option value="indoors">Indoors</option>
                <option value="semi_enclosed">Semi-enclosed</option>
                <option value="outdoors_partially_covered">Outdoors covered</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label>
            <span>Humidity</span>
            <input type="number" {...register("humidity")} />
          </label>
        </div>
        <label>
          <span>Wind speed kph</span>
          <input type="number" {...register("windSpeedKph")} />
        </label>
        <button type="submit" className="kb-primary-button full">
          <Plus size={17} />
          <span>Plan firing</span>
        </button>
      </form>
    </section>
  );
}

function FiringComparison({ firings }: { firings: FiringRecord[] }) {
  return (
    <section className="kb-panel">
      <div className="kb-section-title compact">
        <h3>Firing comparison</h3>
        <span>2 to 5 firings</span>
      </div>
      <div className="kb-comparison-list">
        {firings.slice(0, 3).map((firing) => (
          <div key={firing.id}>
            <strong>{firing.readableNumber}</strong>
            <span>{formatTemperature(firing.targetTemperatureC, "c")} · {firing.atmosphere.replaceAll("_", " ")}</span>
            <progress value={firing.successRating ?? 60} max={100} aria-label={`${firing.readableNumber} result score`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function GlazesScreen({
  viewer,
  glazes,
  recipes,
  applications,
  clayBodies,
  firings,
  addDrafts,
  onCreateGlazeRecord,
}: {
  viewer: Profile;
  glazes: GlazeProfile[];
  recipes: GlazeRecipeVersion[];
  applications: { glazeId: string; clayBodyId: string | null; firingId: string; resultRating?: number }[];
  clayBodies: ClayBodyProfile[];
  firings: FiringRecord[];
  addDrafts: AddDraft[];
  onCreateGlazeRecord: (record: CreatedGlazeRecord) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGlazeId, setSelectedGlazeId] = useState(glazes[0]?.id ?? "");
  const glaze = glazes.find((item) => item.id === selectedGlazeId) ?? glazes[0];
  const glazeRecipes = glaze ? recipes.filter((recipe) => recipe.glazeId === glaze.id) : [];
  const createGlaze = (record: CreatedGlazeRecord) => {
    onCreateGlazeRecord(record);
    setSelectedGlazeId(record.profile.id);
    setCreateOpen(false);
  };

  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Glaze library</p>
            <h2>Canonical glaze profiles and recipe versions</h2>
          </div>
          <button
            type="button"
            className="kb-primary-button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            <span>New glaze</span>
          </button>
        </div>
        <AddDraftList drafts={addDrafts} />
        <div className="kb-library-grid">
          {glazes.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === glaze?.id ? "kb-library-select active" : "kb-library-select"}
              onClick={() => setSelectedGlazeId(item.id)}
            >
              <LibraryCard
                title={item.name}
                eyebrow={item.source}
                detail={`${item.coneRange} · ${item.surface}`}
                color={item.heroImageColor}
              />
            </button>
          ))}
        </div>
      </section>
      <aside className="kb-stack">
        {glaze ? (
          <>
            <section className="kb-panel">
              <div className="kb-section-title compact">
                <h3>{glaze.name}</h3>
                <VisibilityPill visibility={glaze.recipeVisibility} />
              </div>
              <div className="kb-hero-swatch" style={{ background: glaze.heroImageColor }} />
              <p>{glaze.description}</p>
              <div className="kb-chip-row">
                {glaze.colorFamily.map((color) => (
                  <span className="kb-chip" key={color}>{color}</span>
                ))}
              </div>
            </section>
            <section className="kb-panel">
              <div className="kb-section-title compact">
                <h3>Recipe editor</h3>
                <span>Historical versions</span>
              </div>
              {glazeRecipes.map((recipe) => (
                <div className="kb-version-row" key={`${recipe.glazeId}-${recipe.versionNumber}`}>
                  <strong>Version {recipe.versionNumber}</strong>
                  <span>{recipe.changeSummary}</span>
                  <small>{recipe.ingredients.length} ingredients · {recipe.visibility}</small>
                </div>
              ))}
            </section>
            <section className="kb-panel">
              <div className="kb-section-title compact">
                <h3>Connected results</h3>
                <span>Automatic relationships</span>
              </div>
              {applications.filter((app) => app.glazeId === glaze.id).map((app) => {
                const clay = clayBodies.find((item) => item.id === app.clayBodyId);
                const firing = firings.find((item) => item.id === app.firingId);
                return (
                  <div className="kb-linked-row" key={`${app.firingId}-${app.clayBodyId}`}>
                    <span>{clay?.name ?? "Unknown clay body"}</span>
                    <strong>{firing?.readableNumber}</strong>
                    <small>{app.resultRating ?? "Unrated"} score</small>
                  </div>
                );
              })}
            </section>
          </>
        ) : (
          <section className="kb-panel kb-empty-state">
            <Layers3 size={22} aria-hidden="true" />
            <h3>No glazes yet</h3>
            <p>Create a studio recipe or import a commercial glaze profile to start tracking results.</p>
          </section>
        )}
      </aside>
      {createOpen && (
        <GlazeCreateDialog
          viewer={viewer}
          onClose={() => setCreateOpen(false)}
          onCreate={createGlaze}
        />
      )}
    </div>
  );
}

function ClayBodiesScreen({
  viewer,
  clayBodies,
  glazes,
  applications,
  firings,
  onCreateClayBodyProfile,
}: {
  viewer: Profile;
  clayBodies: ClayBodyProfile[];
  glazes: GlazeProfile[];
  applications: { glazeId: string; clayBodyId: string | null; firingId: string; resultRating?: number }[];
  firings: FiringRecord[];
  onCreateClayBodyProfile: (profile: ClayBodyProfile) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClayId, setSelectedClayId] = useState(clayBodies[0]?.id ?? "");
  const clay = clayBodies.find((item) => item.id === selectedClayId) ?? clayBodies[0];
  const related = clay ? applications.filter((application) => application.clayBodyId === clay.id) : [];
  const createClay = (profile: ClayBodyProfile) => {
    onCreateClayBodyProfile(profile);
    setSelectedClayId(profile.id);
    setCreateOpen(false);
  };

  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Clay-body library</p>
            <h2>First-class clay records across firings and glaze results</h2>
          </div>
          <button
            type="button"
            className="kb-primary-button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            <span>New clay body</span>
          </button>
        </div>
        <div className="kb-library-grid">
          {clayBodies.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === clay?.id ? "kb-library-select active" : "kb-library-select"}
              onClick={() => setSelectedClayId(item.id)}
            >
              <LibraryCard
                title={item.name}
                eyebrow={`${item.manufacturer} · ${item.bodyType}`}
                detail={`${item.coneRange} · ${item.firedColor}`}
                color={item.imageColor}
              />
            </button>
          ))}
        </div>
      </section>
      <aside className="kb-panel">
        {clay ? (
          <>
            <div className="kb-section-title compact">
              <h3>{clay.name}</h3>
              <VisibilityPill visibility={clay.profileVisibility} />
            </div>
            <div className="kb-clay-profile">
              <div className="kb-hero-swatch" style={{ background: clay.imageColor }} />
              <div className="kb-spec-list">
                <span>Texture <strong>{clay.texture}</strong></span>
                <span>Shrinkage <strong>{clay.shrinkagePercentage ?? "n/a"}%</strong></span>
                <span>Absorption <strong>{clay.absorptionPercentage ?? "n/a"}%</strong></span>
                <span>Cone <strong>{clay.coneRange}</strong></span>
              </div>
            </div>
            <h4>Glaze performance</h4>
            {related.map((application) => {
              const glaze = glazes.find((item) => item.id === application.glazeId);
              const firing = firings.find((item) => item.id === application.firingId);
              return (
                <div className="kb-linked-row" key={`${application.glazeId}-${application.firingId}`}>
                  <span>{glaze?.name}</span>
                  <strong>{application.resultRating ?? "Unrated"}</strong>
                  <small>{firing?.readableNumber}</small>
                </div>
              );
            })}
          </>
        ) : (
          <div className="kb-empty-state">
            <Microscope size={22} aria-hidden="true" />
            <h3>No clay bodies yet</h3>
            <p>Add a studio body or import a common commercial body before recording glaze fit.</p>
          </div>
        )}
      </aside>
      {createOpen && (
        <ClayBodyCreateDialog
          viewer={viewer}
          onClose={() => setCreateOpen(false)}
          onCreate={createClay}
        />
      )}
    </div>
  );
}

function KilnsScreen({
  viewer,
  kilns,
  firings,
  onCreateKilnProfile,
}: {
  viewer: Profile;
  kilns: KilnProfile[];
  firings: FiringRecord[];
  onCreateKilnProfile: (profile: KilnProfile) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedKilnId, setSelectedKilnId] = useState(kilns[0]?.id ?? "");
  const selectedKiln = kilns.find((kiln) => kiln.id === selectedKilnId) ?? kilns[0];
  const createKiln = (profile: KilnProfile) => {
    onCreateKilnProfile(profile);
    setSelectedKilnId(profile.id);
    setCreateOpen(false);
  };

  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Kiln profiles</p>
            <h2>Canonical kiln records with historical firing snapshots</h2>
          </div>
          <button
            type="button"
            className="kb-primary-button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            <span>New kiln</span>
          </button>
        </div>
        <div className="kb-library-grid">
          {kilns.map((kiln) => (
            <button
              type="button"
              key={kiln.id}
              className={kiln.id === selectedKiln?.id ? "kb-library-select active" : "kb-library-select"}
              onClick={() => setSelectedKilnId(kiln.id)}
            >
              <LibraryCard
                title={kiln.name}
                eyebrow={`${kiln.manufacturer} ${kiln.model}`}
                detail={`${kiln.usableVolumeLiters} L · ${kiln.recommendedConeRange}`}
                color={kiln.kilnType === "electric" ? BRAND_COLORS.cobalt : BRAND_COLORS.iron}
              />
            </button>
          ))}
        </div>
      </section>
      <aside className="kb-stack">
        {selectedKiln ? [selectedKiln, ...kilns.filter((kiln) => kiln.id !== selectedKiln.id).slice(0, 1)].map((kiln) => (
          <section className="kb-panel" key={kiln.id}>
            <div className="kb-section-title compact">
              <h3>{kiln.name}</h3>
              <span>{kiln.active ? "Active" : "Retired"}</span>
            </div>
            <div className="kb-spec-list">
              <span>Controller <strong>{kiln.controllerType}</strong></span>
              <span>Maximum <strong>{formatTemperature(kiln.maxTemperatureC, "c")}</strong></span>
              <span>Location <strong>{kiln.defaultLocation.replaceAll("_", " ")}</strong></span>
              <span>Firings <strong>{firings.filter((firing) => firing.kilnId === kiln.id).length}</strong></span>
            </div>
            <div className="kb-maintenance-row">
              <CheckCircle2 size={18} />
              <span>Thermocouple calibration recorded after latest cone check</span>
            </div>
          </section>
        )) : (
          <section className="kb-panel kb-empty-state">
            <Gauge size={22} aria-hidden="true" />
            <h3>No kilns yet</h3>
            <p>Add a kiln profile before starting live firing tracking or previous firing records.</p>
          </section>
        )}
      </aside>
      {createOpen && (
        <KilnCreateDialog
          viewer={viewer}
          onClose={() => setCreateOpen(false)}
          onCreate={createKiln}
        />
      )}
    </div>
  );
}

function GlazeCreateDialog({
  viewer,
  onClose,
  onCreate,
}: {
  viewer: Profile;
  onClose: () => void;
  onCreate: (record: CreatedGlazeRecord) => void;
}) {
  const firstCatalog = GLAZE_SUPPLIER_CATALOG[0];
  const [mode, setMode] = useState<"recipe" | "commercial">("recipe");
  const [catalogId, setCatalogId] = useState(firstCatalog.id);
  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("Studio");
  const [productLine, setProductLine] = useState("Studio archive");
  const [glazeType, setGlazeType] = useState("studio_recipe");
  const [surface, setSurface] = useState("glossy");
  const [colorText, setColorText] = useState("cream, brown");
  const [opacity, setOpacity] = useState("unknown");
  const [coneRange, setConeRange] = useState("5-6");
  const [firingRange, setFiringRange] = useState("Cone 5-6");
  const [description, setDescription] = useState("");
  const [applicationNotes, setApplicationNotes] = useState("");
  const [heroImageColor, setHeroImageColor] = useState(BRAND_COLORS.sun);
  const [recipeVisibility, setRecipeVisibility] = useState<AddVisibility>("public");
  const [profileVisibility, setProfileVisibility] = useState<AddVisibility>("public");
  const [ingredients, setIngredients] = useState<GlazeIngredientDraft[]>([
    { id: "ingredient-feldspar", materialName: "Custer Feldspar", percentage: "40", role: "base" },
    { id: "ingredient-silica", materialName: "Silica 325 mesh", percentage: "25", role: "base" },
    { id: "ingredient-kaolin", materialName: "EPK Kaolin", percentage: "20", role: "base" },
    { id: "ingredient-colorant", materialName: "Red iron oxide", percentage: "5", role: "colorant" },
  ]);
  const parsedIngredients = ingredients
    .map((ingredient) => ({
      ...ingredient,
      materialName: ingredient.materialName.trim(),
      percentageValue: parseRequiredNumber(ingredient.percentage, NaN),
    }))
    .filter((ingredient) => ingredient.materialName && Number.isFinite(ingredient.percentageValue));
  const totalPercentage = parsedIngredients.reduce((sum, ingredient) => sum + ingredient.percentageValue, 0);
  const canSave = name.trim().length >= 2 && (mode === "commercial" || parsedIngredients.length > 0);

  const applyCatalogEntry = (entryId: string) => {
    const entry = GLAZE_SUPPLIER_CATALOG.find((item) => item.id === entryId) ?? firstCatalog;
    setCatalogId(entry.id);
    setName(entry.name);
    setSupplier(entry.supplier);
    setProductLine(entry.productLine);
    setGlazeType(entry.glazeType);
    setSurface(entry.surface);
    setColorText(entry.colorFamily.join(", "));
    setOpacity(entry.opacity);
    setConeRange(entry.coneRange);
    setFiringRange(entry.firingRange);
    setDescription(entry.description);
    setApplicationNotes(entry.applicationNotes);
    setHeroImageColor(entry.heroImageColor);
  };

  const updateIngredient = (id: string, patch: Partial<GlazeIngredientDraft>) => {
    setIngredients((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addIngredient = () => {
    setIngredients((items) => [
      ...items,
      {
        id: `ingredient-${Date.now()}`,
        materialName: "",
        percentage: "",
        role: "base",
      },
    ]);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    const createdAt = Date.now();
    const profileId = createClientRecordId("glaze");
    const recipeId = createClientRecordId("recipe");
    const atmospheres = atmosphereValuesFromForm(event.currentTarget);
    const recipeIngredients: RecipeIngredient[] =
      mode === "recipe"
        ? parsedIngredients.map((ingredient, index) => ({
            materialId: `material-${createdAt}-${index + 1}`,
            materialName: ingredient.materialName,
            percentage: ingredient.percentageValue,
            weightGrams: Math.round(ingredient.percentageValue * 10),
            role: ingredient.role,
          }))
        : [];
    const colorFamily = colorFamiliesFromText(colorText);
    const source = mode === "commercial" ? `${supplier} ${productLine}`.trim() : "Studio recipe";
    const profile: GlazeProfile = {
      id: profileId,
      ownerId: viewer.id,
      name: name.trim(),
      creatorAttribution: viewer.displayName,
      source,
      glazeType: glazeType.trim() || (mode === "commercial" ? "commercial" : "studio_recipe"),
      surface: surface.trim() || "surface pending",
      colorFamily: colorFamily.length > 0 ? colorFamily : ["Unsorted"],
      opacity: opacity.trim() || "unknown",
      firingRange: firingRange.trim() || coneRange.trim(),
      coneRange: coneRange.trim() || "pending",
      atmosphereCompatibility: atmospheres.length > 0 ? atmospheres : ["oxidation"],
      recipeVisibility,
      profileVisibility,
      description:
        description.trim() ||
        (mode === "commercial"
          ? "Commercial glaze profile for tracking bought glaze results."
          : "Studio glaze recipe profile."),
      applicationNotes: applicationNotes.trim() || "Record application thickness, coat count, and firing results.",
      heroImageColor,
      currentRecipeVersionId: recipeId,
    };
    const recipeVersion: GlazeRecipeVersion = {
      id: recipeId,
      glazeId: profileId,
      versionNumber: 1,
      effectiveDate: new Date(createdAt).toISOString().slice(0, 10),
      batchSizeGrams: 1000,
      totalDryWeightGrams: 1000,
      ingredients: recipeIngredients,
      sourceAttribution: source,
      changeSummary:
        mode === "commercial"
          ? "Imported commercial glaze profile. Manufacturer formula is not stored."
          : `Initial studio recipe. Dry total ${Math.round(totalPercentage * 10) / 10}%.`,
      visibility: recipeVisibility,
    };
    onCreate({ profile, recipeVersion });
  };

  return (
    <div className="kb-modal-backdrop" role="presentation">
      <section className="kb-create-dialog" role="dialog" aria-modal="true" aria-labelledby="new-glaze-title">
        <form className="kb-form" onSubmit={submit}>
          <div className="kb-section-title compact">
            <div>
              <p className="kb-kicker">Glaze profile</p>
              <h2 id="new-glaze-title">Add a glaze</h2>
            </div>
            <button type="button" className="kb-icon-button" aria-label="Close glaze form" onClick={onClose}>
              <CircleX size={18} />
            </button>
          </div>
          <div className="kb-dialog-toolbar">
            <div className="kb-segmented">
              <button
                type="button"
                className={mode === "recipe" ? "active" : ""}
                onClick={() => setMode("recipe")}
              >
                Recipe
              </button>
              <button
                type="button"
                className={mode === "commercial" ? "active" : ""}
                onClick={() => {
                  setMode("commercial");
                  applyCatalogEntry(catalogId);
                }}
              >
                Commercial glaze
              </button>
            </div>
            <VisibilityPill visibility={recipeVisibility} />
          </div>
          {mode === "commercial" && (
            <label>
              <span>Supplier catalog starter</span>
              <span className="kb-select-wrap">
                <select value={catalogId} onChange={(event) => applyCatalogEntry(event.target.value)}>
                  {GLAZE_SUPPLIER_CATALOG.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.supplier} · {entry.productLine} · {entry.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          )}
          <div className="kb-form-grid">
            <label>
              <span>Glaze name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this glaze" />
            </label>
            <label>
              <span>{mode === "commercial" ? "Supplier" : "Source"}</span>
              <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Studio, AMACO, Mayco" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Line or family</span>
              <input value={productLine} onChange={(event) => setProductLine(event.target.value)} placeholder="Potter's Choice, studio archive" />
            </label>
            <label>
              <span>Cone range</span>
              <input value={coneRange} onChange={(event) => setConeRange(event.target.value)} placeholder="5-6" />
            </label>
            <label>
              <span>Surface</span>
              <input value={surface} onChange={(event) => setSurface(event.target.value)} placeholder="satin blue, glossy iron" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Type</span>
              <input value={glazeType} onChange={(event) => setGlazeType(event.target.value)} placeholder="ash, celadon, commercial" />
            </label>
            <label>
              <span>Color family</span>
              <input value={colorText} onChange={(event) => setColorText(event.target.value)} placeholder="blue, cream, brown" />
            </label>
            <label>
              <span>Opacity</span>
              <input value={opacity} onChange={(event) => setOpacity(event.target.value)} placeholder="opaque, translucent" />
            </label>
          </div>
          <label>
            <span>Atmosphere compatibility</span>
            <div className="kb-checkbox-grid">
              {ATMOSPHERE_OPTIONS.slice(0, 6).map((option) => (
                <label className="kb-checkbox-row" key={option.value}>
                  <input
                    type="checkbox"
                    name="atmosphere"
                    value={option.value}
                    defaultChecked={option.value === "oxidation" || option.value === "reduction"}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </label>
          {mode === "recipe" ? (
            <div className="kb-recipe-builder">
              <div className="kb-module-head">
                <div>
                  <p className="kb-kicker">Recipe</p>
                  <strong>Initial ingredient version</strong>
                </div>
                <span>{Math.round(totalPercentage * 10) / 10}% dry total</span>
              </div>
              {ingredients.map((ingredient) => (
                <div className="kb-ingredient-row" key={ingredient.id}>
                  <input
                    aria-label="Material name"
                    value={ingredient.materialName}
                    onChange={(event) => updateIngredient(ingredient.id, { materialName: event.target.value })}
                    placeholder="Material"
                  />
                  <input
                    aria-label="Percentage"
                    type="number"
                    inputMode="decimal"
                    value={ingredient.percentage}
                    onChange={(event) => updateIngredient(ingredient.id, { percentage: event.target.value })}
                    placeholder="%"
                  />
                  <span className="kb-select-wrap">
                    <select
                      aria-label="Ingredient role"
                      value={ingredient.role}
                      onChange={(event) =>
                        updateIngredient(ingredient.id, { role: event.target.value as RecipeIngredient["role"] })
                      }
                    >
                      <option value="base">Base</option>
                      <option value="colorant">Colorant</option>
                      <option value="additive">Additive</option>
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </span>
                  <button
                    type="button"
                    className="kb-icon-button mini"
                    aria-label="Remove ingredient"
                    onClick={() => setIngredients((items) => items.filter((item) => item.id !== ingredient.id))}
                    disabled={ingredients.length === 1}
                  >
                    <CircleX size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className="kb-quiet-button" onClick={addIngredient}>
                <Plus size={16} />
                <span>Add ingredient</span>
              </button>
            </div>
          ) : (
            <div className="kb-catalog-panel">
              <div className="kb-hero-swatch" style={{ background: heroImageColor }} />
              <div>
                <p className="kb-kicker">Imported profile</p>
                <strong>{supplier} {productLine}</strong>
                <span>Commercial formulas are tracked as product profiles. Results can still connect to firings, clay bodies, layers, photos, and notes.</span>
              </div>
            </div>
          )}
          <div className="kb-form-grid">
            <label>
              <span>Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should future you know about this glaze?" />
            </label>
            <label>
              <span>Application notes</span>
              <textarea value={applicationNotes} onChange={(event) => setApplicationNotes(event.target.value)} placeholder="Coats, dipping time, specific gravity, layering notes" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Firing range</span>
              <input value={firingRange} onChange={(event) => setFiringRange(event.target.value)} placeholder="Cone 5-6" />
            </label>
            <label>
              <span>Recipe visibility</span>
              <span className="kb-select-wrap">
                <select value={recipeVisibility} onChange={(event) => setRecipeVisibility(event.target.value as AddVisibility)}>
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
            <label>
              <span>Profile visibility</span>
              <span className="kb-select-wrap">
                <select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as AddVisibility)}>
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          </div>
          <div className="kb-swatch-picker" aria-label="Profile swatch color">
            {PROFILE_SWATCHES.map((color) => (
              <button
                type="button"
                key={color}
                className={heroImageColor === color ? "active" : ""}
                style={{ background: color }}
                aria-label={`Use swatch ${color}`}
                onClick={() => setHeroImageColor(color)}
              />
            ))}
          </div>
          <div className="kb-form-actions">
            <button type="button" className="kb-quiet-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="kb-primary-button" disabled={!canSave}>
              <Save size={17} />
              <span>{mode === "commercial" ? "Add commercial glaze" : "Save glaze recipe"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ClayBodyCreateDialog({
  viewer,
  onClose,
  onCreate,
}: {
  viewer: Profile;
  onClose: () => void;
  onCreate: (profile: ClayBodyProfile) => void;
}) {
  const firstCatalog = CLAY_BODY_CATALOG[0];
  const [mode, setMode] = useState<"custom" | "commercial">("custom");
  const [catalogId, setCatalogId] = useState(firstCatalog.id);
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [bodyType, setBodyType] = useState("stoneware");
  const [rawColor, setRawColor] = useState("gray");
  const [firedColor, setFiredColor] = useState("buff");
  const [texture, setTexture] = useState("smooth");
  const [grogPercentage, setGrogPercentage] = useState("");
  const [absorptionPercentage, setAbsorptionPercentage] = useState("");
  const [shrinkagePercentage, setShrinkagePercentage] = useState("");
  const [coneRange, setConeRange] = useState("5-6");
  const [notes, setNotes] = useState("");
  const [imageColor, setImageColor] = useState(BRAND_COLORS.stone);
  const [profileVisibility, setProfileVisibility] = useState<AddVisibility>("public");
  const canSave = name.trim().length >= 2;

  const applyCatalogEntry = (entryId: string) => {
    const entry = CLAY_BODY_CATALOG.find((item) => item.id === entryId) ?? firstCatalog;
    setCatalogId(entry.id);
    setName(entry.name);
    setManufacturer(entry.manufacturer);
    setSupplier(entry.supplier);
    setBodyType(entry.bodyType);
    setRawColor(entry.rawColor);
    setFiredColor(entry.firedColor);
    setTexture(entry.texture);
    setGrogPercentage(entry.grogPercentage === undefined ? "" : String(entry.grogPercentage));
    setAbsorptionPercentage(entry.absorptionPercentage === undefined ? "" : String(entry.absorptionPercentage));
    setShrinkagePercentage(entry.shrinkagePercentage === undefined ? "" : String(entry.shrinkagePercentage));
    setConeRange(entry.coneRange);
    setNotes(entry.notes);
    setImageColor(entry.imageColor);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    const atmospheres = atmosphereValuesFromForm(event.currentTarget);
    onCreate({
      id: createClientRecordId("clay"),
      ownerId: viewer.id,
      name: name.trim(),
      manufacturer: manufacturer.trim() || (mode === "commercial" ? "Commercial supplier" : "Studio mixed"),
      supplier: supplier.trim() || "Studio",
      bodyType: bodyType.trim() || "clay body",
      rawColor: rawColor.trim() || "unknown",
      firedColor: firedColor.trim() || "pending",
      texture: texture.trim() || "unspecified",
      grogPercentage: parseOptionalNumber(grogPercentage),
      absorptionPercentage: parseOptionalNumber(absorptionPercentage),
      shrinkagePercentage: parseOptionalNumber(shrinkagePercentage),
      coneRange: coneRange.trim() || "pending",
      atmosphereSuitability: atmospheres.length > 0 ? atmospheres : ["oxidation", "reduction"],
      recipeVisibility: profileVisibility,
      profileVisibility,
      notes: notes.trim() || "Clay body profile for tracking glaze fit, shrinkage, absorption, and fired color.",
      imageColor,
    });
  };

  return (
    <div className="kb-modal-backdrop" role="presentation">
      <section className="kb-create-dialog" role="dialog" aria-modal="true" aria-labelledby="new-clay-title">
        <form className="kb-form" onSubmit={submit}>
          <div className="kb-section-title compact">
            <div>
              <p className="kb-kicker">Clay body profile</p>
              <h2 id="new-clay-title">Add a clay body</h2>
            </div>
            <button type="button" className="kb-icon-button" aria-label="Close clay body form" onClick={onClose}>
              <CircleX size={18} />
            </button>
          </div>
          <div className="kb-dialog-toolbar">
            <div className="kb-segmented">
              <button type="button" className={mode === "custom" ? "active" : ""} onClick={() => setMode("custom")}>
                Custom
              </button>
              <button
                type="button"
                className={mode === "commercial" ? "active" : ""}
                onClick={() => {
                  setMode("commercial");
                  applyCatalogEntry(catalogId);
                }}
              >
                Commercial body
              </button>
            </div>
            <VisibilityPill visibility={profileVisibility} />
          </div>
          {mode === "commercial" && (
            <label>
              <span>Clay catalog starter</span>
              <span className="kb-select-wrap">
                <select value={catalogId} onChange={(event) => applyCatalogEntry(event.target.value)}>
                  {CLAY_BODY_CATALOG.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.manufacturer} · {entry.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          )}
          <div className="kb-form-grid three">
            <label>
              <span>Clay body name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="B-Mix test body" />
            </label>
            <label>
              <span>Manufacturer</span>
              <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} placeholder="Laguna, Standard, studio" />
            </label>
            <label>
              <span>Supplier</span>
              <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Local supplier or studio" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Body type</span>
              <input value={bodyType} onChange={(event) => setBodyType(event.target.value)} placeholder="stoneware, porcelain" />
            </label>
            <label>
              <span>Cone range</span>
              <input value={coneRange} onChange={(event) => setConeRange(event.target.value)} placeholder="5-6" />
            </label>
            <label>
              <span>Texture</span>
              <input value={texture} onChange={(event) => setTexture(event.target.value)} placeholder="smooth, grogged, speckled" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Raw color</span>
              <input value={rawColor} onChange={(event) => setRawColor(event.target.value)} />
            </label>
            <label>
              <span>Fired color</span>
              <input value={firedColor} onChange={(event) => setFiredColor(event.target.value)} />
            </label>
            <label>
              <span>Grog %</span>
              <input type="number" inputMode="decimal" value={grogPercentage} onChange={(event) => setGrogPercentage(event.target.value)} />
            </label>
          </div>
          <div className="kb-form-grid">
            <label>
              <span>Absorption %</span>
              <input type="number" inputMode="decimal" value={absorptionPercentage} onChange={(event) => setAbsorptionPercentage(event.target.value)} />
            </label>
            <label>
              <span>Shrinkage %</span>
              <input type="number" inputMode="decimal" value={shrinkagePercentage} onChange={(event) => setShrinkagePercentage(event.target.value)} />
            </label>
          </div>
          <label>
            <span>Atmosphere suitability</span>
            <div className="kb-checkbox-grid">
              {ATMOSPHERE_OPTIONS.slice(0, 6).map((option) => (
                <label className="kb-checkbox-row" key={option.value}>
                  <input
                    type="checkbox"
                    name="atmosphere"
                    value={option.value}
                    defaultChecked={option.value === "oxidation" || option.value === "reduction"}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </label>
          <label>
            <span>Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Fit notes, reclaim blend, drying behavior, supplier batch details" />
          </label>
          <div className="kb-form-grid">
            <label>
              <span>Profile visibility</span>
              <span className="kb-select-wrap">
                <select value={profileVisibility} onChange={(event) => setProfileVisibility(event.target.value as AddVisibility)}>
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
            <div className="kb-swatch-picker" aria-label="Clay swatch color">
              {PROFILE_SWATCHES.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={imageColor === color ? "active" : ""}
                  style={{ background: color }}
                  aria-label={`Use swatch ${color}`}
                  onClick={() => setImageColor(color)}
                />
              ))}
            </div>
          </div>
          <div className="kb-form-actions">
            <button type="button" className="kb-quiet-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="kb-primary-button" disabled={!canSave}>
              <Save size={17} />
              <span>Save clay body</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function KilnCreateDialog({
  viewer,
  onClose,
  onCreate,
}: {
  viewer: Profile;
  onClose: () => void;
  onCreate: (profile: KilnProfile) => void;
}) {
  const firstCatalog = KILN_CATALOG[0];
  const [catalogId, setCatalogId] = useState("");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [kilnType, setKilnType] = useState<FiringType>("electric");
  const [fuelType, setFuelType] = useState("electric");
  const [controllerType, setControllerType] = useState("digital controller");
  const [usableVolumeLiters, setUsableVolumeLiters] = useState("");
  const [maxTemperatureC, setMaxTemperatureC] = useState("1315");
  const [recommendedConeRange, setRecommendedConeRange] = useState("06-10");
  const [defaultLocation, setDefaultLocation] = useState<KilnLocation>("indoors");
  const [powerKw, setPowerKw] = useState("");
  const [visibility, setVisibility] = useState<AddVisibility>("public");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const canSave = name.trim().length >= 2;

  const applyCatalogEntry = (entryId: string) => {
    setCatalogId(entryId);
    if (!entryId) return;
    const entry = KILN_CATALOG.find((item) => item.id === entryId) ?? firstCatalog;
    setCatalogId(entry.id);
    setName(entry.name);
    setManufacturer(entry.manufacturer);
    setModel(entry.model);
    setKilnType(entry.kilnType);
    setFuelType(entry.fuelType);
    setControllerType(entry.controllerType);
    setUsableVolumeLiters(String(entry.usableVolumeLiters));
    setMaxTemperatureC(String(entry.maxTemperatureC));
    setRecommendedConeRange(entry.recommendedConeRange);
    setDefaultLocation(entry.defaultLocation);
    setPowerKw(entry.powerKw === undefined ? "" : String(entry.powerKw));
    setNotes(entry.notes);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onCreate({
      id: createClientRecordId("kiln"),
      ownerId: viewer.id,
      name: name.trim(),
      manufacturer: manufacturer.trim() || "Unknown",
      model: model.trim() || "Custom",
      kilnType,
      fuelType: fuelType.trim() || formatOptionLabel(FIRING_TYPE_OPTIONS, kilnType),
      controllerType: controllerType.trim() || "unspecified",
      usableVolumeLiters: parseRequiredNumber(usableVolumeLiters, 0),
      maxTemperatureC: parseRequiredNumber(maxTemperatureC, 1300),
      recommendedConeRange: recommendedConeRange.trim() || "pending",
      defaultLocation,
      powerKw: parseOptionalNumber(powerKw),
      active,
      visibility,
      notes: notes.trim() || "Kiln profile for firing logs, live tracking, maintenance, and environmental conditions.",
    });
  };

  return (
    <div className="kb-modal-backdrop" role="presentation">
      <section className="kb-create-dialog" role="dialog" aria-modal="true" aria-labelledby="new-kiln-title">
        <form className="kb-form" onSubmit={submit}>
          <div className="kb-section-title compact">
            <div>
              <p className="kb-kicker">Kiln profile</p>
              <h2 id="new-kiln-title">Add a kiln</h2>
            </div>
            <button type="button" className="kb-icon-button" aria-label="Close kiln form" onClick={onClose}>
              <CircleX size={18} />
            </button>
          </div>
          <label>
            <span>Kiln preset</span>
            <span className="kb-select-wrap">
              <select value={catalogId} onChange={(event) => applyCatalogEntry(event.target.value)}>
                <option value="">Custom kiln</option>
                {KILN_CATALOG.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.manufacturer} · {entry.model}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <div className="kb-form-grid three">
            <label>
              <span>Kiln name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="North room 1027" />
            </label>
            <label>
              <span>Manufacturer</span>
              <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} placeholder="Skutt, L&L, Olympic, studio-built" />
            </label>
            <label>
              <span>Model</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="KM-1027, custom downdraft" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Kiln type</span>
              <span className="kb-select-wrap">
                <select value={kilnType} onChange={(event) => setKilnType(event.target.value as FiringType)}>
                  {FIRING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
            <label>
              <span>Fuel</span>
              <input value={fuelType} onChange={(event) => setFuelType(event.target.value)} placeholder="electric, propane, natural gas, wood" />
            </label>
            <label>
              <span>Controller</span>
              <input value={controllerType} onChange={(event) => setControllerType(event.target.value)} placeholder="digital, manual, pyrometer" />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Usable volume L</span>
              <input type="number" inputMode="decimal" value={usableVolumeLiters} onChange={(event) => setUsableVolumeLiters(event.target.value)} />
            </label>
            <label>
              <span>Max temp C</span>
              <input type="number" inputMode="decimal" value={maxTemperatureC} onChange={(event) => setMaxTemperatureC(event.target.value)} />
            </label>
            <label>
              <span>Cone range</span>
              <input value={recommendedConeRange} onChange={(event) => setRecommendedConeRange(event.target.value)} />
            </label>
          </div>
          <div className="kb-form-grid three">
            <label>
              <span>Default location</span>
              <span className="kb-select-wrap">
                <select value={defaultLocation} onChange={(event) => setDefaultLocation(event.target.value as KilnLocation)}>
                  {KILN_LOCATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
            <label>
              <span>Power kW</span>
              <input type="number" inputMode="decimal" value={powerKw} onChange={(event) => setPowerKw(event.target.value)} />
            </label>
            <label>
              <span>Visibility</span>
              <span className="kb-select-wrap">
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as AddVisibility)}>
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          </div>
          <label>
            <span>Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Elements, burners, venting, shelves, outdoor cover, calibration, maintenance" />
          </label>
          <label className="kb-checkbox-row standalone">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            <span>Active kiln</span>
          </label>
          <div className="kb-form-actions">
            <button type="button" className="kb-quiet-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="kb-primary-button" disabled={!canSave}>
              <Save size={17} />
              <span>Save kiln</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ExploreScreen({
  query,
  profiles,
  glazes,
  clayBodies,
  posts,
  firings,
}: {
  query: string;
  profiles: Profile[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  posts: Post[];
  firings: FiringRecord[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGlazes = glazes.filter(
    (glaze) =>
      !normalizedQuery ||
      glaze.name.toLowerCase().includes(normalizedQuery) ||
      glaze.surface.toLowerCase().includes(normalizedQuery),
  );
  const businessProfiles = profiles.filter((profile) => profile.subscriptionTier === "business");

  return (
    <div className="kb-stack">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Business directory</p>
            <h2>Studios, teachers, production potters, and kiln services</h2>
          </div>
          <div className="kb-chip-row">
            <span className="kb-chip">Businesses</span>
            <span className="kb-chip">Teachers</span>
            <span className="kb-chip">Production potters</span>
            <span className="kb-chip">Kiln rentals</span>
            <span className="kb-chip">Workshop hosts</span>
          </div>
        </div>
        <div className="kb-explore-grid">
          {businessProfiles.map((profile) => {
            const business = profile.businessProfile;
            return (
              <article className="kb-public-card kb-business-card" key={profile.id}>
                <div
                  className="kb-hero-swatch"
                  style={{ background: business?.portfolioHeroImageColor ?? profile.avatarColor }}
                />
                <div className="kb-module-head">
                  <h3>{business?.businessName ?? profile.displayName}</h3>
                  <BusinessBadge />
                </div>
                <p>{business?.description ?? profile.biography}</p>
                <div className="kb-chip-row">
                  {(business?.servicesOffered ?? profile.specialties).slice(0, 4).map((service) => (
                    <span className="kb-chip" key={service}>{service}</span>
                  ))}
                </div>
                <div className="kb-business-actions">
                  {business?.websiteUrl && (
                    <a className="kb-quiet-button" href={business.websiteUrl}>
                      Visit Website
                    </a>
                  )}
                  {business?.googleMapsUrl && (
                    <a className="kb-quiet-button" href={business.googleMapsUrl}>
                      Directions
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Explore</p>
            <h2>Shared glaze and clay-body results from authorized records</h2>
          </div>
          <div className="kb-chip-row">
            <span className="kb-chip">Cone</span>
            <span className="kb-chip">Atmosphere</span>
            <span className="kb-chip">Clay body</span>
            <span className="kb-chip">Application</span>
          </div>
        </div>
        <div className="kb-explore-grid">
          {visibleGlazes.map((glaze) => (
            <article className="kb-public-card" key={glaze.id}>
              <div className="kb-hero-swatch" style={{ background: glaze.heroImageColor }} />
              <h3>{glaze.name}</h3>
              <p>{glaze.description}</p>
              <div className="kb-chip-row">
                <span className="kb-chip">{glaze.coneRange}</span>
                <span className="kb-chip">{glaze.recipeVisibility} recipe</span>
              </div>
            </article>
          ))}
          {clayBodies.map((clay) => (
            <article className="kb-public-card" key={clay.id}>
              <div className="kb-hero-swatch" style={{ background: clay.imageColor }} />
              <h3>{clay.name}</h3>
              <p>{clay.notes}</p>
              <div className="kb-chip-row">
                <span className="kb-chip">{clay.bodyType}</span>
                <span className="kb-chip">{clay.coneRange}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Public glaze result</h3>
            <span>{posts.length} community posts</span>
          </div>
          <FeedCard post={posts[1] ?? posts[0]} firing={firings[2]} glaze={glazes[2]} />
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Public clay-body page</h3>
            <span>Filtered authorized results</span>
          </div>
          <div className="kb-spec-list">
            <span>Glazes used <strong>{glazes.length}</strong></span>
            <span>Firings linked <strong>{firings.filter((firing) => firing.visibility !== "private").length}</strong></span>
            <span>Atmospheres <strong>oxidation, reduction, soda</strong></span>
            <span>Private recipes <strong>redacted</strong></span>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessagesScreen({
  conversations,
}: {
  conversations: { id: string; participantName: string; participantUsername: string; unreadCount: number; lastMessage: string; updatedAt: string; linkedRecordLabel?: string }[];
}) {
  const [selectedConversationId, setSelectedConversationId] = useState(conversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<Record<string, string[]>>({});
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    conversations[0];
  const selectedMessages = selectedConversation
    ? sentMessages[selectedConversation.id] ?? []
    : [];

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation || !draft.trim()) return;
    setSentMessages((messages) => ({
      ...messages,
      [selectedConversation.id]: [...(messages[selectedConversation.id] ?? []), draft.trim()],
    }));
    setDraft("");
  };

  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Messages</p>
            <h2>Conversations with ceramic record links</h2>
          </div>
        </div>
        <div className="kb-message-list">
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={conversation.id === selectedConversation?.id ? "kb-message-row active" : "kb-message-row"}
              onClick={() => setSelectedConversationId(conversation.id)}
            >
              <div className="kb-avatar">{conversation.participantName.slice(0, 1)}</div>
              <div>
                <strong>{conversation.participantName}</strong>
                <span>{conversation.lastMessage}</span>
                {conversation.linkedRecordLabel && <small>{conversation.linkedRecordLabel}</small>}
              </div>
              {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
            </button>
          ))}
        </div>
      </section>
      <aside className="kb-panel kb-conversation">
        <div className="kb-section-title compact">
          <h3>{selectedConversation?.participantName ?? "Conversation"}</h3>
          <span>Typing indicators and realtime updates use scoped subscriptions.</span>
        </div>
        <div className="kb-bubble received">Can you send the curve from the top thermocouple before the next soda load?</div>
        <div className="kb-bubble sent">Yes. I tagged the wind gusts and damper notes on Firing 042 so the comparison is readable.</div>
        <div className="kb-bubble received">Perfect. I will link it to the celadon test thread.</div>
        {selectedMessages.map((message, index) => (
          <div className="kb-bubble sent" key={`${selectedConversation?.id}-${index}`}>
            {message}
          </div>
        ))}
        <form className="kb-message-compose" onSubmit={sendMessage}>
          <input
            aria-label="Message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${selectedConversation?.participantName ?? "profile"}`}
          />
          <button type="submit" className="kb-primary-button" disabled={!draft.trim()}>
            <Send size={17} />
            <span>Send</span>
          </button>
        </form>
      </aside>
    </div>
  );
}

function AnalyticsScreen({
  plan,
  firings,
  glazes,
  clayBodies,
}: {
  plan: Profile["subscriptionTier"];
  firings: FiringRecord[];
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
}) {
  const advanced = getEntitlementDecision(plan, "advanced_firing_analytics");
  const costTracking = getEntitlementDecision(plan, "cost_tracking");
  const inventory = getEntitlementDecision(plan, "material_inventory");
  return (
    <div className="kb-stack">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Analytics</p>
            <h2>Understand patterns without overstating causation</h2>
          </div>
          <EntitlementBadge allowed={advanced.allowed} label={advanced.allowed ? "Business" : "Business preview"} />
        </div>
        <div className="kb-metrics">
          <MetricCard label="Average cooling" value="16.8 h" detail="Cone 6-10 completed firings" icon={CloudSun} />
          <MetricCard label="Glaze fit checks" value={String(glazes.length + clayBodies.length)} detail="Clay/glaze combinations" icon={Microscope} />
          <MetricCard label="Consistency" value="86" detail={advanced.allowed ? "Saved dashboard" : "Business preview"} icon={Activity} />
          <MetricCard label="Firing cost range" value="$34-48" detail={costTracking.allowed ? "Per cone 10 load" : "Business cost preview"} icon={Gauge} />
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Environmental correlation summary</h3>
            <span>{advanced.reason}</span>
          </div>
          <p className="kb-correlation">
            Pinholing appeared more frequently in firings with shorter holds. The app does not claim the hold length caused the defect.
          </p>
          <div className="kb-settings-list">
            <SettingRow title="Advanced insight" body="This firing took 11% longer than comparable cone 10 reduction firings." />
            <SettingRow title="Careful wording" body="Outdoor temperature may have contributed to slower cooling; this is a correlation, not a certainty." />
            <SettingRow title="Kiln trend" body="Element performance may be declining compared with the previous six-month pattern." />
          </div>
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Cost and energy trend</h3>
            <span>{firings.length} firings available</span>
          </div>
          <div className="kb-chart short">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "F041", cost: 18 },
                { name: "F042", cost: 44 },
                { name: "F017", cost: 51 },
              ]}>
                <CartesianGrid strokeDasharray="4 6" stroke={BRAND_CHART_COLORS.grid} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip />
                <Bar dataKey="cost" fill={BRAND_CHART_COLORS.barSecondary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <section className="kb-grid-two equal">
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Business operations</h3>
            <EntitlementBadge allowed={costTracking.allowed} label={costTracking.allowed ? "Business" : "Business preview"} />
          </div>
          <div className="kb-settings-list">
            <SettingRow title="Monthly kiln operating cost" body="$180-240 estimated from fuel, elements, maintenance, and depreciation." />
            <SettingRow title="Estimated cost per piece" body="$2.80-4.10 across production mugs in similar loads." />
            <SettingRow title="Advanced exports" body="CSV, PDF firing reports, inventory reports, financial summaries, and JSON backups." />
          </div>
        </div>
        <div className="kb-panel">
          <div className="kb-section-title compact">
            <h3>Inventory and image library</h3>
            <EntitlementBadge allowed={inventory.allowed} label={inventory.allowed ? "Business" : "Business preview"} />
          </div>
          <div className="kb-settings-list">
            <SettingRow title="Material inventory" body="Track material lots, batch quantities, reorder points, and recipe usage from your own records." />
            <SettingRow title="Kiln inventory" body="Track shelves, posts, cones, thermocouples, elements, burners, and maintenance history." />
            <SettingRow title="Advanced image search" body="Filter by glaze, clay body, firing, cone, temperature, kiln position, atmosphere, year, piece type, and defect." />
          </div>
        </div>
      </section>
    </div>
  );
}

function AuthGate({
  eyebrow,
  title,
  body,
  authStatus,
  onGoogleSignIn,
}: {
  eyebrow: string;
  title: string;
  body: string;
  authStatus: AuthStatus;
  onGoogleSignIn: () => void;
}) {
  const disabled = authStatus.state === "loading" || authStatus.state === "unconfigured";
  return (
    <section className="kb-panel kb-auth-gate">
      <div className="kb-empty-state">
        <LockKeyhole size={28} />
        <p className="kb-kicker">{eyebrow}</p>
        <strong>{title}</strong>
        <p>{body}</p>
        <button
          type="button"
          className="kb-primary-button"
          onClick={onGoogleSignIn}
          disabled={disabled}
          title={authStatus.state === "unconfigured" || authStatus.state === "error" ? authStatus.message : undefined}
        >
          <Mail size={17} />
          <span>{authStatus.state === "loading" ? "Checking session" : "Sign in with Google"}</span>
        </button>
      </div>
    </section>
  );
}

function ProfileScreen({
  viewer,
  authStatus,
  posts,
  drafts,
  onOpenSettings,
  onGoogleSignIn,
}: {
  viewer: Profile;
  authStatus: AuthStatus;
  posts: Post[];
  drafts: AddDraft[];
  onOpenSettings: () => void;
  onGoogleSignIn: () => void;
}) {
  if (authStatus.state !== "signed-in") {
    return (
      <AuthGate
        eyebrow="Profile"
        title="Sign in to create your profile"
        body="Your public identity, private recipes, firing records, and saved glaze results belong under your account. Public browsing stays available without signing in."
        authStatus={authStatus}
        onGoogleSignIn={onGoogleSignIn}
      />
    );
  }

  const profileIdentity = viewer.identityLabel ?? formatProfileType(viewer.profileType);
  const business = viewer.businessProfile;
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-profile-head">
          <div
            className={viewer.avatarUrl ? "kb-avatar large photo" : "kb-avatar large"}
            style={
              viewer.avatarUrl
                ? { backgroundImage: `url(${viewer.avatarUrl})` }
                : { background: viewer.avatarColor }
            }
          >
            {!viewer.avatarUrl && viewer.displayName.slice(0, 1)}
          </div>
          <div>
            <p className="kb-kicker">Public profile</p>
            <h2>{viewer.displayName}</h2>
            <span>@{viewer.username}{viewer.locationLabel ? ` · ${viewer.locationLabel}` : ""}</span>
          </div>
          {viewer.subscriptionTier === "business" && <BusinessBadge />}
          <VisibilityPill visibility={viewer.profileVisibility} />
        </div>
        <p>{viewer.biography}</p>
        {business && (
          <section className="kb-business-profile">
            <div
              className="kb-business-hero"
              style={{ background: business.portfolioHeroImageColor ?? viewer.avatarColor }}
            />
            <div>
              <p className="kb-kicker">Business profile</p>
              <h3>{business.businessName}</h3>
              <p>{business.description}</p>
              <div className="kb-business-actions">
                {business.websiteUrl && (
                  <a className="kb-primary-button" href={business.websiteUrl}>
                    Visit Website
                  </a>
                )}
                {business.googleMapsUrl && (
                  <a className="kb-quiet-button" href={business.googleMapsUrl}>
                    Directions
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
        <div className="kb-profile-hierarchy" aria-label="Profile hierarchy">
          <span>
            <strong>Profile</strong>
            <small>{profileIdentity}</small>
          </span>
          <span>
            <strong>Records</strong>
            <small>Firings, glazes, clay bodies</small>
          </span>
          <span>
            <strong>Posts</strong>
            <small>Optional links and image tags</small>
          </span>
          <span>
            <strong>Auth</strong>
            <small>{viewer.authProvider === "google" ? "Google OAuth" : "Supabase Auth"}</small>
          </span>
        </div>
        {business && (
          <div className="kb-settings-list">
            <SettingRow title="Business hours" body={business.businessHours ?? "Hours not published yet."} />
            <SettingRow title="Contact email" body={business.contactEmail ?? viewer.email ?? "Contact email private."} />
            <SettingRow title="Contact phone" body={business.contactPhone ?? "Phone not published."} />
            <SettingRow title="Studio address" body={business.publicStudioAddress ?? "Address private."} />
            <SettingRow title="Social and shop links" body={[business.instagram, business.etsy, business.shopify, business.facebook, business.youtube].filter(Boolean).join(" / ") || "No public shop links yet."} />
          </div>
        )}
        <div className="kb-chip-row">
          <span className="kb-chip record">{profileIdentity}</span>
          <span className="kb-chip">{viewer.emailVerified ? "verified email" : "email pending"}</span>
          {viewer.specialties.map((specialty) => (
            <span className="kb-chip" key={specialty}>{specialty}</span>
          ))}
        </div>
        <button type="button" className="kb-primary-button" onClick={onOpenSettings}>
          <Settings size={18} />
          <span>Edit settings</span>
        </button>
      </section>
      <aside className="kb-panel">
        <div className="kb-section-title compact">
          <h3>Recent posts</h3>
          <span>{posts.length} linked records</span>
        </div>
        {posts.map((post) => (
          <div className="kb-linked-row" key={post.id}>
            <span>{post.body.slice(0, 58)}...</span>
            <strong>{post.likes}</strong>
            <small>likes</small>
          </div>
        ))}
        <AddDraftList drafts={drafts.slice(0, 4)} compact />
      </aside>
    </div>
  );
}

function SettingsScreen({
  viewer,
  authStatus,
  onGoogleSignIn,
}: {
  viewer: Profile;
  authStatus: AuthStatus;
  onGoogleSignIn: () => void;
}) {
  if (authStatus.state !== "signed-in") {
    return (
      <AuthGate
        eyebrow="Settings"
        title="Sign in to manage account settings"
        body="Authentication, privacy, notification, and subscription settings are only available after you connect a Supabase account."
        authStatus={authStatus}
        onGoogleSignIn={onGoogleSignIn}
      />
    );
  }

  const plan = viewer.subscriptionTier;
  const messaging = getEntitlementDecision(plan, "limited_messaging");
  const privateHistory = getEntitlementDecision(plan, "private_recipe_history");
  const businessProfile = getEntitlementDecision(plan, "business_profile");
  const costTracking = getEntitlementDecision(plan, "cost_tracking");
  const advancedExport = getEntitlementDecision(plan, "advanced_export");
  return (
    <div className="kb-grid-two">
      <section className="kb-panel">
        <div className="kb-section-title">
          <div>
            <p className="kb-kicker">Account settings</p>
            <h2>Authentication, units, privacy, and notifications</h2>
          </div>
        </div>
        <div className="kb-settings-list">
          <SettingRow
            title="Supabase Auth"
            body={`${viewer.authProvider === "google" ? "Google OAuth" : "Email auth"} profile model${viewer.emailVerified ? " with verified email" : ""}.`}
          />
          <SettingRow title="Account email" body={viewer.email ?? "Private until a Supabase session is connected."} />
          <SettingRow title="Profile identity" body="Choose artist, studio, educator, researcher, collective, supplier, or a custom label." />
          <SettingRow title="Preferred units" body="Celsius, grams, liters, and kph stored as normalized presentation preferences." />
          <SettingRow title="Profile visibility" body="Public profile, private email, configurable notification preferences." />
        </div>
      </section>
      <aside className="kb-panel">
        <div className="kb-section-title compact">
          <h3>Subscription</h3>
          <EntitlementBadge allowed label={formatPlanLabel(plan)} />
        </div>
        <BusinessLaunchCard active={businessProfile.allowed} />
        <div className="kb-settings-list">
          <SettingRow title="Monthly conversation requests" body={`${messaging.limit ?? "Unlimited"} new requests available on this plan.`} />
          <SettingRow title="Recipe version history" body={privateHistory.allowed ? "Private recipe history is active." : privateHistory.reason} />
          <SettingRow title="Free plan promise" body="Firings, glazes, clay bodies, images, posting, following, comments, and community browsing stay available on Free." />
          <SettingRow title="Business profile" body={businessProfile.allowed ? "Public business profile, portfolio links, services, contact, and directory placement are active." : businessProfile.reason} />
          <SettingRow title="Cost tracking" body={costTracking.allowed ? "Fuel, labor, maintenance, depreciation, and per-piece cost tools are active." : costTracking.reason} />
          <SettingRow title="Exports" body={advancedExport.allowed ? "CSV, PDF reports, inventory reports, financial summaries, and JSON backups are active." : "Basic CSV and JSON backup included; PDF reports and financial summaries are Business."} />
        </div>
      </aside>
    </div>
  );
}

function LibraryScreen({
  glazes,
  clayBodies,
  kilns,
  onViewChange,
}: {
  glazes: GlazeProfile[];
  clayBodies: ClayBodyProfile[];
  kilns: KilnProfile[];
  onViewChange: (view: View) => void;
}) {
  return (
    <section className="kb-panel">
      <div className="kb-section-title">
        <div>
          <p className="kb-kicker">Mobile library</p>
          <h2>Glazes, clay bodies, and kilns</h2>
        </div>
      </div>
      <div className="kb-library-grid">
        <button type="button" onClick={() => onViewChange("Glazes")}>
          <LibraryCard title="Glazes" eyebrow={`${glazes.length} profiles`} detail="Recipes and results" color={BRAND_COLORS.ashBlue} />
        </button>
        <button type="button" onClick={() => onViewChange("Clay Bodies")}>
          <LibraryCard title="Clay Bodies" eyebrow={`${clayBodies.length} profiles`} detail="Fit and fired color" color={BRAND_COLORS.stone} />
        </button>
        <button type="button" onClick={() => onViewChange("Kilns")}>
          <LibraryCard title="Kilns" eyebrow={`${kilns.length} profiles`} detail="Specs and maintenance" color={BRAND_COLORS.cobalt} />
        </button>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="kb-metric-card">
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function LibraryCard({
  title,
  eyebrow,
  detail,
  color,
}: {
  title: string;
  eyebrow: string;
  detail: string;
  color: string;
}) {
  return (
    <article className="kb-library-card">
      <div className="kb-library-swatch" style={{ background: color }} />
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AddDraftList({ drafts, compact = false }: { drafts: AddDraft[]; compact?: boolean }) {
  if (drafts.length === 0) return null;

  return (
    <div className={compact ? "kb-add-draft-list compact" : "kb-add-draft-list"}>
      {drafts.map((draft) => (
        <div className="kb-add-draft" key={draft.id}>
          <span className="kb-add-kind">{formatAddKind(draft.kind)}</span>
          <strong>{draft.title}</strong>
          <small>{draft.detail}</small>
          <VisibilityPill visibility={draft.visibility} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="kb-empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
      <p>{body}</p>
      <button type="button" className="kb-primary-button" onClick={onAction}>
        <Search size={17} />
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}

function VisibilityPill({ visibility }: { visibility: Visibility }) {
  const Icon = visibility === "private" ? LockKeyhole : visibility === "public" ? Sparkles : ShieldCheck;
  return (
    <span className={`kb-visibility ${visibility}`}>
      <Icon size={14} />
      {visibility === "studio" ? "studio only" : visibility}
    </span>
  );
}

function BusinessBadge() {
  return (
    <span className="kb-business-badge">
      <ShieldCheck size={14} aria-hidden="true" />
      Business
    </span>
  );
}

function EntitlementBadge({ allowed, label }: { allowed: boolean; label: string }) {
  return (
    <span className={allowed ? "kb-entitlement allowed" : "kb-entitlement preview"}>
      {allowed ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}
      {label}
    </span>
  );
}

function BusinessLaunchCard({ active }: { active: boolean }) {
  const [launchActive, setLaunchActive] = useState(active);
  const price = `$${BUSINESS_LAUNCH_OFFER.monthlyPriceUsd.toFixed(2)}/month`;
  return (
    <div className="kb-plan-card">
      <span className="kb-kicker">Business launch offer</span>
      <strong>Professional ceramics tools are free during the 2026 initial release.</strong>
      <div className="kb-price-line" aria-label={`Business price ${price} crossed out, free in ${BUSINESS_LAUNCH_OFFER.releaseYear}`}>
        <s>{price}</s>
        <b>Free in {BUSINESS_LAUNCH_OFFER.releaseYear}</b>
      </div>
      <p>
        Starting in {BUSINESS_LAUNCH_OFFER.futureYear}, Business will be {price}. Upgrade now to use
        directory, portfolio, analytics, inventory, cost tracking, exports, and reminders during launch.
      </p>
      <button
        type="button"
        className="kb-primary-button full"
        aria-pressed={launchActive}
        disabled={launchActive}
        onClick={() => setLaunchActive(true)}
      >
        {launchActive ? "Business active during initial release" : "Upgrade to Business for free"}
      </button>
    </div>
  );
}

function SettingRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="kb-setting-row">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function MobileNav({
  view,
  onViewChange,
  onAdd,
  onSearch,
}: {
  view: View;
  onViewChange: (view: View) => void;
  onAdd: () => void;
  onSearch: () => void;
}) {
  const items: MobileNavItem[] = [
    { label: "Home", view: "Home", icon: BookOpen },
    { label: "Explore", view: "Explore", icon: Search },
    { label: "Add", icon: Plus, action: "add" },
    { label: "Search", icon: Search, action: "search" },
    { label: "Profile", view: "Profile", icon: UserRound },
  ];
  return (
    <nav className="kb-mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const active = "view" in item && view === item.view;
        const compose = "action" in item && item.action === "add";
        return (
          <button
            type="button"
            key={item.label}
            className={[
              active ? "active" : "",
              compose ? "compose" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => {
              if ("action" in item) {
                if (item.action === "add") onAdd();
                else onSearch();
                return;
              }
              onViewChange(item.view);
            }}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function atmosphereData(firings: FiringRecord[]) {
  const counts = firings.reduce<Record<string, number>>((acc, firing) => {
    const key = firing.atmosphere.replaceAll("_", " ");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

function relativeDate(value: string): string {
  const diffHours = Math.max((Date.now() - new Date(value).getTime()) / 3_600_000, 0);
  if (diffHours < 24) return `${Math.max(Math.round(diffHours), 1)}h`;
  return `${Math.round(diffHours / 24)}d`;
}

function formatProfileType(profileType: Profile["profileType"]) {
  return profileType
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAddKind(kind: AddKind) {
  return kind.replaceAll("_", " ");
}
