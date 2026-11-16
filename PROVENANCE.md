# Provenance

This package adapts company-authored application code at
`asleep-ai/sleeproutine-react-native` commit `ea86afc9fbdbaa1a18876a85788c643ce2e44385`:

- `brownfield/login/src/home/WheelColumn.tsx`: motion state, virtualization, initial positioning, live highlights,
  settled callbacks, freeze and adjustable accessibility behavior.
- `brownfield/login/src/home/homeStyle.ts`: Float32-safe row alignment (application styling omitted).
- `brownfield/login/src/home/timeMath.ts`: time/column conversion, labels and wheel offset/step math.
- Focused wheel and geometry tests: ported and extended.

The source repository is UNLICENSED and identifies Hankyeol Kyung as the author of the reviewed wheel changes.
The approved design proposes Apache-2.0 with Copyright 2026 Asleep, Inc.; public distribution still requires a
maintainer to confirm company ownership and relicensing authority for every adapted source and test. No claim
is made that rewriting elementary helpers resolves licensing. The repeat and center helpers here are expressed
locally rather than copied from the application's separately authored utility module.

LICENSE contains the standard Apache-2.0 text, as used by the company's compose-wheelpicker package. No Compose
implementation was copied. CI and the disabled publish workflow adapt react-native-alarm's workflow structure;
actions are pinned to full v4 tag SHAs resolved on 2026-11-16. No native sources, images, fonts, credentials,
telemetry, application protocol or private configuration are included.
