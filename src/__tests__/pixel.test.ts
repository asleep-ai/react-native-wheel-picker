import { alignRowHeight } from "../pixel";

it.each([1, 1.5, 2, 2.625, 2.75, 3, 3.5, 4, 1.33125])("survives native Float32 truncation at density %s", (density) => {
  for (const scale of [0.55, 0.79, 1, 1.07, 1.17, 1.3, 1.45, 2]) {
    for (const base of [30, 48, 80]) {
      const dp = alignRowHeight(base * scale, density);
      const px = Math.round(dp * density);
      expect(dp * density).toBeCloseTo(px, 8);
      expect(Math.trunc(Math.fround(Math.fround(dp) * Math.fround(density)))).toBe(px);
      expect(Math.abs(dp * density - base * scale * density)).toBeLessThanOrEqual(1.5);
    }
  }
});

it.each([0, -1, NaN, Infinity])("rejects invalid height or density: %s", (value) => {
  expect(() => alignRowHeight(value, 2)).toThrow(RangeError);
  expect(() => alignRowHeight(80, value)).toThrow(RangeError);
});

it("keeps positive subpixel rows at least one physical pixel", () => {
  expect(alignRowHeight(0.1, 1)).toBe(1);
});
it("rejects geometry outside native Float32 and integer range", () => {
  expect(() => alignRowHeight(80, 1e-300)).toThrow(RangeError);
  expect(() => alignRowHeight(80, Number.MAX_VALUE)).toThrow(RangeError);
  expect(() => alignRowHeight(Number.MAX_VALUE, 2)).toThrow(RangeError);
});
