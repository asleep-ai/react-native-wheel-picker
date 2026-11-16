// Copyright 2026 Asleep, Inc. Licensed under Apache-2.0.
/** Index of the row centered at a scroll offset, clamped to the list. */
export function indexAtOffset(offset: number, rowHeight: number, count: number): number {
  if (!(rowHeight > 0) || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offset / rowHeight)));
}

/** One accessibility step; hours and minutes wrap like the endless native wheels did, AM/PM does not. */
export function step(index: number, delta: 1 | -1, count: number, wraps: boolean): number {
  const next = index + delta;
  if (wraps) return (next + count) % count;
  return Math.min(count - 1, Math.max(0, next));
}

/** The middle cycle leaves room to scroll in either direction. */
export const centerRow = (count: number, index: number, repeats: number) => Math.floor(repeats / 2) * count + index;

/** Construct the virtual data without depending on an application utility. */
export const repeat = (items: readonly string[], cycles: number): string[] =>
  Array.from({ length: items.length * cycles }, (_, row) => items[row % items.length]);
