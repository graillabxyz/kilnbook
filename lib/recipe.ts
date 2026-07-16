import type { RecipeIngredient } from "./domain";

export interface ScaledIngredient {
  materialId: string;
  materialName: string;
  percentage: number;
  weightGrams: number;
  role: RecipeIngredient["role"];
}

export function calculateRecipeTotalPercentage(
  ingredients: Pick<RecipeIngredient, "percentage">[],
): number {
  return roundTo(
    ingredients.reduce((total, ingredient) => total + ingredient.percentage, 0),
    3,
  );
}

export function scaleRecipe(
  ingredients: Pick<RecipeIngredient, "materialId" | "materialName" | "percentage" | "role">[],
  targetDryWeightGrams: number,
): ScaledIngredient[] {
  const baseTotal = calculateRecipeTotalPercentage(
    ingredients.filter((ingredient) => ingredient.role === "base"),
  );
  if (baseTotal <= 0) {
    throw new Error("Recipe must contain base ingredients before it can be scaled.");
  }

  return ingredients.map((ingredient) => {
    const percentageBasis =
      ingredient.role === "base" ? baseTotal : 100;
    return {
      ...ingredient,
      weightGrams: roundTo((ingredient.percentage / percentageBasis) * targetDryWeightGrams, 2),
    };
  });
}

export function normalizeRecipeFingerprint(
  ingredients: Pick<RecipeIngredient, "materialName" | "percentage" | "role">[],
): string {
  return ingredients
    .map((ingredient) => ({
      name: ingredient.materialName.trim().toLowerCase().replace(/\s+/g, " "),
      percentage: roundTo(ingredient.percentage, 2),
      role: ingredient.role,
    }))
    .sort((a, b) => `${a.role}:${a.name}`.localeCompare(`${b.role}:${b.name}`))
    .map((ingredient) => `${ingredient.role}:${ingredient.name}:${ingredient.percentage}`)
    .join("|");
}

export function recipesLikelyDuplicate(
  first: Pick<RecipeIngredient, "materialName" | "percentage" | "role">[],
  second: Pick<RecipeIngredient, "materialName" | "percentage" | "role">[],
): boolean {
  return normalizeRecipeFingerprint(first) === normalizeRecipeFingerprint(second);
}

function roundTo(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

