import type { UserPlan } from "./domain";

export const BUSINESS_LAUNCH_OFFER = {
  releaseYear: 2026,
  futureYear: 2027,
  monthlyPriceUsd: 4.99,
  launchPriceLabel: "Free during the 2026 initial release period",
  futurePriceLabel: "$4.99/month in 2027",
} as const;

export const PLAN_LABELS: Record<UserPlan, string> = {
  free: "Free",
  professional: "Professional legacy",
  business: "Business",
  studio: "Studio",
};

export function formatPlanLabel(plan: UserPlan) {
  return PLAN_LABELS[plan] ?? plan;
}
