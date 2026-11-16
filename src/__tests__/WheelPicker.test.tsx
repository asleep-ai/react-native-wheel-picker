import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { FlatList, VirtualizedList, Text, PixelRatio } from "react-native";
import { HOUR_LABELS, MINUTE_LABELS } from "../timeMath";
import { alignRowHeight } from "../pixel";
import { WheelPicker, type WheelPickerHandle } from "../WheelPicker";

const labels = ["AM", "PM"];
const metrics = { width: 100, height: 240, rowHeight: 48, fontSize: 20, fontFamily: "System" };
const event = (row: number, rowHeight = metrics.rowHeight) => ({
  nativeEvent: {
    contentOffset: { x: 0, y: row * rowHeight },
    contentSize: { width: 100, height: 9600 },
    layoutMeasurement: { width: 100, height: 240 },
    velocity: { y: 0 },
  },
});
const list = () => screen.getByTestId("wheel-scroll", { includeHiddenElements: true });
const highlighted = (label: string) =>
  expect(screen.getByText(label, { includeHiddenElements: true })).toHaveStyle({
    opacity: 1,
    transform: [{ scale: 1 }],
  });

it("highlights during dragging without committing a parent value, and freezes against queued motion", async () => {
  const ref = createRef<WheelPickerHandle>();
  const select = jest.fn();
  const view = await render(
    <WheelPicker
      ref={ref}
      testID="wheel"
      items={labels}
      selectedIndex={0}
      onSelect={select}
      onStep={jest.fn()}
      enabled
      accessibilityLabel="Period"
      {...metrics}
    />,
  );
  await fireEvent(list(), "scrollBeginDrag", event(0));
  await fireEvent(list(), "scroll", event(1));
  highlighted("PM");
  expect(select).not.toHaveBeenCalled();
  await act(async () => {
    expect(ref.current?.freeze()).toBe(1);
  });
  await view.rerender(
    <WheelPicker
      ref={ref}
      testID="wheel"
      items={labels}
      selectedIndex={1}
      onSelect={select}
      onStep={jest.fn()}
      enabled
      accessibilityLabel="Period"
      {...metrics}
    />,
  );
  await fireEvent(list(), "scroll", event(0));
  await fireEvent(list(), "momentumScrollEnd", event(0));
  highlighted("PM");
  expect(select).not.toHaveBeenCalled();
});

it.each(["host", "accessibility"])("lets %s resync win visually over queued motion", async (source) => {
  const select = jest.fn();
  const step = jest.fn();
  const props = {
    testID: "wheel",
    items: labels,
    selectedIndex: 0,
    onSelect: select,
    onStep: step,
    enabled: true,
    accessibilityLabel: "Period",
    ...metrics,
  };
  const view = await render(<WheelPicker {...props} />);
  await fireEvent(list(), "scrollBeginDrag", event(0));
  await fireEvent(list(), "scroll", event(1));
  highlighted("PM");
  if (source === "accessibility") {
    await fireEvent(screen.getByTestId("wheel"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(step).toHaveBeenCalledWith(1);
  }
  // Move to a different host value, including when a11y interrupts the drag.
  await view.rerender(<WheelPicker {...props} selectedIndex={1} />);
  await view.rerender(<WheelPicker {...props} selectedIndex={0} />);
  highlighted("AM");
  await fireEvent(list(), "scroll", event(1));
  await fireEvent(list(), "momentumScrollEnd", event(1));
  highlighted("AM");
  expect(select).not.toHaveBeenCalled();
});

it("does not accept disabled drag or accessibility callbacks", async () => {
  const select = jest.fn();
  const step = jest.fn();
  await render(
    <WheelPicker
      testID="wheel"
      items={labels}
      selectedIndex={0}
      onSelect={select}
      onStep={step}
      enabled={false}
      accessibilityLabel="Period"
      {...metrics}
    />,
  );
  expect(list().props.scrollEnabled).toBe(false);
  await fireEvent(list(), "scroll", event(1));
  await fireEvent(screen.getByTestId("wheel"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  highlighted("AM");
  expect(select).not.toHaveBeenCalled();
  expect(step).not.toHaveBeenCalled();
});

it("aligns scaled cyclic layout and snap intervals to physical pixels at fractional density", async () => {
  const density = jest.spyOn(PixelRatio, "get").mockReturnValue(2.625);
  try {
    const scaled = { ...metrics, rowHeight: alignRowHeight(80 * 1.17) };
    await render(
      <WheelPicker
        testID="wheel"
        items={labels}
        cyclic
        selectedIndex={0}
        onSelect={jest.fn()}
        onStep={jest.fn()}
        enabled
        accessibilityLabel="Period"
        {...scaled}
      />,
    );
    const interval = list().props.snapToInterval;
    expect(interval * PixelRatio.get()).toBeCloseTo(Math.round(interval * PixelRatio.get()), 8);
    const layout = list().props.getItemLayout(null, 100);
    expect(layout.offset).toBe(interval * 100);
    expect(layout.offset * PixelRatio.get()).toBeCloseTo(Math.round(layout.offset * PixelRatio.get()), 8);
    expect(list().props.contentOffset.y).toBe(layout.offset);
  } finally {
    density.mockRestore();
  }
});

it.each([
  ["minute 00 shows 59", MINUTE_LABELS, 0, "59", true],
  ["hour 01 shows 12", HOUR_LABELS, 0, "12", true],
  ["PM shows AM", ["AM", "PM"], 1, "AM", false],
] as const)("renders the predecessor before any scroll: %s", async (_, rowLabels, index, above, cyclic) => {
  const iosMetrics = { width: 90, rowHeight: 80, height: 216, fontSize: 50, fontFamily: "System" };
  const select = jest.fn();
  const step = jest.fn();
  await render(
    <WheelPicker
      testID="wheel"
      items={rowLabels}
      cyclic={cyclic}
      selectedIndex={index}
      onSelect={select}
      onStep={step}
      enabled
      accessibilityLabel="Wheel"
      {...iosMetrics}
    />,
  );
  const selectedRow = (cyclic ? rowLabels.length * 50 : 0) + index;
  expect(list().props.contentOffset.y).toBe(selectedRow * iosMetrics.rowHeight);
  await fireEvent(list(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 90, height: 216 } } });
  await fireEvent(list(), "contentSizeChange", 90, rowLabels.length * (cyclic ? 100 : 1) * 80 + 136);
  // Real VirtualizedList, with layout complete but no mount-time scroll event.
  expect(screen.getByText(above, { includeHiddenElements: true })).toHaveStyle({ opacity: 0.3 });
  highlighted(rowLabels[index]);
  expect(select).not.toHaveBeenCalled();
  expect(step).not.toHaveBeenCalled();
});

it.each([
  [MINUTE_LABELS, 59, 60, 0],
  [MINUTE_LABELS, 0, -1, 59],
  [HOUR_LABELS, 11, 12, 0],
  [HOUR_LABELS, 0, -1, 11],
])("settles cyclic movement in both directions", async (items, initial, target, expected) => {
  const select = jest.fn();
  const view = await render(
    <WheelPicker
      testID="wheel"
      items={items}
      cyclic
      selectedIndex={initial}
      onSelect={select}
      accessibilityLabel="Value"
      {...metrics}
    />,
  );
  const offset = items.length * 50 + target;
  await fireEvent(list(), "scrollBeginDrag", event(items.length * 50 + initial));
  await fireEvent(list(), "scroll", event(offset));
  expect(select).not.toHaveBeenCalled();
  for (const row of screen.getAllByText(items[expected], { includeHiddenElements: true })) {
    expect(row).toHaveStyle({ opacity: 1, transform: [{ scale: 1 }] });
  }
  expect(screen.getByTestId("wheel").props.accessibilityValue.text).toBe(String(Number(items[initial])));
  await fireEvent(list(), "momentumScrollEnd", event(offset));
  expect(select).toHaveBeenCalledWith(expected);
  await view.rerender(
    <WheelPicker
      testID="wheel"
      items={items}
      cyclic
      selectedIndex={expected}
      onSelect={select}
      accessibilityLabel="Value"
      {...metrics}
    />,
  );
  await fireEvent(list(), "momentumScrollEnd", event(offset));
  expect(select).toHaveBeenCalledTimes(1);
});

it("keeps programmatic scrolling idle and AM/PM accessibility steps bounded", async () => {
  const select = jest.fn();
  const ref = createRef<WheelPickerHandle>();
  await render(
    <WheelPicker
      ref={ref}
      testID="wheel"
      items={labels}
      selectedIndex={0}
      onSelect={select}
      accessibilityLabel="Period"
      {...metrics}
    />,
  );
  await fireEvent(list(), "scroll", event(1));
  highlighted("AM");
  expect(ref.current?.freeze()).toBeNull();
  await fireEvent(screen.getByTestId("wheel"), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
  expect(select).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId("wheel"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(select).toHaveBeenLastCalledWith(1);
  await fireEvent(screen.getByTestId("wheel"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(select).toHaveBeenCalledTimes(1);
});

it.each([true, false])(
  "preserves a controlled pre-layout resync without deferred scrolling, layout first: %s",
  async (layoutFirst) => {
    const initialScroll = jest.spyOn(VirtualizedList.prototype, "scrollToIndex");
    const position = jest.spyOn(FlatList.prototype, "scrollToOffset");
    const props = {
      testID: "wheel",
      items: MINUTE_LABELS,
      cyclic: true,
      selectedIndex: 0,
      onSelect: jest.fn(),
      accessibilityLabel: "Minute",
      ...metrics,
    };
    try {
      const view = await render(<WheelPicker {...props} />);
      await view.rerender(<WheelPicker {...props} selectedIndex={45} />);
      initialScroll.mockClear();
      position.mockClear();
      const layout = () =>
        fireEvent(list(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 240 } } });
      const content = () => fireEvent(list(), "contentSizeChange", 100, 6000 * metrics.rowHeight);
      if (layoutFirst) {
        await layout();
        await content();
      } else {
        await content();
        await layout();
      }
      expect(initialScroll).not.toHaveBeenCalled();
      expect(position).toHaveBeenLastCalledWith({ offset: 3045 * metrics.rowHeight, animated: false });
      expect(props.onSelect).not.toHaveBeenCalled();
    } finally {
      initialScroll.mockRestore();
      position.mockRestore();
    }
  },
);

it("memoizes unchanged rows while the old and new highlighted rows render", async () => {
  // Observe the RN preset Text component renders without adding a production test hook.
  const textRender = jest.spyOn(Text.prototype, "render");
  try {
    await render(
      <WheelPicker
        testID="wheel"
        items={["Apple", "Banana", "Pear"]}
        selectedIndex={0}
        onSelect={jest.fn()}
        accessibilityLabel="Fruit"
        {...metrics}
      />,
    );
    await fireEvent(list(), "scrollBeginDrag", event(0));
    textRender.mockClear();
    await fireEvent(list(), "scroll", event(1));
    const renderedLabels = textRender.mock.contexts.map((instance) => instance.props.children);
    expect(renderedLabels).toEqual(expect.arrayContaining(["Apple", "Banana"]));
    expect(renderedLabels).not.toContain("Pear");
    textRender.mockClear();
    await fireEvent(list(), "scroll", event(1.1));
    expect(textRender).not.toHaveBeenCalled();
  } finally {
    textRender.mockRestore();
  }
});

it("compounds default accessibility steps before echo and resets the pending base on host resync", async () => {
  const select = jest.fn();
  const items = ["A", "B", "C", "D"];
  const props = { testID: "wheel", items, selectedIndex: 0, onSelect: select, accessibilityLabel: "Value", ...metrics };
  const view = await render(<WheelPicker {...props} />);
  const action = screen.getByTestId("wheel").props.onAccessibilityAction;
  await act(async () => {
    action({ nativeEvent: { actionName: "increment" } });
    action({ nativeEvent: { actionName: "increment" } });
  });
  expect(select.mock.calls).toEqual([[1], [2]]);
  expect(screen.getByTestId("wheel").props.accessibilityValue).toEqual({ text: "A" });
  await view.rerender(<WheelPicker {...props} selectedIndex={3} />);
  await fireEvent(screen.getByTestId("wheel"), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
  expect(select.mock.calls).toEqual([[1], [2], [2]]);
  expect(screen.getByTestId("wheel").props.accessibilityValue).toEqual({ text: "D" });
});

it("keeps custom accessibility step ownership without default commits", async () => {
  const select = jest.fn();
  const customStep = jest.fn();
  await render(
    <WheelPicker
      testID="wheel"
      items={labels}
      selectedIndex={0}
      onSelect={select}
      onStep={customStep}
      accessibilityLabel="Period"
      {...metrics}
    />,
  );
  const action = screen.getByTestId("wheel").props.onAccessibilityAction;
  await act(async () => {
    action({ nativeEvent: { actionName: "increment" } });
    action({ nativeEvent: { actionName: "increment" } });
  });
  expect(customStep.mock.calls).toEqual([[1], [1]]);
  expect(select).not.toHaveBeenCalled();
});
