export type ID = string;

export type Visibility = "private" | "followers" | "studio" | "public";

export type UserPlan = "free" | "professional" | "studio";

export type ProfileType =
  | "artist"
  | "studio"
  | "educator"
  | "researcher"
  | "collective"
  | "supplier"
  | "custom";

export type TemperatureUnit = "c" | "f";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type WindSpeedUnit = "kph" | "mph" | "mps" | "knots";

export type FiringStatus =
  | "draft"
  | "planned"
  | "scheduled"
  | "in_progress"
  | "cooling"
  | "completed"
  | "cancelled"
  | "archived";

export type FiringType =
  | "electric"
  | "gas"
  | "wood"
  | "soda"
  | "salt"
  | "raku"
  | "pit"
  | "saggar"
  | "experimental"
  | "other";

export type AtmosphereType =
  | "oxidation"
  | "neutral"
  | "light_reduction"
  | "reduction"
  | "heavy_reduction"
  | "localized_reduction"
  | "carbon_trapping"
  | "flashing"
  | "soda"
  | "salt"
  | "unknown"
  | "other";

export type SegmentType =
  | "preheat"
  | "candling"
  | "drying"
  | "heating"
  | "ramp"
  | "body_reduction"
  | "glaze_reduction"
  | "oxidation"
  | "neutral"
  | "soak"
  | "hold"
  | "crash_cool"
  | "controlled_cool"
  | "natural_cool"
  | "other";

export type KilnLocation =
  | "indoors"
  | "outdoors_uncovered"
  | "outdoors_partially_covered"
  | "outdoors_fully_covered_open_sided"
  | "semi_enclosed"
  | "other";

export type GlazeApplicationMethod =
  | "dipping"
  | "pouring"
  | "spraying"
  | "brushing"
  | "trailing"
  | "sponging"
  | "layering"
  | "raw_glazing"
  | "other";

export type ResultDefect =
  | "crazing"
  | "shivering"
  | "crawling"
  | "pinholing"
  | "blistering"
  | "bloating"
  | "dunting"
  | "warping"
  | "cracking"
  | "carbon_trapping"
  | "dry_surface"
  | "running"
  | "underfired"
  | "overfired"
  | "uneven_color"
  | "glaze_fit_issue"
  | "other";

export interface Profile {
  id: ID;
  displayName: string;
  username: string;
  avatarColor: string;
  biography: string;
  profileType: ProfileType;
  identityLabel?: string;
  locationLabel?: string;
  website?: string;
  specialties: string[];
  preferredTemperatureUnit: TemperatureUnit;
  preferredWeightUnit: WeightUnit;
  preferredWindSpeedUnit: WindSpeedUnit;
  profileVisibility: Visibility;
  subscriptionTier: UserPlan;
  onboardingComplete: boolean;
}

export interface KilnProfile {
  id: ID;
  ownerId: ID;
  name: string;
  manufacturer: string;
  model: string;
  kilnType: FiringType;
  fuelType: string;
  controllerType: string;
  usableVolumeLiters: number;
  maxTemperatureC: number;
  recommendedConeRange: string;
  defaultLocation: KilnLocation;
  powerKw?: number;
  active: boolean;
  visibility: Visibility;
  notes: string;
}

export interface CeramicMaterial {
  id: ID;
  name: string;
  category: "flux" | "silica" | "alumina" | "colorant" | "additive" | "clay" | "other";
}

export interface RecipeIngredient {
  materialId: ID;
  materialName: string;
  percentage: number;
  weightGrams: number;
  role: "base" | "colorant" | "additive";
}

export interface GlazeRecipeVersion {
  id: ID;
  glazeId: ID;
  versionNumber: number;
  effectiveDate: string;
  batchSizeGrams: number;
  totalDryWeightGrams: number;
  waterAmountGrams?: number;
  ingredients: RecipeIngredient[];
  sourceAttribution: string;
  changeSummary: string;
  privateNotes?: string;
  visibility: Visibility;
}

export interface GlazeProfile {
  id: ID;
  ownerId: ID;
  name: string;
  creatorAttribution: string;
  source: string;
  glazeType: string;
  surface: string;
  colorFamily: string[];
  opacity: string;
  firingRange: string;
  coneRange: string;
  atmosphereCompatibility: AtmosphereType[];
  recipeVisibility: Visibility;
  profileVisibility: Visibility;
  description: string;
  applicationNotes: string;
  heroImageColor: string;
  currentRecipeVersionId: ID;
}

export interface ClayBodyProfile {
  id: ID;
  ownerId: ID;
  name: string;
  manufacturer: string;
  supplier: string;
  bodyType: string;
  rawColor: string;
  firedColor: string;
  texture: string;
  grogPercentage?: number;
  absorptionPercentage?: number;
  shrinkagePercentage?: number;
  coneRange: string;
  atmosphereSuitability: AtmosphereType[];
  recipeVisibility: Visibility;
  profileVisibility: Visibility;
  notes: string;
  imageColor: string;
}

export interface FiringSegment {
  id: ID;
  firingId: ID;
  segmentType: SegmentType;
  startHour: number;
  endHour: number;
  startTemperatureC: number;
  targetTemperatureC: number;
  atmosphere: AtmosphereType;
  notes?: string;
}

export interface FiringLogPoint {
  id: ID;
  firingId: ID;
  timestamp: string;
  elapsedMinutes: number;
  targetTemperatureC?: number;
  actualTemperatureC: number;
  atmosphere?: AtmosphereType;
  gasPressureKpa?: number;
  oxygenPercentage?: number;
  damperPosition?: string;
  burnerSetting?: string;
  notes?: string;
  manual: boolean;
}

export interface FiringEnvironmentRecord {
  id: ID;
  firingId: ID;
  kilnLocation: KilnLocation;
  outsideStartTemperatureC?: number;
  outsideLowC?: number;
  outsideHighC?: number;
  indoorAmbientTemperatureC?: number;
  humidityStartPercentage?: number;
  humidityLowPercentage?: number;
  humidityHighPercentage?: number;
  windSpeedKph?: number;
  windDirection?: string;
  windGustKph?: number;
  rainConditions?: string;
  ventilationNotes?: string;
  weatherNotes?: string;
}

export interface FiringRecord {
  id: ID;
  ownerId: ID;
  studioId?: ID;
  title: string;
  readableNumber: string;
  kilnId: ID;
  kilnNameSnapshot: string;
  kilnSpecSnapshot: string;
  firingType: FiringType;
  status: FiringStatus;
  visibility: Visibility;
  plannedStartAt: string;
  actualStartAt?: string;
  actualEndAt?: string;
  timezone: string;
  leadFirer: string;
  targetTemperatureC: number;
  targetCone: string;
  witnessConeResult?: string;
  atmosphere: AtmosphereType;
  loadFullnessPercentage: number;
  totalHeatingMinutes?: number;
  totalCoolingMinutes?: number;
  successRating?: number;
  notes: string;
}

export interface CeramicPiece {
  id: ID;
  ownerId: ID;
  title: string;
  type: string;
  clayBodyId: ID;
  formingMethod: string;
  estimatedWallThicknessMm?: number;
  notes: string;
}

export interface GlazeApplicationLayer {
  id: ID;
  applicationId: ID;
  glazeId: ID;
  glazeRecipeVersionId: ID;
  layerOrder: number;
  location: "base" | "top" | "overlap" | "interior" | "exterior" | "accent";
  coats: number;
}

export interface GlazeApplication {
  id: ID;
  firingId: ID;
  glazeId: ID;
  glazeRecipeVersionId: ID;
  clayBodyId: ID | null;
  ceramicPieceId?: ID;
  method: GlazeApplicationMethod;
  thickness: "thin" | "medium" | "thick" | "variable";
  coats: number;
  specificGravity?: number;
  bisqueTemperatureC?: number;
  kilnPosition: string;
  shelfLevel: string;
  orientation: string;
  resultRating?: number;
  resultStatus: "untested" | "promising" | "successful" | "needs_adjustment" | "failed";
  defects: ResultDefect[];
  notes: string;
}

export interface CeramicImage {
  id: ID;
  ownerId: ID;
  storagePath: string;
  altText: string;
  caption: string;
  focalPoint: { x: number; y: number };
  visibility: Visibility;
  firingIds: ID[];
  glazeIds: ID[];
  clayBodyIds: ID[];
  pieceIds: ID[];
  glazeApplicationIds: ID[];
}

export interface Post {
  id: ID;
  authorId: ID;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  visibility: Visibility;
  linkedFiringId?: ID;
  linkedGlazeId?: ID;
  linkedClayBodyId?: ID;
  linkedPieceId?: ID;
  imageIds: ID[];
  hashtags: string[];
  structuredTagLabels: string[];
  likes: number;
  comments: number;
  replies: number;
  saves: number;
  uniqueInteractors: number;
  viewerLiked: boolean;
  locationLabel?: string;
}

export interface ConversationPreview {
  id: ID;
  participantName: string;
  participantUsername: string;
  unreadCount: number;
  lastMessage: string;
  updatedAt: string;
  linkedRecordLabel?: string;
}
