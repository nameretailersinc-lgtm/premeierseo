/*
 * File-size units. Decimal (SI) prefixes: 1 kB = 1000 B, 1 MB = 1000 kB.
 * Binary (IEC 80000-13) prefixes: 1 KiB = 1024 B, 1 MiB = 1024 KiB.
 * Windows labels binary sizes "KB/MB/GB"; macOS (since 10.6) uses decimal.
 */

export type SizeUnit = "B" | "KB" | "MB" | "GB" | "TB" | "KiB" | "MiB" | "GiB" | "TiB";

export const UNIT_BYTES: Record<SizeUnit, number> = {
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
};

/**
 * Convert `value` of `from` to bytes. `convention` decides what the ambiguous labels
 * KB/MB/GB/TB mean: "decimal" (×1000) or "binary" (×1024, the Windows/JEDEC usage).
 */
export function toBytes(value: number, from: SizeUnit, convention: "decimal" | "binary" = "decimal"): number {
  if (convention === "binary" && ["KB", "MB", "GB", "TB"].includes(from)) {
    const pow = ["KB", "MB", "GB", "TB"].indexOf(from) + 1;
    return value * 1024 ** pow;
  }
  return value * UNIT_BYTES[from];
}

export function fromBytes(bytes: number, to: SizeUnit, convention: "decimal" | "binary" = "decimal"): number {
  return bytes / toBytes(1, to, convention);
}

/** All conversions for one input, in both conventions. */
export function convertAll(value: number, from: SizeUnit, convention: "decimal" | "binary") {
  const bytes = toBytes(value, from, convention);
  return {
    bytes,
    decimal: { KB: bytes / 1e3, MB: bytes / 1e6, GB: bytes / 1e9, TB: bytes / 1e12 },
    binary: { KiB: bytes / 1024, MiB: bytes / 1024 ** 2, GiB: bytes / 1024 ** 3, TiB: bytes / 1024 ** 4 },
  };
}
