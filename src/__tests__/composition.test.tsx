import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { FlatList, ScrollView } from "react-native";
import { WheelPicker, type WheelPickerHandle } from "../WheelPicker";
import { TimePicker } from "../TimePicker";
import { MINUTE_LABELS } from "../timeMath";
import { alignRowHeight } from "../pixel";

// Exercise the real public ScrollView wrapper and its orientation context, not the preset's host-only mock.
jest.unmock("react-native/Libraries/Components/ScrollView/ScrollView");

const nestedMessage = "VirtualizedLists should never be nested";
const metrics = { width: 90, height: 216, rowHeight: 80 };
const rowHeight = alignRowHeight(metrics.rowHeight);
let errors: jest.SpyInstance;
let position: jest.SpyInstance;
beforeEach(() => {
  // Keep the real context/layout wrapper, but do not dispatch native imperative commands in the test renderer.
  position = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
  const original = console.error;
  errors = jest.spyOn(console, "error").mockImplementation((...args) => {
    if (!String(args[0]).includes(nestedMessage)) original(...args);
  });
});
afterEach(() => {
  errors.mockRestore();
  position.mockRestore();
});
const nestedErrors = () => errors.mock.calls.filter(([message]) => String(message).includes(nestedMessage));

it("keeps a fixed wheel independent inside a real vertical ScrollView without the generic nested-list diagnostic", async () => {
  const select = jest.fn();
  const ref = createRef<WheelPickerHandle>();
  const tree = (index: number) => (
    <ScrollView style={{ height: 600 }}>
      <WheelPicker
        ref={ref}
        testID="wheel"
        items={MINUTE_LABELS}
        cyclic
        selectedIndex={index}
        onSelect={select}
        accessibilityLabel="Minute"
        {...metrics}
      />
    </ScrollView>
  );
  const view = await render(tree(0));
  expect(nestedErrors()).toEqual([]);
  expect(screen.getByTestId("wheel")).toHaveStyle({ width: 90, height: 216 });
  const list = () => screen.getByTestId("wheel-scroll", { includeHiddenElements: true });
  const instance = list();
  expect(list().props.scrollEnabled).toBe(true);
  expect(list().props.nestedScrollEnabled).toBe(true);
  await fireEvent(list(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 90, height: 216 } } });
  await fireEvent(list(), "contentSizeChange", 90, 6000 * rowHeight + 136);
  expect(screen.getByText("59", { includeHiddenElements: true })).toHaveStyle({ opacity: 0.3 });
  expect(ref.current?.freeze()).toBeNull();
  await view.rerender(tree(1));
  expect(select).not.toHaveBeenCalled();
  expect(screen.getByTestId("wheel").props.accessibilityValue).toEqual({ text: "1" });
  expect(list()).toBe(instance);
  expect(nestedErrors()).toEqual([]);
});

it("composes all TimePicker columns inside a real vertical ScrollView", async () => {
  await render(
    <ScrollView style={{ height: 600 }}>
      <TimePicker value={{ hour: 7, minute: 0 }} onChange={jest.fn()} />
    </ScrollView>,
  );
  expect(screen.getAllByRole("adjustable")).toHaveLength(3);
  expect(nestedErrors()).toEqual([]);
});

it("retains the RN diagnostic for an ordinary unisolated FlatList", async () => {
  await render(
    <ScrollView style={{ height: 600 }}>
      <FlatList data={["A", "B"]} renderItem={() => null} />
    </ScrollView>,
  );
  expect(nestedErrors()).toHaveLength(1);
});
