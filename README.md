# React Native WheelPicker

Controlled, virtualized string wheels and a 12-hour time picker for React Native. Local release preparation for
`@asleep-ai/react-native-wheelpicker` 0.1.0; this repository and version have not been published.

## Install

After an authorized npm release:

```sh
pnpm add @asleep-ai/react-native-wheelpicker
```

React and React Native are peer dependencies. The package has no runtime dependencies and no native module.

```tsx
import { useState } from "react";
import { WheelPicker } from "@asleep-ai/react-native-wheelpicker";

function FruitPicker() {
  const [index, setIndex] = useState(0);
  return (
    <WheelPicker
      items={["Apple", "Banana", "Pear"]}
      selectedIndex={index}
      onSelect={setIndex}
      accessibilityLabel="Fruit"
      width={180}
      height={216}
      rowHeight={72}
      textStyle={{ fontSize: 24, color: "black" }}
    />
  );
}
```

## Features

- Optional cyclic columns repeat 100 times from the middle cycle; bounded columns stop at their ends.
- Selection highlights track logical rows during dragging without committing parent values on each scroll event.
- `onSelect` fires on settle, or for a default accessibility step. Echo the value into `selectedIndex`.
- `freeze()` stops moving columns and returns the visible selection. Commit that snapshot to the controlled value
  in the same event handler. It returns `null` when the wheel is at rest.
- Initial render windows include the partial rows above the selected row, without deferred initial scrolling.
- Styles belong to the caller: no bundled fonts or default text color.

## WheelPicker parameters

| Prop                                   | Type / default                      | Purpose                                                                               |
| -------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| `items`                                | `readonly string[]`                 | Nonempty labels.                                                                      |
| `selectedIndex`                        | `number`                            | Valid integer index, controlled by the caller.                                        |
| `onSelect`                             | `(index: number) => void`           | Settled selection and default accessibility steps.                                    |
| `onStep`                               | optional `(delta: 1 \| -1) => void` | Override accessibility steps to merge against your latest state.                      |
| `cyclic`                               | `false`                             | Repeat 100 cycles; otherwise bounded.                                                 |
| `enabled`                              | `true`                              | Disable dragging and accessibility actions. An already moving wheel can still settle. |
| `width`, `height`, `rowHeight`         | positive dp numbers                 | Caller supplies geometry.                                                             |
| `textStyle`                            | optional RN text style              | Caller supplies typography and color.                                                 |
| `unselectedOpacity`, `unselectedScale` | `0.3`, `0.8`                        | Dim and scale nonselected rows.                                                       |
| `allowFontScaling`                     | `false`                             | Caller should scale font and geometry together.                                       |
| `accessibilityLabel`                   | required string                     | Label for the single adjustable element.                                              |
| `accessibilityValueText`               | optional `(label, index) => string` | Spoken settled value; numeric strings default to numbers.                             |
| `testID`                               | optional string                     | Scroll view receives `${testID}-scroll`.                                              |

## TimePicker

```tsx
const [time, setTime] = useState({ hour: 7, minute: 0 });
<TimePicker value={time} onChange={setTime} />;
```

Import `TimePicker` alongside `WheelPicker`. Hours are 0–23; minutes are 0–59. AM/PM is first; hours and minutes
wrap independently, without carrying into another column or changing AM/PM. Two column callbacks in one batch
merge using the latest time. `TimePickerHandle.freeze()` returns `{ hour, minute }` including moving columns;
commit its result to `value` in the same handler. Freezing does not emit `onChange`.

| Prop                  | Default                                                    | Purpose                                                                          |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `value`, `onChange`   | required                                                   | Controlled 24-hour value and settled/accessibility callback.                     |
| `periodLabels`        | `["AM", "PM"]`                                             | Localized period strings.                                                        |
| `accessibilityLabels` | `{ period: "AM/PM", hour: "Hour", minute: "Minute" }`      | Localized spoken column names.                                                   |
| `separator`           | `":"`                                                      | Visual separator, hidden from accessibility.                                     |
| `enabled`             | `true`                                                     | Enable all columns.                                                              |
| `columns`             | period width 60, number width 90; height 216, rowHeight 80 | `{ period, number }`, each with width, height, rowHeight and optional textStyle. |
| `testID`              | optional                                                   | Column IDs get `-period`, `-hour`, `-minute` suffixes.                           |

There is no 24-hour display mode or configurable period position in 0.1.0.

## Accessibility and text scaling

Each column is one adjustable element with increment/decrement actions. Its rows and the time separator are
hidden from assistive technology. The spoken value remains the committed value during a drag. Disabled columns
announce their disabled state. TalkBack and VoiceOver behavior for this standalone package still needs device QA.

Use `useWindowDimensions().fontScale` to scale text and row dimensions together, as shown in `example/App.tsx`.
The wheel defaults `allowFontScaling` to false to avoid applying font scaling twice. Choose your own cap or fitting
policy; the library has no application-specific scale cap. Preserve sufficient width and height for large text.

## Pixel snapping

`alignRowHeight(dp, density = PixelRatio.get())` is also exported. It chooses the closest physical pixel count that
survives Android's Float32 multiplication followed by integer truncation, which can otherwise lose a pixel per row.
It keeps positive rows at least one physical pixel and rejects nonpositive, nonfinite, or natively unrepresentable geometry. `WheelPicker` applies it automatically, and pixel-rounds
height and vertical padding. Snap interval and `getItemLayout` use the same aligned row height.

## Compatibility and local example

Source tests and static JS exports are checked with React 19.3.0, React Native 0.88.1 (New Architecture), Expo
58.0.21, and TypeScript 6.0.3. Peers declare `react: *` and `react-native: >=0.88.0`; this is a compatibility target,
not evidence that all those versions work. Other React/RN versions remain unverified. No standalone package
Android or iOS runtime, Expo Go/dev-build compatibility, frame timing, or physical accessibility result is claimed.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
cd example
pnpm exec expo start
```

The example resolves the local package root with Metro and uses the root dev dependencies. Build before starting
it. It includes a bounded fruit wheel, time picker, disabled toggle, text-scale sizing, and freeze snapshot button.
Static exports use `cd example && pnpm exec expo export --platform all --output-dir dist`.

## Development and release preparation

Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test`, and `pnpm pack:check`.
`pnpm pack --pack-destination artifacts` creates a local tarball; `pnpm consumer:check <tarball>` imports its public
CommonJS entry point and checks its declarations without source aliases. This smoke test inherits this repository’s
installed development dependencies; it is not an isolated install or a full peer-version compatibility check. See `RELEASE_PREPARATION.md` for gates.
The tag/main-only publication workflow is prepared for use; it remains dormant because no remote or release ref has been published.

## License and provenance

Copyright 2026 Asleep, Inc. Prepared under Apache-2.0; see LICENSE. Wheel behavior derives from company-authored
code by Hankyeol Kyung in a private UNLICENSED application repository, commit
`ea86afc9fbdbaa1a18876a85788c643ce2e44385`. Generalized public props and time-state merging are additions here;
this is not a clean-room reimplementation. The repeat and center helpers are expressed locally; the package still adapts the company source and tests.
Apache-2.0 is the explicit coordinator assumption used for this preparation.
