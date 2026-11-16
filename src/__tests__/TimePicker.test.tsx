import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TimePicker, type TimePickerHandle } from "../TimePicker";
import { alignRowHeight } from "../pixel";
const rowHeight = alignRowHeight(80);
const event = (row: number) => ({
  nativeEvent: {
    contentOffset: { x: 0, y: row * rowHeight },
    velocity: { y: 0 },
    contentSize: { width: 90, height: 600000 },
    layoutMeasurement: { width: 90, height: 216 },
  },
});
const list = (kind: string) => screen.getByTestId(`time-${kind}-scroll`, { includeHiddenElements: true });

it("merges two column settles before the parent can rerender", async () => {
  const change = jest.fn();
  await render(<TimePicker testID="time" value={{ hour: 7, minute: 30 }} onChange={change} />);
  const hour = list("hour").props.onMomentumScrollEnd;
  const minute = list("minute").props.onMomentumScrollEnd;
  await act(async () => {
    hour(event(608));
    minute(event(3045));
  });
  expect(change.mock.calls).toEqual([[{ hour: 9, minute: 30 }], [{ hour: 9, minute: 45 }]]);
});

it("merges accessibility actions using the latest value and accepts host resync", async () => {
  const change = jest.fn();
  const view = await render(<TimePicker testID="time" value={{ hour: 7, minute: 30 }} onChange={change} />);
  const increment = screen.getByTestId("time-minute").props.onAccessibilityAction;
  await act(async () => {
    increment({ nativeEvent: { actionName: "increment" } });
    increment({ nativeEvent: { actionName: "increment" } });
  });
  expect(change).toHaveBeenLastCalledWith({ hour: 7, minute: 32 });
  await view.rerender(<TimePicker testID="time" value={{ hour: 22, minute: 10 }} onChange={change} />);
  await fireEvent(screen.getByTestId("time-minute"), "accessibilityAction", {
    nativeEvent: { actionName: "increment" },
  });
  expect(change).toHaveBeenLastCalledWith({ hour: 22, minute: 11 });
});

it("freezes the shown wrapped minute and ignores late movement without emitting change", async () => {
  const change = jest.fn();
  const ref = createRef<TimePickerHandle>();
  const view = await render(<TimePicker ref={ref} testID="time" value={{ hour: 7, minute: 59 }} onChange={change} />);
  await fireEvent(list("minute"), "scrollBeginDrag", event(3059));
  await fireEvent(list("minute"), "scroll", event(3060));
  await act(async () => {
    expect(ref.current?.freeze()).toEqual({ hour: 7, minute: 0 });
  });
  await view.rerender(<TimePicker ref={ref} testID="time" value={{ hour: 7, minute: 0 }} onChange={change} />);
  await fireEvent(list("minute"), "scroll", event(3070));
  await fireEvent(list("minute"), "momentumScrollEnd", event(3070));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByTestId("time-minute").props.accessibilityValue).toEqual({ text: "0" });
});
