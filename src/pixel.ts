// Copyright 2026 Asleep, Inc. Licensed under Apache-2.0.
import { PixelRatio } from "react-native";

/** Android converts the dp interval to Float32 pixels, then truncates. Pick the nearest safe pixel count. */
export function alignRowHeight(height: number, density = PixelRatio.get()): number {
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(density) || density <= 0) {
    throw new RangeError("Height and density must be positive finite numbers");
  }
  const nativeDensity = Math.fround(density);
  const rounded = Math.max(1, Math.round(height * density)) / density;
  if (
    !Number.isFinite(nativeDensity) ||
    nativeDensity <= 0 ||
    !Number.isFinite(Math.fround(rounded)) ||
    rounded * density > 2147483647
  ) {
    throw new RangeError("Height and density must fit native Float32 and integer pixel geometry");
  }
  const pixels = Math.round(rounded * density);
  const survives = (count: number) =>
    Math.trunc(Math.fround(Math.fround(count / density) * Math.fround(density))) === count;
  if (survives(pixels)) return rounded;
  for (let distance = 1; ; distance++) {
    const lower = pixels - distance;
    const upper = pixels + distance;
    const candidates =
      Math.abs(lower / density - height) <= Math.abs(upper / density - height) ? [lower, upper] : [upper, lower];
    for (const count of candidates) if (count > 0 && survives(count)) return count / density;
  }
}
