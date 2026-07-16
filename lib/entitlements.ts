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
  studio: 2,
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
    limit: { free: 8, professional: 80, studio: 400 },
    reason: "Free plans can start a limited number of new conversations each month.",
  },
  advanced_firing_analytics: {
    minimumPlan: "professional",
    reason: "Advanced analytics use paid historical comparison and saved dashboard features.",
  },
  multi_firing_comparison: {
    minimumPlan: "professional",
    reason: "Two-to-five firing overlays are part of professional analytics.",
  },
  smart_schedule_generation: {
    minimumPlan: "professional",
    reason: "Smart schedules use comparable firings and validation rules.",
  },
  private_recipe_history: {
    minimumPlan: "professional",
    reason: "Version history for private recipes requires the professional plan.",
  },
  full_resolution_storage: {
    minimumPlan: "professional",
    reason: "Full-resolution image storage uses the expanded storage allowance.",
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

