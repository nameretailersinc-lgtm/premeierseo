/*
 * Annual percentage yield. Rates are decimals here (0.05 = 5%); the widget converts.
 * `n` is compounding periods per year; Infinity means continuous compounding.
 */

/** APY = (1 + r/n)^n − 1, or e^r − 1 when compounding is continuous. */
export function apyFromRate(rate: number, n: number): number {
  return Number.isFinite(n) ? Math.expm1(n * Math.log1p(rate / n)) : Math.expm1(rate);
}

/** The nominal annual rate that produces `apy` at the same compounding frequency. */
export function rateFromApy(apy: number, n: number): number {
  return Number.isFinite(n) ? n * Math.expm1(Math.log1p(apy) / n) : Math.log1p(apy);
}

/** US Regulation DD, Appendix A: APY = (1 + interest/principal)^(365/days) − 1. */
export function apyFromInterest(principal: number, interest: number, days: number): number {
  return principal > 0 && days > 0 ? Math.expm1((365 / days) * Math.log1p(interest / principal)) : NaN;
}

/** Balance after `months` at a constant APY, with no further deposits, fees or tax. */
export const balanceAfter = (principal: number, apy: number, months: number) => principal * Math.pow(1 + apy, months / 12);
