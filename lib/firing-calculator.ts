import type { AtmosphereType, FiringLogPoint, FiringType, KilnLocation } from "./domain";

export interface RatePoint extends FiringLogPoint {
  rateCPerHour: number | null;
}

export interface FiringEstimateInput {
  kilnType: FiringType;
  fuelType: string;
  kilnVolumeLiters: number;
  powerKw?: number;
  kilnAgeYears: number;
  loadFullnessPercentage: number;
  wareDensity: "light" | "medium" | "dense";
  averageWallThicknessMm: number;
  targetTemperatureC: number;
  targetCone: string;
  atmosphere: AtmosphereType;
  plannedPreheatHours: number;
  holdMinutes: number;
  controlledCooling: boolean;
  startingAmbientC: number;
  kilnLocation: KilnLocation;
  humidityPercentage?: number;
  windSpeedKph?: number;
  comparableFirings: Array<{
    id: string;
    title: string;
    targetTemperatureC: number;
    loadFullnessPercentage: number;
    atmosphere: AtmosphereType;
    totalHeatingMinutes: number;
    totalCoolingMinutes: number;
  }>;
}

export interface FiringEstimate {
  heatingHoursRange: [number, number];
  coolingHoursRange: [number, number];
  totalHoursRange: [number, number];
  recommendedLoggingIntervalMinutes: 30 | 60;
  energyKwhRange?: [number, number];
  confidence: "low" | "medium" | "high";
  warnings: string[];
  comparableFiringIds: string[];
  explanation: string[];
}

export function calculateRateOfChange(points: FiringLogPoint[]): RatePoint[] {
  const ordered = [...points].sort((a, b) => a.elapsedMinutes - b.elapsedMinutes);
  return ordered.map((point, index) => {
    const previous = ordered[index - 1];
    if (!previous) {
      return { ...point, rateCPerHour: null };
    }
    const elapsedHours = (point.elapsedMinutes - previous.elapsedMinutes) / 60;
    if (elapsedHours <= 0) {
      return { ...point, rateCPerHour: null };
    }
    return {
      ...point,
      rateCPerHour: roundTo(
        (point.actualTemperatureC - previous.actualTemperatureC) / elapsedHours,
        1,
      ),
    };
  });
}

export function estimateFiringDuration(input: FiringEstimateInput): FiringEstimate {
  const comparable = input.comparableFirings
    .map((firing) => ({
      ...firing,
      score: comparableScore(input, firing),
    }))
    .filter((firing) => firing.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const targetRiseC = Math.max(input.targetTemperatureC - input.startingAmbientC, 300);
  const kilnFactor = kilnTypeFactor(input.kilnType);
  const loadFactor = 1 + input.loadFullnessPercentage / 180;
  const densityFactor =
    input.wareDensity === "light" ? 0.9 : input.wareDensity === "medium" ? 1 : 1.18;
  const wallFactor = 1 + Math.max(input.averageWallThicknessMm - 5, 0) * 0.035;
  const ageFactor = 1 + Math.min(input.kilnAgeYears, 25) * 0.006;
  const atmosphereFactor =
    input.atmosphere === "reduction" || input.atmosphere === "heavy_reduction" ? 1.08 : 1;
  const weatherFactor =
    input.kilnLocation === "indoors"
      ? 1
      : 1 + Math.min(Math.max((input.windSpeedKph ?? 0) / 100, 0), 0.2);

  const baseHeatingHours =
    (targetRiseC / (input.kilnType === "electric" ? 150 : 128)) *
      kilnFactor *
      loadFactor *
      densityFactor *
      wallFactor *
      ageFactor *
      atmosphereFactor *
      weatherFactor +
    input.plannedPreheatHours +
    input.holdMinutes / 60;

  const historicalHeatingHours =
    comparable.length > 0
      ? weightedAverage(comparable.map((firing) => [firing.totalHeatingMinutes / 60, firing.score]))
      : null;
  const blendedHeatingHours =
    historicalHeatingHours === null
      ? baseHeatingHours
      : baseHeatingHours * 0.58 + historicalHeatingHours * 0.42;

  const baseCoolingHours =
    (input.targetTemperatureC / 100) *
    (input.controlledCooling ? 1.35 : 1.05) *
    (input.loadFullnessPercentage > 75 ? 1.14 : 1) *
    (input.kilnType === "wood" || input.kilnType === "soda" ? 1.18 : 1);

  const historicalCoolingHours =
    comparable.length > 0
      ? weightedAverage(comparable.map((firing) => [firing.totalCoolingMinutes / 60, firing.score]))
      : null;
  const blendedCoolingHours =
    historicalCoolingHours === null
      ? baseCoolingHours
      : baseCoolingHours * 0.52 + historicalCoolingHours * 0.48;

  const warnings = estimateWarnings(input, blendedHeatingHours);
  const spread = comparable.length >= 3 ? 0.11 : comparable.length > 0 ? 0.16 : 0.23;
  const heatingRange = rangeAround(blendedHeatingHours, spread);
  const coolingRange = rangeAround(blendedCoolingHours, spread + 0.04);
  const totalRange: [number, number] = [
    roundTo(heatingRange[0] + coolingRange[0], 1),
    roundTo(heatingRange[1] + coolingRange[1], 1),
  ];

  return {
    heatingHoursRange: heatingRange,
    coolingHoursRange: coolingRange,
    totalHoursRange: totalRange,
    recommendedLoggingIntervalMinutes:
      input.targetTemperatureC >= 1180 || blendedHeatingHours < 8 ? 30 : 60,
    energyKwhRange:
      input.powerKw && input.kilnType === "electric"
        ? [
            roundTo(input.powerKw * heatingRange[0] * 0.55, 1),
            roundTo(input.powerKw * heatingRange[1] * 0.75, 1),
          ]
        : undefined,
    confidence: comparable.length >= 3 ? "high" : comparable.length > 0 ? "medium" : "low",
    warnings,
    comparableFiringIds: comparable.map((firing) => firing.id),
    explanation: [
      "Estimate combines kiln type, load fullness, wall thickness, target temperature, weather exposure, and prior comparable firings.",
      comparable.length
        ? `${comparable.length} comparable firing${comparable.length === 1 ? "" : "s"} influenced the range.`
        : "No close historical firing was found, so the range is intentionally wider.",
      "Ranges are advisory estimates and are not kiln-control or safety instructions.",
    ],
  };
}

function comparableScore(
  input: FiringEstimateInput,
  firing: FiringEstimateInput["comparableFirings"][number],
): number {
  const temperatureScore = 1 - Math.min(Math.abs(firing.targetTemperatureC - input.targetTemperatureC) / 280, 1);
  const loadScore = 1 - Math.min(Math.abs(firing.loadFullnessPercentage - input.loadFullnessPercentage) / 80, 1);
  const atmosphereScore = firing.atmosphere === input.atmosphere ? 1 : 0.35;
  return roundTo(temperatureScore * 0.45 + loadScore * 0.3 + atmosphereScore * 0.25, 3);
}

function kilnTypeFactor(type: FiringType): number {
  if (type === "electric") return 0.96;
  if (type === "gas") return 1.04;
  if (type === "wood") return 1.22;
  if (type === "soda" || type === "salt") return 1.12;
  return 1.08;
}

function estimateWarnings(input: FiringEstimateInput, heatingHours: number): string[] {
  const warnings: string[] = [];
  const averageRise = (input.targetTemperatureC - input.startingAmbientC) / Math.max(heatingHours - input.plannedPreheatHours, 1);
  if (input.averageWallThicknessMm >= 9 && input.plannedPreheatHours < 2) {
    warnings.push("Thicker ware with a short preheat may need a gentler drying stage.");
  }
  if (averageRise > 185) {
    warnings.push("Planned rise is aggressive for manual logging; verify against kiln and clay guidance.");
  }
  if (input.kilnLocation !== "indoors" && (input.windSpeedKph ?? 0) > 24) {
    warnings.push("Outdoor wind exposure may widen heating and cooling time ranges.");
  }
  if (input.humidityPercentage !== undefined && input.humidityPercentage > 80) {
    warnings.push("High humidity should be recorded for later comparison, especially during drying and cooling.");
  }
  return warnings;
}

function rangeAround(value: number, spread: number): [number, number] {
  return [roundTo(value * (1 - spread), 1), roundTo(value * (1 + spread), 1)];
}

function weightedAverage(values: Array<[number, number]>): number {
  const weight = values.reduce((total, [, itemWeight]) => total + itemWeight, 0);
  return values.reduce((total, [value, itemWeight]) => total + value * itemWeight, 0) / weight;
}

function roundTo(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

