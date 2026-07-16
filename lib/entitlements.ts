import type { UserPlan } from "./domain";

export type EntitlementFeature =
  | "unlimited_personal_firings"
  | "basic_firing_curves"
  | "image_tagging"
  | "limited_messaging"
  | "advanced_firing_analytics"
  | "multi_firing_comparison"
  | "smart_schedule_generation"
  | "private_recipe_history"
  | "full_resolution_storage"
  | "business_profile"
  | "studio_portfolio"
  | "business_directory"
  | "studio_analytics"
  | "cost_tracking"
  | "advanced_firing_insights"
  | "advanced_image_library"
  | "material_inventory"
  | "kiln_inventory"
  | "business_collections"
  | "advanced_export"
  | "business_notifications"
  | "studio_shared_records"
  | "studio_permissions";

export interface EntitlementDecision {
  allowed: boolean;
  planRequired?: UserPlan;
  limit?: number;
  reason: string;
}

const PLAN_ORDER: Record<UserPlan, number> = {
  free: 0,
  professional: 1,
  business: 2,
  studio: 3,
};

const FEATURE_RULES: Record<
  EntitlementFeature,
  { minimumPlan: UserPlan; limit?: Partial<Record<UserPlan, number>>; reason: string }
> = {
  unlimited_personal_firings: {
    minimumPlan: "free",
    reason: "Personal firing records are included for every plan.",
  },
  basic_firing_curves: {
    minimumPlan: "free",
    reason: "Basic firing curves are included for every plan.",
  },
  image_tagging: {
    minimumPlan: "free",
    reason: "Image tagging is part of the core firing journal.",
  },
  limited_messaging: {
    minimumPlan: "free",
    limit: { free: 8, professional: 80, business: 400, studio: 400 },
    reason: "Free plans can start a limited number of new conversations each month.",
  },
  advanced_firing_analytics: {
    minimumPlan: "business",
    reason: "Advanced analytics are part of the Business studio-management upgrade.",
  },
  multi_firing_comparison: {
    minimumPlan: "business",
    reason: "Two-to-five firing overlays are part of Business analytics.",
  },
  smart_schedule_generation: {
    minimumPlan: "business",
    reason: "Smart schedules use comparable firings and validation rules.",
  },
  private_recipe_history: {
    minimumPlan: "business",
    reason: "Version history for private recipes is included in Business records.",
  },
  full_resolution_storage: {
    minimumPlan: "business",
    reason: "Full-resolution image storage uses the expanded storage allowance.",
  },
  business_profile: {
    minimumPlan: "business",
    reason: "Business profiles add public business contact, links, services, and location details.",
  },
  studio_portfolio: {
    minimumPlan: "business",
    reason: "Public portfolio pages are part of the Business profile upgrade.",
  },
  business_directory: {
    minimumPlan: "business",
    reason: "Business directory discovery is reserved for upgraded Business profiles.",
  },
  studio_analytics: {
    minimumPlan: "business",
    reason: "Studio analytics focus on professional operations, costs, and historical performance.",
  },
  cost_tracking: {
    minimumPlan: "business",
    reason: "Cost tracking supports fuel, labor, depreciation, maintenance, and per-piece estimates.",
  },
  advanced_firing_insights: {
    minimumPlan: "business",
    reason: "Advanced insights compare patterns carefully without implying certainty.",
  },
  advanced_image_library: {
    minimumPlan: "business",
    reason: "Advanced image search filters support large professional ceramic libraries.",
  },
  material_inventory: {
    minimumPlan: "business",
    reason: "Material inventory and batch availability are Business studio-management tools.",
  },
  kiln_inventory: {
    minimumPlan: "business",
    reason: "Kiln equipment inventory and maintenance reminders are Business operations tools.",
  },
  business_collections: {
    minimumPlan: "business",
    reason: "Curated public collections help Business profiles promote work and teaching examples.",
  },
  advanced_export: {
    minimumPlan: "business",
    reason: "Complete CSV, PDF, inventory, financial, and JSON exports are Business reporting tools.",
  },
  business_notifications: {
    minimumPlan: "business",
    reason: "Business reminders cover materials, kiln maintenance, and incomplete studio records.",
  },
  studio_shared_records: {
    minimumPlan: "studio",
    reason: "Shared studio records require studio membership and permissions.",
  },
  studio_permissions: {
    minimumPlan: "studio",
    reason: "Role-based permissions are reserved for studio workspaces.",
  },
};

export function getEntitlementDecision(
  plan: UserPlan,
  feature: EntitlementFeature,
): EntitlementDecision {
  const rule = FEATURE_RULES[feature];
  const allowed = PLAN_ORDER[plan] >= PLAN_ORDER[rule.minimumPlan];
  return {
    allowed,
    planRequired: allowed ? undefined : rule.minimumPlan,
    limit: rule.limit?.[plan],
    reason: rule.reason,
  };
}

export function assertEntitlement(plan: UserPlan, feature: EntitlementFeature): void {
  const decision = getEntitlementDecision(plan, feature);
  if (!decision.allowed) {
    throw new Error(
      `${feature} requires the ${decision.planRequired ?? "professional"} plan. ${decision.reason}`,
    );
  }
}
