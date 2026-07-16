import { createClient } from "@supabase/supabase-js";
import { BRAND_COLORS, BRAND_PROFILE_COLORS } from "../brand";
import type {
  AuthProvider,
  AtmosphereType,
  CeramicImage,
  ClayBodyProfile,
  ConversationPreview,
  FiringEnvironmentRecord,
  FiringLogPoint,
  FiringRecord,
  FiringSegment,
  FiringType,
  GlazeApplication,
  GlazeApplicationLayer,
  GlazeProfile,
  GlazeRecipeVersion,
  KilnLocation,
  KilnProfile,
  Post,
  Profile,
  ProfileType,
  RecipeIngredient,
  UserPlan,
  Visibility,
  WindSpeedUnit,
  WeightUnit,
  TemperatureUnit,
} from "../domain";
import { readClientSupabaseEnv } from "../env";

type Row = Record<string, unknown>;

export interface KilnbookWorkspaceSnapshot {
  viewer: Profile;
  profiles: Profile[];
  kilns: KilnProfile[];
  clayBodies: ClayBodyProfile[];
  glazes: GlazeProfile[];
  glazeRecipeVersions: GlazeRecipeVersion[];
  firings: FiringRecord[];
  firingSegments: FiringSegment[];
  firingLogPoints: FiringLogPoint[];
  firingEnvironmentRecords: FiringEnvironmentRecord[];
  glazeApplications: GlazeApplication[];
  glazeApplicationLayers: GlazeApplicationLayer[];
  images: CeramicImage[];
  posts: Post[];
  conversations: ConversationPreview[];
}

export interface KilnbookRepository {
  getWorkspaceSnapshot(profileId: string): Promise<KilnbookWorkspaceSnapshot>;
}

const anonymousViewer: Profile = {
  id: "anonymous",
  displayName: "Guest",
  username: "guest",
  avatarColor: BRAND_COLORS.cobalt,
  biography: "",
  profileType: "artist",
  authProvider: "unknown",
  emailVerified: false,
  specialties: [],
  preferredTemperatureUnit: "c",
  preferredWeightUnit: "g",
  preferredWindSpeedUnit: "kph",
  profileVisibility: "public",
  subscriptionTier: "free",
  onboardingComplete: false,
};

const emptySnapshot: KilnbookWorkspaceSnapshot = {
  viewer: anonymousViewer,
  profiles: [],
  kilns: [],
  clayBodies: [],
  glazes: [],
  glazeRecipeVersions: [],
  firings: [],
  firingSegments: [],
  firingLogPoints: [],
  firingEnvironmentRecords: [],
  glazeApplications: [],
  glazeApplicationLayers: [],
  images: [],
  posts: [],
  conversations: [],
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function focalPointValue(value: unknown): CeramicImage["focalPoint"] {
  if (typeof value !== "object" || value === null) return { x: 0.5, y: 0.5 };
  const point = value as { x?: unknown; y?: unknown };
  return {
    x: numberValue(point.x, 0.5),
    y: numberValue(point.y, 0.5),
  };
}

function arrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function visibilityValue(value: unknown, fallback: Visibility = "public"): Visibility {
  return value === "private" || value === "followers" || value === "studio" || value === "public"
    ? value
    : fallback;
}

function authProviderValue(value: unknown, fallback: AuthProvider = "unknown"): AuthProvider {
  return value === "email" || value === "google" || value === "magic_link" || value === "sso" || value === "unknown"
    ? value
    : fallback;
}

function hashColor(seed: unknown, palette: readonly string[] = BRAND_PROFILE_COLORS) {
  const value = text(seed, "flux");
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length] ?? BRAND_COLORS.terracotta;
}

function mapProfile(row: Row, authDetails?: Row): Profile {
  return {
    id: text(row.id),
    displayName: text(row.display_name, "Ceramic artist"),
    username: text(row.username, "artist"),
    avatarColor: hashColor(row.username),
    avatarUrl: optionalText(row.avatar_url),
    biography: text(row.biography),
    profileType: text(row.profile_type, "artist") as ProfileType,
    identityLabel: optionalText(row.identity_label),
    email: optionalText(authDetails?.email),
    authProvider: authProviderValue(authDetails?.auth_provider),
    authProviderId: optionalText(authDetails?.auth_provider_id),
    emailVerified: Boolean(authDetails?.email_verified),
    locationLabel: optionalText(row.approximate_location),
    website: optionalText(row.website),
    specialties: arrayValue(row.ceramic_specialties),
    preferredTemperatureUnit: text(row.preferred_temperature_unit, "c") as TemperatureUnit,
    preferredWeightUnit: text(row.preferred_weight_unit, "g") as WeightUnit,
    preferredWindSpeedUnit: text(row.preferred_wind_speed_unit, "kph") as WindSpeedUnit,
    profileVisibility: visibilityValue(row.visibility),
    subscriptionTier: text(row.subscription_tier, "free") as UserPlan,
    onboardingComplete: Boolean(row.onboarding_complete),
  };
}

function mapGlaze(row: Row): GlazeProfile {
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    name: text(row.name, "Untitled glaze"),
    creatorAttribution: text(row.creator_attribution, "Unknown"),
    source: text(row.source, "Live database"),
    glazeType: text(row.glaze_type, "glaze"),
    surface: text(row.surface, text(row.finish, "surface pending")),
    colorFamily: arrayValue(row.color_family),
    opacity: text(row.opacity, "unknown"),
    firingRange: text(row.firing_range, text(row.cone_range, "Cone range pending")),
    coneRange: text(row.cone_range, "pending"),
    atmosphereCompatibility: arrayValue(row.atmosphere_compatibility) as AtmosphereType[],
    recipeVisibility: visibilityValue(row.recipe_visibility),
    profileVisibility: visibilityValue(row.profile_visibility),
    description: text(row.description),
    applicationNotes: text(row.application_notes),
    heroImageColor: hashColor(row.name, [
      BRAND_COLORS.terracotta,
      BRAND_COLORS.ashBlue,
      BRAND_COLORS.sun,
      BRAND_COLORS.moss,
      BRAND_COLORS.stone,
    ]),
    currentRecipeVersionId: "",
  };
}

function mapRecipeIngredient(row: Row): RecipeIngredient {
  return {
    materialId: optionalText(row.material_id) ?? text(row.material_name_snapshot),
    materialName: text(row.material_name_snapshot, "Material"),
    percentage: numberValue(row.percentage),
    weightGrams: numberValue(row.weight_grams),
    role: text(row.ingredient_role, "base") as RecipeIngredient["role"],
  };
}

function mapGlazeRecipeVersion(
  row: Row,
  ingredients: RecipeIngredient[],
): GlazeRecipeVersion {
  return {
    id: text(row.id),
    glazeId: text(row.glaze_id),
    versionNumber: numberValue(row.version_number, 1),
    effectiveDate: text(row.effective_date, new Date().toISOString().slice(0, 10)),
    batchSizeGrams: numberValue(row.batch_size_grams, 1000),
    totalDryWeightGrams: numberValue(row.total_dry_weight_grams, 1000),
    waterAmountGrams: row.water_amount_grams == null ? undefined : numberValue(row.water_amount_grams),
    ingredients,
    sourceAttribution: text(row.source_attribution, "Live database"),
    changeSummary: text(row.change_summary, "Recipe version"),
    privateNotes: optionalText(row.notes),
    visibility: visibilityValue(row.visibility),
  };
}

function mapClayBody(row: Row): ClayBodyProfile {
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    name: text(row.name, "Untitled clay body"),
    manufacturer: text(row.manufacturer),
    supplier: text(row.supplier),
    bodyType: text(row.body_type, "clay"),
    rawColor: text(row.raw_color, "unknown"),
    firedColor: text(row.fired_color, "pending"),
    texture: text(row.texture, "unspecified"),
    grogPercentage: row.grog_percentage == null ? undefined : numberValue(row.grog_percentage),
    absorptionPercentage: row.absorption_percentage == null ? undefined : numberValue(row.absorption_percentage),
    shrinkagePercentage: row.shrinkage_percentage == null ? undefined : numberValue(row.shrinkage_percentage),
    coneRange: text(row.cone_range, text(row.maturation_range, "pending")),
    atmosphereSuitability: arrayValue(row.atmosphere_suitability) as AtmosphereType[],
    recipeVisibility: visibilityValue(row.recipe_visibility),
    profileVisibility: visibilityValue(row.profile_visibility),
    notes: text(row.notes),
    imageColor: hashColor(row.name, [BRAND_COLORS.stone, BRAND_COLORS.clay, BRAND_COLORS.ashBlue]),
  };
}

function mapKiln(row: Row): KilnProfile {
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    name: text(row.name, "Untitled kiln"),
    manufacturer: text(row.manufacturer, "Unknown"),
    model: text(row.model, "Unknown"),
    kilnType: text(row.kiln_type, "electric") as FiringType,
    fuelType: text(row.fuel_type, "unknown"),
    controllerType: text(row.controller_type, "unspecified"),
    usableVolumeLiters: numberValue(row.usable_volume_liters),
    maxTemperatureC: numberValue(row.maximum_temperature_c),
    recommendedConeRange: text(row.recommended_cone_range, "pending"),
    defaultLocation: text(row.default_location, "indoors") as KilnLocation,
    powerKw: row.power_kw == null ? undefined : numberValue(row.power_kw),
    active: row.active !== false,
    visibility: visibilityValue(row.visibility),
    notes: text(row.notes),
  };
}

function mapFiring(row: Row): FiringRecord {
  const kilnSpec =
    typeof row.kiln_spec_snapshot === "string"
      ? row.kiln_spec_snapshot
      : JSON.stringify(row.kiln_spec_snapshot ?? {});
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    studioId: optionalText(row.studio_id),
    title: text(row.title, "Untitled firing"),
    readableNumber: text(row.readable_number, "Firing"),
    kilnId: text(row.kiln_id),
    kilnNameSnapshot: text(row.kiln_name_snapshot, "Kiln"),
    kilnSpecSnapshot: kilnSpec,
    firingType: text(row.firing_type, "electric") as FiringType,
    status: text(row.status, "draft") as FiringRecord["status"],
    visibility: visibilityValue(row.visibility),
    plannedStartAt: text(row.planned_start_at, text(row.created_at, new Date().toISOString())),
    actualStartAt: optionalText(row.actual_start_at),
    actualEndAt: optionalText(row.actual_end_at),
    timezone: text(row.timezone, "UTC"),
    leadFirer: text(row.lead_firer_id, "Unknown"),
    targetTemperatureC: numberValue(row.target_temperature_c, 1222),
    targetCone: text(row.target_cone, "6"),
    witnessConeResult: optionalText(row.witness_cone_result),
    atmosphere: text(row.firing_atmosphere, "unknown") as AtmosphereType,
    loadFullnessPercentage: numberValue(row.load_fullness_percentage, 0),
    totalHeatingMinutes: row.total_heating_minutes == null ? undefined : numberValue(row.total_heating_minutes),
    totalCoolingMinutes: row.total_cooling_minutes == null ? undefined : numberValue(row.total_cooling_minutes),
    notes: text(row.notes),
  };
}

function mapImage(row: Row): CeramicImage {
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    storagePath: text(row.storage_path),
    altText: text(row.alt_text),
    caption: text(row.caption),
    focalPoint: focalPointValue(row.focal_point),
    visibility: visibilityValue(row.visibility),
    firingIds: [],
    glazeIds: [],
    clayBodyIds: [],
    pieceIds: [],
    glazeApplicationIds: [],
  };
}

function mapPost(
  row: Row,
  profilesById: Map<string, Profile>,
  linkedGlazeIds: Map<string, string[]>,
  linkedClayIds: Map<string, string[]>,
  linkedFiringIds: Map<string, string[]>,
  linkedImageIds: Map<string, string[]>,
  commentsByPost: Map<string, number>,
  likesByPost: Map<string, number>,
): Post {
  const author = profilesById.get(text(row.author_id));
  const postId = text(row.id);
  const glazeIds = linkedGlazeIds.get(postId) ?? [];
  const clayIds = linkedClayIds.get(postId) ?? [];
  const firingIds = linkedFiringIds.get(postId) ?? [];
  return {
    id: postId,
    authorId: text(row.author_id),
    authorName: author?.displayName ?? "Ceramic artist",
    authorUsername: author?.username ?? "artist",
    body: text(row.body),
    createdAt: text(row.created_at, new Date().toISOString()),
    editedAt: optionalText(row.edited_at),
    visibility: visibilityValue(row.visibility),
    linkedFiringId: firingIds[0],
    linkedGlazeId: glazeIds[0],
    linkedClayBodyId: clayIds[0],
    imageIds: linkedImageIds.get(postId) ?? [],
    hashtags: [],
    structuredTagLabels: [
      ...glazeIds.map(() => "Glaze"),
      ...clayIds.map(() => "Clay body"),
      ...firingIds.map(() => "Firing"),
    ],
    likes: likesByPost.get(postId) ?? numberValue(row.engagement_score),
    comments: commentsByPost.get(postId) ?? 0,
    replies: 0,
    saves: 0,
    uniqueInteractors: likesByPost.get(postId) ?? 0,
    viewerLiked: false,
    locationLabel: optionalText(row.broad_location),
  };
}

function groupIds(rows: Row[] | null, key: string) {
  const grouped = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const postId = text(row.post_id);
    const value = text(row[key]);
    if (!postId || !value) continue;
    grouped.set(postId, [...(grouped.get(postId) ?? []), value]);
  }
  return grouped;
}

function countByPost(rows: Row[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const postId = text(row.post_id);
    if (!postId) continue;
    counts.set(postId, (counts.get(postId) ?? 0) + 1);
  }
  return counts;
}

function groupRecipeIngredients(rows: Row[] | null) {
  const grouped = new Map<string, RecipeIngredient[]>();
  for (const row of rows ?? []) {
    const recipeVersionId = text(row.recipe_version_id);
    if (!recipeVersionId) continue;
    grouped.set(recipeVersionId, [
      ...(grouped.get(recipeVersionId) ?? []),
      mapRecipeIngredient(row),
    ]);
  }
  return grouped;
}

async function readTable<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>) {
  const { data, error } = await promise;
  if (error) throw error;
  return data ?? [];
}

export class SupabaseKilnbookRepository implements KilnbookRepository {
  async getWorkspaceSnapshot(profileId: string): Promise<KilnbookWorkspaceSnapshot> {
    const parsed = readClientSupabaseEnv();
    if (!parsed.success) return emptySnapshot;

    const supabase = createClient(
      parsed.data.NEXT_PUBLIC_SUPABASE_URL,
      parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    try {
      const [
        profileRows,
        profileAuthRows,
        kilnRows,
        clayRows,
        glazeRows,
        recipeRows,
        recipeIngredientRows,
        firingRows,
        imageRows,
        postRows,
        postGlazeRows,
        postClayRows,
        postFiringRows,
        postImageRows,
        commentRows,
        likeRows,
      ] = await Promise.all([
        readTable<Row>(supabase.from("profiles").select("*").eq("visibility", "public").order("created_at")),
        readTable<Row>(supabase.from("profile_auth_details").select("profile_id,email,auth_provider,auth_provider_id,email_verified")),
        readTable<Row>(supabase.from("kilns").select("*").eq("visibility", "public").order("created_at")),
        readTable<Row>(supabase.from("clay_bodies").select("*").eq("profile_visibility", "public").order("created_at")),
        readTable<Row>(supabase.from("glazes").select("*").eq("profile_visibility", "public").order("created_at")),
        readTable<Row>(supabase.from("glaze_recipe_versions").select("*").order("created_at")),
        readTable<Row>(supabase.from("glaze_recipe_ingredients").select("*").order("display_order")),
        readTable<Row>(supabase.from("firings").select("*").eq("visibility", "public").order("created_at", { ascending: false })),
        readTable<Row>(supabase.from("images").select("*").eq("visibility", "public").order("created_at", { ascending: false })),
        readTable<Row>(supabase.from("posts").select("*").eq("visibility", "public").order("created_at", { ascending: false }).limit(50)),
        readTable<Row>(supabase.from("post_glazes").select("*")),
        readTable<Row>(supabase.from("post_clay_bodies").select("*")),
        readTable<Row>(supabase.from("post_firings").select("*")),
        readTable<Row>(supabase.from("post_images").select("*")),
        readTable<Row>(supabase.from("comments").select("post_id").is("deleted_at", null).is("hidden_at", null)),
        readTable<Row>(supabase.from("post_likes").select("post_id")),
      ]);

      const profileAuthById = new Map(profileAuthRows.map((row) => [text(row.profile_id), row]));
      const profiles = profileRows.map((profile) => mapProfile(profile, profileAuthById.get(text(profile.id))));
      const profilesById = createRecordMap(profiles);
      const linkedGlazeIds = groupIds(postGlazeRows, "glaze_id");
      const linkedClayIds = groupIds(postClayRows, "clay_body_id");
      const linkedFiringIds = groupIds(postFiringRows, "firing_id");
      const linkedImageIds = groupIds(postImageRows, "image_id");
      const commentsByPost = countByPost(commentRows);
      const likesByPost = countByPost(likeRows);
      const ingredientsByVersion = groupRecipeIngredients(recipeIngredientRows);
      const glazeRecipeVersions = recipeRows.map((recipe) =>
        mapGlazeRecipeVersion(recipe, ingredientsByVersion.get(text(recipe.id)) ?? []),
      );
      const latestRecipeIdByGlaze = new Map<string, string>();
      for (const recipe of glazeRecipeVersions) {
        const current = latestRecipeIdByGlaze.get(recipe.glazeId);
        const currentVersion = current
          ? glazeRecipeVersions.find((item) => item.id === current)?.versionNumber ?? 0
          : 0;
        if (recipe.versionNumber >= currentVersion) {
          latestRecipeIdByGlaze.set(recipe.glazeId, recipe.id);
        }
      }
      const glazes = glazeRows.map((glaze) => {
        const mapped = mapGlaze(glaze);
        return {
          ...mapped,
          currentRecipeVersionId: latestRecipeIdByGlaze.get(mapped.id) ?? mapped.currentRecipeVersionId,
        };
      });
      const posts = postRows.map((post) =>
        mapPost(
          post,
          profilesById,
          linkedGlazeIds,
          linkedClayIds,
          linkedFiringIds,
          linkedImageIds,
          commentsByPost,
          likesByPost,
        ),
      );

      return {
        viewer: profilesById.get(profileId) ?? anonymousViewer,
        profiles,
        kilns: kilnRows.map(mapKiln),
        clayBodies: clayRows.map(mapClayBody),
        glazes,
        glazeRecipeVersions,
        firings: firingRows.map(mapFiring),
        firingSegments: [],
        firingLogPoints: [],
        firingEnvironmentRecords: [],
        glazeApplications: [],
        glazeApplicationLayers: [],
        images: imageRows.map(mapImage),
        posts,
        conversations: [],
      };
    } catch (error) {
      console.error("Unable to load Supabase workspace snapshot", error);
      return emptySnapshot;
    }
  }
}

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]));
}

export const previewRepository = new SupabaseKilnbookRepository();
