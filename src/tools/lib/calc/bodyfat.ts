/*
 * U.S. Navy circumference method (Hodgdon & Beckett, 1984). The equations estimate body density
 * from girths and height in centimeters; the Siri equation (495 / density − 450) converts density
 * to percent fat. Published standard errors of estimate: 3.52 (men) and 3.72 (women).
 *
 * Measurement sites differ by sex: men's waist is taken at the navel, women's at the narrowest point.
 */

export type Sex = "male" | "female";

export interface Girths {
  sex: Sex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  /** Women only. */
  hipCm?: number;
}

export interface BodyFatResult {
  percent: number;
  density: number;
  /** waist − neck (men) or waist + hip − neck (women), in cm. */
  girth: number;
}

/** Returns null when the inputs cannot produce a physically sensible estimate. */
export function navyBodyFat(g: Girths): BodyFatResult | null {
  const girth = g.sex === "male" ? g.waistCm - g.neckCm : g.waistCm + (g.hipCm ?? NaN) - g.neckCm;
  if (!(girth > 0) || !(g.heightCm > 0)) return null;
  const density =
    g.sex === "male"
      ? 1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(g.heightCm)
      : 1.29579 - 0.35004 * Math.log10(girth) + 0.221 * Math.log10(g.heightCm);
  const percent = 495 / density - 450;
  // Outside this window the equation is extrapolating far past any measured population.
  return Number.isFinite(percent) && percent >= 2 && percent <= 70 ? { percent, density, girth } : null;
}
