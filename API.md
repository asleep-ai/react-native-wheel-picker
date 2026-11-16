# API contract

The public entry point exports `WheelPicker`, `TimePicker`, `alignRowHeight` and the types
`WheelPickerProps`, `WheelPickerHandle`, `TimePickerProps`, `TimePickerHandle`, and `Time24`.
The package entry is CommonJS with adjacent TypeScript declarations; no deep-import contract is provided.

## Controlled values and callbacks

`WheelPicker.items` must be nonempty, `selectedIndex` must be an integer in its index range, and all supplied
geometry must be positive finite dp values. `Time24` requires an integer hour in 0–23 and minute in 0–59.
Geometry and text scaling policy belong to the caller. Neither picker adds application-specific colors or fonts.

Dragging changes a column-local visual value only when its logical row changes. No parent callback is made
until settle. A drag ending at velocity at or below 0.01 settles immediately; other drags wait for momentum end.
The caller must echo callback values to the controlled prop; duplicate settle events after that echo are idempotent.
`TimePicker` additionally suppresses duplicate updates using its latest-value ref and merges column updates in the
same batch. Column wrapping is independent: minute 59 to 00 does not advance the hour; hour 12 to 01 does not
change AM/PM.

Accessibility steps interrupt motion. `WheelPicker.onStep`, if supplied, is responsible for updating controlled
state; otherwise the picker calls `onSelect` with a bounded or wrapped step from `selectedIndex`. Numeric strings
such as "07" are spoken as "7" unless `accessibilityValueText` overrides this. Assistive technology receives the
committed value during scrolling, not each intermediate row.

## Freeze and resynchronization

`WheelPickerHandle.freeze()` reads the absolute live row from a ref, stops motion there, and returns its logical
index; it returns null when idle. `TimePickerHandle.freeze()` combines moving-column snapshots with its latest
value and returns a full `Time24`. Neither freeze emits a change callback. Commit returned values in the same
handler before using them for an action; React batches the local highlight clear with the parent update.

A controlled index change re-anchors to the center cycle, unless the current cycle already has that value.
Changes made during motion freeze the column so queued movement callbacks cannot replace the controlled value.
The initial `contentOffset` remains the selected row's exact offset. `initialScrollIndex` only chooses a render
window large enough to include predecessor rows; it must not cause a deferred scroll to overwrite a pre-layout
controlled update. Cyclic columns retain 100 repeats, 9 initially rendered rows, and a window size of 5.

Disabling prevents new native drags and ignores accessibility steps. It does not cancel pre-existing momentum:
a wheel already moving can continue to highlight and settle. Programmatic scroll callbacks do not start motion.

## Alignment

`alignRowHeight(dp, density?)` returns a pixel-aligned dp value safe for Android's Float32 multiply/truncate snap
conversion. Positive rows are at least one physical pixel; geometry outside native Float32/integer range is rejected. A nearest unsafe pixel count is replaced by the closest safe count. `WheelPicker` aligns row height,
height, and padding; the same aligned row height drives snap intervals, offsets, and item layout. Callers passing
custom text styles should memoize style objects to retain row memoization across their own parent renders.
