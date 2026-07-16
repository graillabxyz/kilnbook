import assert from "node:assert/strict";
import test from "node:test";
import { getEntitlementDecision } from "../lib/entitlements";
import { calculateRateOfChange, estimateFiringDuration } from "../lib/firing-calculator";
import { rankPopularPosts, scorePopularPost } from "../lib/feed-ranking";
import { canViewRecord } from "../lib/privacy";
import { calculateRecipeTotalPercentage, recipesLikelyDuplicate, scaleRecipe } from "../lib/recipe";
import { firingLogPoints, firings, glazeRecipeVersions, posts } from "../lib/seed-data";
import { BUSINESS_LAUNCH_OFFER, formatPlanLabel } from "../lib/subscriptions";
import {
  celsiusToFahrenheit,
  convertWeight,
  convertWindSpeed,
  fahrenheitToCelsius,
} from "../lib/units";

test("temperature conversion preserves normalized values", () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(Math.round(fahrenheitToCelsius(2232)), 1222);
});

test("weight and wind-speed conversions cover supported units", () => {
  assert.equal(Math.round(convertWeight(1000, "g", "lb") * 100) / 100, 2.2);
  assert.equal(Math.round(convertWindSpeed(16.09344, "kph", "mph") * 10) / 10, 10);
  assert.equal(Math.round(convertWindSpeed(10, "mps", "knots") * 10) / 10, 19.4);
});

test("rate of rise is calculated from elapsed minutes", () => {
  const points = calculateRateOfChange(
    firingLogPoints.filter((point) => point.firingId === "firing-042").slice(0, 3),
  );

  assert.equal(points[0].rateCPerHour, null);
  assert.equal(points[1].rateCPerHour, 52);
  assert.equal(points[2].rateCPerHour, 40);
});

test("firing estimate produces ranges and safety warnings", () => {
  const selected = firings[0];
  const estimate = estimateFiringDuration({
    kilnType: selected.firingType,
    fuelType: "natural gas",
    kilnVolumeLiters: 680,
    kilnAgeYears: 8,
    loadFullnessPercentage: selected.loadFullnessPercentage,
    wareDensity: "dense",
    averageWallThicknessMm: 10,
    targetTemperatureC: selected.targetTemperatureC,
    targetCone: selected.targetCone,
    atmosphere: selected.atmosphere,
    plannedPreheatHours: 0.5,
    holdMinutes: 20,
    controlledCooling: true,
    startingAmbientC: 19,
    kilnLocation: "semi_enclosed",
    humidityPercentage: 84,
    windSpeedKph: 28,
    comparableFirings: firings.slice(1).map((firing) => ({
      id: firing.id,
      title: firing.title,
      targetTemperatureC: firing.targetTemperatureC,
      loadFullnessPercentage: firing.loadFullnessPercentage,
      atmosphere: firing.atmosphere,
      totalHeatingMinutes: firing.totalHeatingMinutes ?? 0,
      totalCoolingMinutes: firing.totalCoolingMinutes ?? 0,
    })),
  });

  assert.ok(estimate.totalHoursRange[1] > estimate.totalHoursRange[0]);
  assert.equal(estimate.recommendedLoggingIntervalMinutes, 30);
  assert.ok(estimate.warnings.length >= 2);
});

test("recipe scaling and duplicate fingerprints respect version ingredients", () => {
  const recipe = glazeRecipeVersions.find((item) => item.id === "recipe-tenmoku-v3");
  assert.ok(recipe);

  assert.equal(calculateRecipeTotalPercentage(recipe.ingredients.filter((i) => i.role === "base")), 100);
  const scaled = scaleRecipe(recipe.ingredients, 2000);
  assert.equal(scaled.find((item) => item.materialName === "Custer Feldspar")?.weightGrams, 940);
  assert.equal(recipesLikelyDuplicate(recipe.ingredients, [...recipe.ingredients].reverse()), true);
});

test("entitlement decisions are centralized", () => {
  assert.equal(getEntitlementDecision("free", "basic_firing_curves").allowed, true);
  const advanced = getEntitlementDecision("free", "advanced_firing_analytics");
  assert.equal(advanced.allowed, false);
  assert.equal(advanced.planRequired, "business");
  assert.equal(getEntitlementDecision("business", "cost_tracking").allowed, true);
  assert.equal(getEntitlementDecision("business", "material_inventory").allowed, true);
  assert.equal(getEntitlementDecision("professional", "advanced_export").allowed, false);
});

test("business launch offer preserves 2026 free upgrade and 2027 price", () => {
  assert.equal(formatPlanLabel("business"), "Business");
  assert.equal(BUSINESS_LAUNCH_OFFER.releaseYear, 2026);
  assert.equal(BUSINESS_LAUNCH_OFFER.futureYear, 2027);
  assert.equal(BUSINESS_LAUNCH_OFFER.monthlyPriceUsd, 4.99);
});

test("popular feed ranking decays old engagement", () => {
  const ranked = rankPopularPosts(posts, new Date("2026-07-12T00:00:00.000Z"));
  assert.equal(ranked[0].id, "post-firing-042");

  const clean = scorePopularPost({ likes: 12, comments: 4, replies: 2, saves: 3, uniqueInteractors: 15, createdAt: "2026-07-11T20:00:00.000Z" }, new Date("2026-07-12T00:00:00.000Z"));
  const spammed = scorePopularPost({ likes: 12, comments: 4, replies: 2, saves: 3, uniqueInteractors: 15, spamCommentCount: 8, createdAt: "2026-07-11T20:00:00.000Z" }, new Date("2026-07-12T00:00:00.000Z"));
  assert.ok(clean > spammed);
});

test("privacy rules prevent accidental private record exposure", () => {
  assert.equal(
    canViewRecord(
      { viewerId: "profile-jules", followingProfileIds: [], studioIds: [], blockedProfileIds: [], plan: "free" },
      { ownerId: "profile-mara", visibility: "private" },
    ),
    false,
  );

  assert.equal(
    canViewRecord(
      { viewerId: "profile-jules", followingProfileIds: ["profile-mara"], studioIds: [], blockedProfileIds: [], plan: "free" },
      { ownerId: "profile-mara", visibility: "followers" },
    ),
    true,
  );
});
