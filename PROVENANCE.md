# Provenance

This package adapts company-authored application code at
`asleep-ai/sleeproutine-react-native` commit `ea86afc9fbdbaa1a18876a85788c643ce2e44385`:

- `brownfield/login/src/home/WheelColumn.tsx`: motion state, virtualization, initial positioning, live highlights,
  settled callbacks, freeze and adjustable accessibility behavior.
- `brownfield/login/src/home/homeStyle.ts`: Float32-safe row alignment (application styling omitted).
- `brownfield/login/src/home/timeMath.ts`: time/column conversion, labels and wheel offset/step math.
- Focused wheel and geometry tests: ported and extended.

The source repository is UNLICENSED and identifies Hankyeol Kyung as the author of the reviewed wheel changes.
Apache-2.0 with Copyright 2026 Asleep, Inc. is the explicit coordinator assumption used for this preparation.
The repeat and center helpers here are expressed locally rather than copied from the application's separately
authored utility module; the package remains an adaptation, not a clean-room implementation.

LICENSE contains the standard Apache-2.0 text, as used by the company's compose-wheelpicker package. No Compose
implementation was copied. CI and the publication workflow adapt react-native-alarm's workflow structure.
Checkout v7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`) and setup-node v7.0.0
(`820762786026740c76f36085b0efc47a31fe5020`) match react-native-alarm commit
`ff1fd5f14d0d0b21fa4b39418da3863adb094926`; both were verified as commit objects through GitHub’s Git API.
pnpm/action-setup uses v6.0.9 commit
`0ebf47130e4866e96fce0953f49152a61190b271`, verified through GitHub's commit and annotated-tag APIs on 2026-11-16.
The earlier pnpm v4 annotated-tag object pin was replaced because it was not a commit. No native sources, images,
fonts, credentials, telemetry, application protocol or private configuration are included.
