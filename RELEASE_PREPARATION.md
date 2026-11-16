# Release preparation — 0.1.0

Prepared locally on 2026-11-16. This is not a published package or a device validation report.

## Source and configuration gates

- Independent local repository on main, no remote. No application migration, application pin, or raw Git object changed.
- CommonJS and declarations produced with TypeScript 6.0.3; React 19.3.0, RN 0.88.1 and Expo 58.0.21 pinned for development.
- pnpm 11.15.1 workspace with hoisted node linker, one canonical root lockfile and an Expo example workspace.
- Zero runtime dependencies; React and React Native are the only peers. No fonts, images, native modules or app protocol.
- Apache-2.0 preparation under the explicit coordinator assumption, with factual provenance in PROVENANCE.md.
- CI prepared with pinned actions, read-only permissions and checkout credential persistence disabled.
- Tag/main-only publication workflow is ready but dormant: no remote or release refs have been published. No token setup or AI release-note dependency.

## Validation evidence

Local commands and results:

| Gate                                                                                          | Result                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --ignore-scripts`                                             | PASS                                                                                  |
| `pnpm typecheck`                                                                              | PASS, strict plus no-unused checks                                                    |
| `pnpm lint` / `pnpm format:check`                                                             | PASS                                                                                  |
| `pnpm build`                                                                                  | PASS, CommonJS `lib/index.js` and `lib/index.d.ts`                                    |
| `pnpm test`                                                                                   | PASS, 3 suites / 36 tests                                                             |
| `pnpm pack:check`                                                                             | PASS, exact 22-file allowlist                                                         |
| `pnpm pack --pack-destination artifacts`                                                      | PASS, local package tarball                                                           |
| `pnpm consumer:check artifacts/asleep-ai-react-native-wheelpicker-0.1.0.tgz`                  | PASS, real tarball imported by package name in RN Jest and strict TypeScript consumer |
| `cd example && pnpm exec expo export --platform all --output-dir dist-review --max-workers 2` | PASS, iOS and Android static Hermes JS exports                                        |

Behavioral tests cover live visual highlights and committed accessibility values, freeze/late callbacks, host and
accessibility resync, disabled/programmatic behavior, bounded periods, both minute and hour wrap directions,
pre-layout controlled resync for both layout orders, predecessor rows without a scroll, memoized row renders,
Float32-safe intervals across nine densities, TimePicker latest-value merges and freeze snapshots.

Temporary mutations to remove live highlights, predecessor rows, row memoization, frozen handling, Float32 safety,
latest-value merging, and F1 contentOffset were caught by the relevant tests. Every mutation was restored;
logs remain locally under ignored `.validation/`. Static exports and consumer scratch evidence are ignored,
excluded from the package, and retained locally. The tarball consumer inherits repository development dependencies, so it is not an isolated install or a full peer-range check. Runtime/device/performance claims remain NOT RUN.

Review follow-up validation also exercised the actual workflow shell blocks in local fixtures: eight release-ref,
annotated-tag and version cases passed; five mocked registry/release cases passed, including missing-release
reconciliation after an already-published npm version and rejection of non-E404 registry failures. These are local
script checks, not hosted CI, OIDC, registry publication or GitHub Release proof. The pnpm action commit and
annotated-tag dereference were verified through GitHub's read-only API.

The final tarball digest and exact signed commit are supplied in the coordinator handoff; the tarball is excluded
from Git. Recompute the digest with `shasum -a 256 artifacts/asleep-ai-react-native-wheelpicker-0.1.0.tgz` before any
future distribution. Do not treat an earlier tarball as evidence for later source inputs.

## Remaining gates before distribution

1. Coordinator-managed Claude source/API, test, package, and license/provenance review of the exact final commit.
2. Separate physical QA on Android tablet 2 and iOS: initial predecessor visibility before touch, wraps, controlled
   resync, freeze, large text, and TalkBack/VoiceOver. Expo Go versus dev-build support is unverified.
3. Explicit authorization to create the proposed GitHub repository, set its remote, push, or open a PR. None done.
4. Explicit authorization and maintainer scope access for npm distribution. Trusted-publisher/first-publication
   requirements must be checked against current npm documentation at that time; none are assumed configured.
5. Authorize actual publication only after the preceding gates. The prepared workflow verifies checked-out SHA,
   main ancestry, semver/tag agreement, existing peeled version-tag identity, and registry state before publishing
   the tested tarball, then reconciles the GitHub Release even when that npm version already exists. Workflow
   preparation does not establish hosted CI success or grant remote publication authority.

No GitHub repository, npm version, release, native build, EAS build, device run, or public availability has been
created or verified by this preparation.
