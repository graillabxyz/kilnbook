import type { TemperatureUnit, WeightUnit, WindSpeedUnit } from "./domain";

export function celsiusToFahrenheit(valueC: number): number {
  return valueC * (9 / 5) + 32;
}

export function fahrenheitToCelsius(valueF: number): number {
  return (valueF - 32) * (5 / 9);
}

export function gramsToOunces(valueG: number): number {
  return valueG / 28.349523125;
}

export function ouncesToGrams(valueOz: number): number {
  return valueOz * 28.349523125;
}

export function kilogramsToPounds(valueKg: number): number {
  return valueKg * 2.2046226218;
}

export function poundsToKilograms(valueLb: number): number {
  return valueLb / 2.2046226218;
}

export function kphToMph(valueKph: number): number {
  return valueKph / 1.609344;
}

export function mphToKph(valueMph: number): number {
  return valueMph * 1.609344;
}

export function kphToMetersPerSecond(valueKph: number): number {
  return valueKph / 3.6;
}

export function metersPerSecondToKph(valueMps: number): number {
  return valueMps * 3.6;
}

export function kphToKnots(valueKph: number): number {
  return valueKph / 1.852;
}

export function knotsToKph(valueKnots: number): number {
  return valueKnots * 1.852;
}

export function convertTemperature(
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit,
): number {
  if (from === to) return value;
  return from === "c" ? celsiusToFahrenheit(value) : fahrenheitToCelsius(value);
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  const grams = from === "g" ? value : from === "kg" ? value * 1000 : from === "oz" ? ouncesToGrams(value) : poundsToKilograms(value) * 1000;
  if (to === "g") return grams;
  if (to === "kg") return grams / 1000;
  if (to === "oz") return gramsToOunces(grams);
  return kilogramsToPounds(grams / 1000);
}

export function convertWindSpeed(
  value: number,
  from: WindSpeedUnit,
  to: WindSpeedUnit,
): number {
  if (from === to) return value;
  const kph =
    from === "kph"
      ? value
      : from === "mph"
        ? mphToKph(value)
        : from === "mps"
          ? metersPerSecondToKph(value)
          : knotsToKph(value);

  if (to === "kph") return kph;
  if (to === "mph") return kphToMph(kph);
  if (to === "mps") return kphToMetersPerSecond(kph);
  return kphToKnots(kph);
}

export function formatTemperature(valueC: number, unit: TemperatureUnit): string {
  const value = convertTemperature(valueC, "c", unit);
  return `${Math.round(value).toLocaleString()}${unit === "c" ? "C" : "F"}`;
}

