# Release preparation — 0.1.0

Prepared locally on 2026-11-16. This is not a published package or a device validation report.

## Source and configuration gates

- Independent local repository on main, no remote. No application migration, application pin, or raw Git object changed.
- CommonJS and declarations produced with TypeScript 6.0.3; React 19.3.0, RN 0.88.1 and Expo 58.0.21 pinned for development.
- pnpm 11.15.1 workspace with hoisted node linker, one canonical root lockfile and an Expo example workspace.
- Zero runtime dependencies; React and React Native are the only peers. No fonts, images, native modules or app protocol.
- Apache-2.0 preparation, with provenance in PROVENANCE.md. Relicensing authority is still a maintainer gate.
- CI prepared with pinned actions, read-only permissions and checkout credential persistence disabled.
- Publish workflow is explicitly disabled by a literal false job condition. No token setup or AI release-note dependency.

## Validation evidence

Local commands and results:

| Gate                                                                                         | Result                                                                                |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --ignore-scripts`                                            | PASS                                                                                  |
| `pnpm typecheck`                                                                             | PASS, strict plus no-unused checks                                                    |
| `pnpm lint` / `pnpm format:check`                                                            | PASS                                                                                  |
| `pnpm build`                                                                                 | PASS, CommonJS `lib/index.js` and `lib/index.d.ts`                                    |
| `pnpm test`                                                                                  | PASS, 3 suites / 34 tests                                                             |
| `pnpm pack:check`                                                                            | PASS, exact 22-file allowlist                                                         |
| `pnpm pack --pack-destination artifacts`                                                     | PASS, local package tarball                                                           |
| `pnpm consumer:check artifacts/asleep-ai-react-native-wheelpicker-0.1.0.tgz`                 | PASS, real tarball imported by package name in RN Jest and strict TypeScript consumer |
| `cd example && pnpm exec expo export --platform all --output-dir dist-final --max-workers 2` | PASS, iOS and Android static Hermes JS exports                                        |

Behavioral tests cover live visual highlights and committed accessibility values, freeze/late callbacks, host and
accessibility resync, disabled/programmatic behavior, bounded periods, both minute and hour wrap directions,
pre-layout controlled resync for both layout orders, predecessor rows without a scroll, memoized row renders,
Float32-safe intervals across nine densities, TimePicker latest-value merges and freeze snapshots.

Temporary mutations to remove live highlights, predecessor rows, row memoization, frozen handling, Float32 safety,
latest-value merging, and F1 contentOffset were caught by the relevant tests. Every mutation was restored;
logs remain locally under ignored `.validation/`. Static exports and consumer scratch evidence are ignored,
excluded from the package, and retained locally. Runtime/device/performance claims remain NOT RUN.

The final tarball digest and exact signed commit are supplied in the coordinator handoff; the tarball is excluded
from Git. Recompute the digest with `shasum -a 256 artifacts/asleep-ai-react-native-wheelpicker-0.1.0.tgz` before any
future distribution. Do not treat an earlier tarball as evidence for later source inputs.

## Remaining gates before distribution

1. Coordinator-managed Claude source/API, test, package, and license/provenance review of the exact final commit.
2. Maintainer confirmation of ownership and authority to relicense all adapted source and tests.
3. Separate physical QA on Android tablet 2 and iOS: initial predecessor visibility before touch, wraps, controlled
   resync, freeze, large text, and TalkBack/VoiceOver. Expo Go versus dev-build support is unverified.
4. Explicit authorization to create the proposed GitHub repository, set its remote, push, or open a PR. None done.
5. Explicit authorization and maintainer scope access for npm distribution. Trusted-publisher/first-publication
   requirements must be checked against current npm documentation at that time; none are assumed configured.
6. Review and authorize a change enabling the publish workflow only after the preceding gates. Its prepared
   ancestry/version/registry checks do not grant publishing authority or establish hosted CI success.

No GitHub repository, npm version, release, native build, EAS build, device run, or public availability has been
created or verified by this preparation.
