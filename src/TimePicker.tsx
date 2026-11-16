// Copyright 2026 Asleep, Inc. Licensed under Apache-2.0.
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";
import { WheelPicker, type WheelPickerHandle } from "./WheelPicker";
import { fromColumns, toColumns, HOUR_LABELS, MINUTE_LABELS, type Columns, type Time24 } from "./timeMath";
import { step } from "./wheelMath";

interface ColumnStyle {
  width: number;
  height: number;
  rowHeight: number;
  textStyle?: StyleProp<TextStyle>;
}

export interface TimePickerProps {
  value: Time24;
  onChange: (time: Time24) => void;
  periodLabels?: readonly [string, string];
  accessibilityLabels?: { period: string; hour: string; minute: string };
  separator?: string;
  enabled?: boolean;
  columns?: { period: ColumnStyle; number: ColumnStyle };
  testID?: string;
}

export interface TimePickerHandle {
  /** Stops all moving columns and returns the visible time. Commit the snapshot to value to retain it. */
  freeze(): Time24;
}

const DEFAULT_PERIOD_LABELS = ["AM", "PM"] as const;
const DEFAULT_ACCESSIBILITY_LABELS = { period: "AM/PM", hour: "Hour", minute: "Minute" };
const DEFAULT_COLUMNS: { period: ColumnStyle; number: ColumnStyle } = {
  period: { width: 60, height: 216, rowHeight: 80 },
  number: { width: 90, height: 216, rowHeight: 80 },
};

/** A controlled 12-hour picker. Hour/minute wrap independently; crossing a boundary never changes AM/PM. */
export const TimePicker = forwardRef<TimePickerHandle, TimePickerProps>(function TimePicker(
  {
    value,
    onChange,
    periodLabels = DEFAULT_PERIOD_LABELS,
    accessibilityLabels = DEFAULT_ACCESSIBILITY_LABELS,
    separator = ":",
    enabled = true,
    columns = DEFAULT_COLUMNS,
    testID,
  },
  ref,
) {
  const latest = useRef(value);
  const previous = useRef(value);
  if (previous.current.hour !== value.hour || previous.current.minute !== value.minute) {
    latest.current = value;
    previous.current = value;
  }
  const selected = toColumns(value);
  const period = useRef<WheelPickerHandle>(null);
  const hour = useRef<WheelPickerHandle>(null);
  const minute = useRef<WheelPickerHandle>(null);
  const metrics = useMemo(() => ({ period: columns.period, number: columns.number }), [columns.period, columns.number]);
  const apply = (update: (current: Columns) => Partial<Columns>) => {
    const current = toColumns(latest.current);
    const next = fromColumns({ ...current, ...update(current) });
    if (next.hour === latest.current.hour && next.minute === latest.current.minute) return;
    latest.current = next;
    onChange(next);
  };
  useImperativeHandle(ref, () => ({
    freeze() {
      const p = period.current?.freeze();
      const h = hour.current?.freeze();
      const m = minute.current?.freeze();
      const current = toColumns(latest.current);
      const snapshot = fromColumns({
        ...current,
        ...(p == null ? {} : { period: p === 1 ? (1 as const) : (0 as const) }),
        ...(h == null ? {} : { hourIndex: h }),
        ...(m == null ? {} : { minute: m }),
      });
      latest.current = snapshot;
      return snapshot;
    },
  }));
  const id = (kind: string) => (testID ? `${testID}-${kind}` : undefined);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <WheelPicker
        ref={period}
        testID={id("period")}
        items={periodLabels}
        selectedIndex={selected.period}
        onSelect={(index) => apply(() => ({ period: index === 1 ? 1 : 0 }))}
        onStep={(delta) => apply((c) => ({ period: step(c.period, delta, 2, false) === 1 ? 1 : 0 }))}
        enabled={enabled}
        accessibilityLabel={accessibilityLabels.period}
        {...metrics.period}
      />
      <WheelPicker
        ref={hour}
        testID={id("hour")}
        items={HOUR_LABELS}
        cyclic
        selectedIndex={selected.hourIndex}
        onSelect={(hourIndex) => apply(() => ({ hourIndex }))}
        onStep={(delta) => apply((c) => ({ hourIndex: step(c.hourIndex, delta, 12, true) }))}
        enabled={enabled}
        accessibilityLabel={accessibilityLabels.hour}
        {...metrics.number}
      />
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text allowFontScaling={false} style={metrics.number.textStyle}>
          {separator}
        </Text>
      </View>
      <WheelPicker
        ref={minute}
        testID={id("minute")}
        items={MINUTE_LABELS}
        cyclic
        selectedIndex={selected.minute}
        onSelect={(minute) => apply(() => ({ minute }))}
        onStep={(delta) => apply((c) => ({ minute: step(c.minute, delta, 60, true) }))}
        enabled={enabled}
        accessibilityLabel={accessibilityLabels.minute}
        {...metrics.number}
      />
    </View>
  );
});
