/*
 * Adult body mass index (WHO). BMI = weight (kg) / height (m)².
 * Imperial inputs are converted exactly (1 lb = 0.45359237 kg, 1 in = 0.0254 m), which is the
 * same as the familiar 703 × lb / in² shortcut (703.07 to two decimals).
 */

export const LB_TO_KG = 0.45359237;
export const IN_TO_M = 0.0254;

export function bmi(weightKg: number, heightM: number): number {
  if (!(weightKg > 0) || !(heightM > 0)) return NaN;
  return weightKg / (heightM * heightM);
}

export interface BmiCategory {
  label: string;
  range: string;
  min: number;
  max: number;
}

/** WHO adult classification (ages 20+ per CDC; WHO applies it from 18/19). */
export const WHO_CATEGORIES: BmiCategory[] = [
  { label: "Underweight", range: "below 18.5", min: 0, max: 18.5 },
  { label: "Healthy weight", range: "18.5 to 24.9", min: 18.5, max: 25 },
  { label: "Overweight (pre-obesity)", range: "25.0 to 29.9", min: 25, max: 30 },
  { label: "Obesity class I", range: "30.0 to 34.9", min: 30, max: 35 },
  { label: "Obesity class II", range: "35.0 to 39.9", min: 35, max: 40 },
  { label: "Obesity class III", range: "40.0 and above", min: 40, max: Infinity },
];

/** WHO expert consultation (Lancet 2004) public-health action points for Asian populations. */
export const ASIAN_ACTION_POINTS: BmiCategory[] = [
  { label: "Underweight", range: "below 18.5", min: 0, max: 18.5 },
  { label: "Acceptable risk", range: "18.5 to 22.9", min: 18.5, max: 23 },
  { label: "Increased risk", range: "23.0 to 27.4", min: 23, max: 27.5 },
  { label: "High risk", range: "27.5 and above", min: 27.5, max: Infinity },
];

/** Category lookup on the value rounded to one decimal, as charts are printed. */
export function category(value: number, table: BmiCategory[] = WHO_CATEGORIES): BmiCategory | undefined {
  if (!Number.isFinite(value)) return undefined;
  const v = Math.round(value * 10) / 10;
  return table.find((c) => v >= c.min && v < c.max);
}

/** Weight range (kg) that gives a BMI of 18.5 to 24.9 at this height. */
export function healthyRangeKg(heightM: number): [number, number] {
  return [18.5 * heightM * heightM, 24.9 * heightM * heightM];
}

export function feetInchesToM(ft: number, inch: number): number {
  return (ft * 12 + inch) * IN_TO_M;
}
