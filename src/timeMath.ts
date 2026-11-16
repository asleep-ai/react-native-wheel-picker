// Copyright 2026 Asleep, Inc. Licensed under Apache-2.0.
/** Pure time math: 24-hour time <-> the 12-hour columns (AM/PM, 1-12, 0-59). */

export interface Time24 {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface Columns {
  period: 0 | 1; // 0 AM, 1 PM
  hourIndex: number; // 0-11 -> 1-12
  minute: number; // 0-59
}

export const HOUR_LABELS: readonly string[] = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
export const MINUTE_LABELS: readonly string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/** 00:xx is 12 AM, 12:xx is 12 PM. */
export function toColumns({ hour, minute }: Time24): Columns {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { period: hour >= 12 ? 1 : 0, hourIndex: hour12 - 1, minute };
}

export function fromColumns({ period, hourIndex, minute }: Columns): Time24 {
  const hour12 = hourIndex + 1;
  return { hour: (hour12 % 12) + (period === 1 ? 12 : 0), minute };
}
