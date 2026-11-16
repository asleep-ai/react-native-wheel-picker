// Copyright 2026 Asleep, Inc. Licensed under Apache-2.0.
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  FlatList,
  PixelRatio,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type StyleProp,
  type TextStyle,
  type NativeSyntheticEvent,
} from "react-native";
import { centerRow, repeat, indexAtOffset, step } from "./wheelMath";
import { alignRowHeight } from "./pixel";

export interface WheelPickerHandle {
  /** Stops motion and returns the visible index; null when at rest. The caller must commit the returned index. */
  freeze(): number | null;
}

export interface WheelPickerProps {
  items: readonly string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onStep?: (delta: 1 | -1) => void;
  cyclic?: boolean;
  enabled?: boolean;
  accessibilityLabel: string;
  accessibilityValueText?: (label: string, index: number) => string;
  width: number;
  height: number;
  rowHeight: number;
  textStyle?: StyleProp<TextStyle>;
  unselectedOpacity?: number;
  unselectedScale?: number;
  allowFontScaling?: boolean;
  testID?: string;
}

const VELOCITY_AT_REST = 0.01;
const REPEATS = 100;

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

/** What the user is doing with the column; programmatic scrolls are never motion. */
type Motion = { kind: "idle" } | { kind: "moving" } | { kind: "frozen"; index: number };
const IDLE: Motion = { kind: "idle" };

/**
 * Cyclic wheels repeat 100 times from the center cycle; other wheels stay bounded.
 * Padding lets each row reach the selection band. For assistive technology the column is a single adjustable element whose rows are hidden.
 */
export const WheelPicker = forwardRef<WheelPickerHandle, WheelPickerProps>(function WheelPicker(props, ref) {
  const {
    testID,
    items: labels,
    selectedIndex: index,
    onSelect: onUserSelect,
    onStep,
    enabled: isEnabled = true,
    accessibilityLabel,
    accessibilityValueText = spokenValue,
    cyclic = false,
    width,
    textStyle,
    unselectedOpacity = 0.3,
    unselectedScale = 0.8,
    allowFontScaling = false,
  } = props;
  const rowHeight = alignRowHeight(props.rowHeight);
  const height = PixelRatio.roundToNearestPixel(props.height);
  const pendingIndex = useRef(index);
  const controlledIndex = useRef(index);
  if (controlledIndex.current !== index) {
    controlledIndex.current = index;
    pendingIndex.current = index;
  }
  const onUserStep = (delta: 1 | -1) => {
    if (onStep) onStep(delta);
    else {
      const next = step(pendingIndex.current, delta, labels.length, cyclic);
      if (next === pendingIndex.current) return;
      pendingIndex.current = next;
      onUserSelect(next);
    }
  };
  const scrollRef = useRef<FlatList<string> | null>(null);
  const repeats = cyclic ? REPEATS : 1;
  const data = useMemo(() => repeat(labels, repeats), [labels, repeats]);
  const initialRow = useRef(centerRow(labels.length, index, repeats));
  // The row under the selection band right now, also mid-fling.
  const liveIndexRef = useRef(initialRow.current);
  const motionRef = useRef<Motion>(IDLE);
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const shown = liveValue ?? index;
  const padding = PixelRatio.roundToNearestPixel((height - rowHeight) / 2);
  // contentOffset positions the selection; the initial window must also include rows visible above it.
  const rowsAbove = Math.ceil(padding / rowHeight);
  const renderItem = useCallback(
    ({ item, index: row }: { item: string; index: number }) => (
      <WheelRow
        label={item}
        isSelected={row % labels.length === shown}
        rowHeight={rowHeight}
        textStyle={textStyle}
        unselectedOpacity={unselectedOpacity}
        unselectedScale={unselectedScale}
        allowFontScaling={allowFontScaling}
      />
    ),
    [shown, labels.length, rowHeight, textStyle, unselectedOpacity, unselectedScale, allowFontScaling],
  );
  const getItemLayout = useCallback(
    (_: unknown, row: number) => ({
      length: rowHeight,
      offset: rowHeight * row,
      index: row,
    }),
    [rowHeight],
  );

  useEffect(() => {
    // Keep the current cycle for user settlements; external and accessibility changes move to the center.
    const row =
      liveIndexRef.current % labels.length === index ? liveIndexRef.current : centerRow(labels.length, index, repeats);
    if (motionRef.current.kind !== "idle") motionRef.current = { kind: "frozen", index: row };
    liveIndexRef.current = row;
    setLiveValue(null);
    scrollRef.current?.scrollToOffset({ offset: row * rowHeight, animated: false });
  }, [index, rowHeight, labels.length, repeats]);

  useImperativeHandle(ref, () => ({
    freeze() {
      if (motionRef.current.kind !== "moving") return null;
      const frozen = liveIndexRef.current;
      setLiveValue(null);
      motionRef.current = { kind: "frozen", index: frozen };
      scrollRef.current?.scrollToOffset({ offset: frozen * rowHeight, animated: false });
      return frozen % labels.length;
    },
  }));

  const settle = (event: ScrollEvent) => {
    setLiveValue(null);
    const motion = motionRef.current;
    if (motion.kind === "frozen") {
      liveIndexRef.current = motion.index;
      scrollRef.current?.scrollToOffset({ offset: motion.index * rowHeight, animated: false });
      return;
    }
    motionRef.current = IDLE;
    const settled = indexAtOffset(event.nativeEvent.contentOffset.y, rowHeight, data.length);
    liveIndexRef.current = settled;
    const value = settled % labels.length;
    pendingIndex.current = value;
    if (value !== index) onUserSelect(value);
  };

  const onScrollEndDrag = (event: ScrollEvent) => {
    // A drag released with speed continues as momentum, which settles it.
    const velocity = event.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocity) > VELOCITY_AT_REST) return;
    settle(event);
  };

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (!isEnabled) return;
    // A step during a drag or fling wins: stop the motion now, so neither a tap's freeze nor a late fling end
    // reports the dragged row over the stepped value (the index effect then moves the frozen row to it).
    if (motionRef.current.kind === "moving") {
      setLiveValue(null);
      motionRef.current = { kind: "frozen", index: liveIndexRef.current };
      scrollRef.current?.scrollToOffset({ offset: liveIndexRef.current * rowHeight, animated: false });
    }
    onUserStep(event.nativeEvent.actionName === "increment" ? 1 : -1);
  };

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValueText(labels[index], index) }}
      accessibilityState={{ disabled: !isEnabled }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibilityAction}
      style={{ width: width, height: height }}
    >
      <FlatList
        ref={scrollRef}
        testID={testID ? `${testID}-scroll` : undefined}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        scrollEnabled={isEnabled}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={rowHeight}
        decelerationRate="fast"
        initialScrollIndex={Math.max(0, initialRow.current - rowsAbove)}
        // Keep the initial render window without a deferred scroll overriding a pre-layout host resync.
        contentOffset={{ x: 0, y: initialRow.current * rowHeight }}
        data={data}
        extraData={shown}
        initialNumToRender={9}
        windowSize={5}
        getItemLayout={getItemLayout}
        keyExtractor={(_, row) => String(row)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: padding }}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          motionRef.current = { kind: "moving" };
        }}
        onScroll={(event) => {
          if (motionRef.current.kind !== "moving") return;
          const row = indexAtOffset(event.nativeEvent.contentOffset.y, rowHeight, data.length);
          if (row % labels.length !== liveIndexRef.current % labels.length) setLiveValue(row % labels.length);
          liveIndexRef.current = row;
        }}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={settle}
        onLayout={() =>
          scrollRef.current?.scrollToOffset({ offset: liveIndexRef.current * rowHeight, animated: false })
        }
      />
    </View>
  );
});

interface WheelRowProps {
  label: string;
  isSelected: boolean;
  rowHeight: number;
  textStyle?: StyleProp<TextStyle>;
  unselectedOpacity: number;
  unselectedScale: number;
  allowFontScaling: boolean;
}

const WheelRow = memo(function WheelRow({
  label,
  isSelected,
  rowHeight,
  textStyle,
  unselectedOpacity,
  unselectedScale,
  allowFontScaling,
}: WheelRowProps) {
  return (
    <View style={{ height: rowHeight, justifyContent: "center", alignItems: "center" }}>
      <Text
        allowFontScaling={allowFontScaling}
        numberOfLines={1}
        style={[
          textStyle,
          {
            opacity: isSelected ? 1 : unselectedOpacity,
            transform: [{ scale: isSelected ? 1 : unselectedScale }],
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
});

/** "07" is read as "7". */
function spokenValue(label: string | undefined): string {
  if (label === undefined) return "";
  return /^\d+$/.test(label) ? String(Number(label)) : label;
}
