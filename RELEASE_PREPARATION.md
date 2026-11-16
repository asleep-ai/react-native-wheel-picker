# Release preparation — 0.1.0

Prepared locally on 2026-11-16. This is not a published package or a device validation report.

## Source and configuration gates

- Independent local repository on main, no remote. No application migration, application pin, or raw Git object changed.
- CommonJS and declarations produced with TypeScript 6.0.3; React 19.3.0, RN 0.88.1 and Expo 58.0.21 pinned for development.
- pnpm 12.21.0 workspace with hoisted node linker, one canonical root lockfile and an Expo example workspace.
- Zero runtime dependencies; React and React Native are the only peers. No fonts, images, native modules or app protocol.
- Apache-2.0 preparation under the explicit coordinator assumption, with factual provenance in PROVENANCE.md.
- CI prepared with pinned actions, read-only permissions and checkout credential persistence disabled.
- Checkout/setup-node pins match react-native-alarm ff1fd5f14d; publishing serializes through concurrency group
  `publish` without cancellation, and disables package-manager caching while CI retains its pnpm cache.
  No hosted workflow has run for this repository.
- Tag/main-only publication workflow is ready but dormant: no remote or release refs have been published. No token setup or AI release-note dependency.

## Dependency build-policy correction

The first hosted CI run on dacbeec failed in all three jobs at dependency installation with
`ERR_PNPM_IGNORED_BUILDS` for `@parcel/watcher@2.6.0`; project checks were skipped. The workspace now explicitly
denies that package’s unused source-build script while retaining its optional prebuilt platform packages,
strict dependency-build review and frozen-lockfile installation. Earlier local installs with `--ignore-scripts`
did not exercise this hosted-install gate. Fresh exact-source installation with an empty scoped store and the
CI-equivalent checks are recorded in the coordinator’s CI-fix handoff; hosted success requires a new actual run.

## Validation evidence

Local commands and results:

| Gate                                                                                          | Result                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                              | See fresh-source CI-fix handoff                                                       |
| `pnpm typecheck`                                                                              | PASS, strict plus no-unused checks                                                    |
| `pnpm lint` / `pnpm format:check`                                                             | PASS                                                                                  |
| `pnpm build`                                                                                  | PASS, CommonJS `lib/index.js` and `lib/index.d.ts`                                    |
| `pnpm test`                                                                                   | PASS, 4 suites / 39 tests                                                             |
| `pnpm pack:check`                                                                             | PASS, exact 22-file allowlist                                                         |
| `pnpm pack --pack-destination artifacts`                                                      | PASS, local package tarball                                                           |
| `pnpm consumer:check artifacts/asleep-ai-react-native-wheel-picker-0.1.0.tgz`                 | PASS, real tarball imported by package name in RN Jest and strict TypeScript consumer |
| `cd example && pnpm exec expo export --platform all --output-dir dist-review --max-workers 2` | PASS, iOS and Android static Hermes JS exports                                        |

Behavioral tests cover live visual highlights and committed accessibility values, freeze/late callbacks, host and
accessibility resync, disabled/programmatic behavior, bounded periods, both minute and hour wrap directions,
pre-layout controlled resync for both layout orders, predecessor rows without a scroll, memoized row renders,
Float32-safe intervals across nine densities, TimePicker latest-value merges and freeze snapshots.

Temporary mutations to remove live highlights, predecessor rows, row memoization, frozen handling, Float32 safety,
latest-value merging, and F1 contentOffset were caught by the relevant tests. Every mutation was restored;
logs remain locally under ignored `.validation/`. Static exports and consumer scratch evidence are ignored,
excluded from the package, and retained locally. The tarball consumer inherits repository development dependencies, so it is not an isolated install or a full peer-range check. Runtime/device/performance claims remain NOT RUN.

Review follow-up validation exercised the actual workflow ref/version shell block in eight local cases. The
existing-version content guard has 14 native Node test fixtures (`node --test scripts/check-registry.test.cjs`):
identical SHA512 integrity, different gzip bytes with identical extracted contents, different contents, E404,
non-E404 errors, missing/malformed integrity, missing tarball URL, fetch/integrity failure, traversal, symlinks and
hardlinks. Existing versions only permit release recovery after this comparison; a different source using the
same npm version fails before GitHub Release reconciliation. Archive entries are validated before native tar
extracts regular files into fresh temporary directories; comparison covers the exact file names and bytes.
These are local checks, not hosted CI, OIDC or publication proof. The pnpm action commit and annotated-tag
dereference were verified through GitHub's read-only API. The release-only workflow/helper/docs changes leave
the 22-file publication artifact unchanged.

The final tarball digest and exact signed commit are supplied in the coordinator handoff; the tarball is excluded
from Git. Recompute the digest with `shasum -a 256 artifacts/asleep-ai-react-native-wheel-picker-0.1.0.tgz` before any
future distribution. Do not treat an earlier tarball as evidence for later source inputs.

## Expo development initialization regression

A physical Expo Go attempt at 4dc17057 stopped before T0: Expo HMR resolved the root Jest tooling’s
pretty-format 30.5.1 ESM wrapper and threw before the example rendered. The saved development bundle reproduces
that formatter-initialization error with Metro’s real module loader. No picker runtime behavior passed.

The example now inherits Expo’s monorepo module paths and hierarchical lookup, keeping the package alias and
compiled lib entry. `node scripts/example-bundle-check.cjs` uses the pinned official Expo `export:embed` CLI with
`--dev true --minify false` (JavaScript only) and a 120-second timeout. It checks the actual HMR formatter
initialization, pretty-format 29.7.0 resolution, one React/RN/JSX-runtime module ID shared by App and both compiled
pickers, the compiled package entry and absence of a package src bypass. CI runs this command after build.
The pre-fix bundle fails; the corrected bundle passes. Evidence remains under ignored `.validation/` locally.

The earlier production export result is historical and did not cover development HMR. The new regression is
host-side module initialization and resolution proof, not an Expo Go/device, full App startup, native, performance
or accessibility result. The subsequent bounded Android evidence is recorded below; no device action was taken
for the host-side fix. No dependency version or public library runtime/API changed, and the tarball remains unchanged.

## Fixed viewport composition follow-up

RN 0.88.1 source confirms the plain ScrollView orientation consumer in VirtualizedList only emits its development
nesting diagnostic. The independent measurement/windowing path instead uses VirtualizedListContext. WheelPicker
now isolates only the former public context around its fixed-height FlatList; no native View, layout/AX change,
virtualization switch, private context reset or general logging suppression was added.

A real vertical ScrollView regression failed before the fix for WheelPicker and all three TimePicker columns,
while an ordinary unisolated FlatList control retained RN's warning. All three pass after isolation; fixed viewport
layout, untouched predecessor rows, settled callbacks, freeze/a11y state and stable scroll-host instance are covered.
The prior T4 dimming acceptance criterion was an erroneous application-specific expectation: the library's
`enabled` contract blocks new editing and announces disabled state, without promising any visual dimming. It is
clarified as a source contract fact, not reported as a newly passing visual behavior.

The published runtime and README changed, so 0.1.0 was rebuilt, repacked and checked through the actual tarball
render/type consumer and the development-bundle regression. Its new digest and signed source commit are in the
coordinator handoff. Subsequent bounded physical warning-absence and behavior evidence is recorded below;
no production/native-build or runtime performance result is claimed for this follow-up.

## Dated Android evidence and identity rename — 2026-11-16

Claude’s final standalone R9 verdict records PASS for Android Expo Go SDK 58 development-mode functionality on
Samsung SM-X133, with official Expo Go 58.0.5. The executed source was signed 9f27ea51 and
artifact SHA256 `903e2b6ee90f8c5d3fba2428c04f641818a567813e2a7d0e65b2014bfbeb03f0`, served from compiled lib
matching that tarball. Fresh untouched predecessor rows, fruit/minute edits, disabled blocking and re-enabled
editing, sampled freeze agreement/stability and bounded nested-warning absence passed in the observed session.
Wrap and bound evidence was reused from retry-1; the exact freeze tap instant was not observable.

The coordinated identity is now npm `@asleep-ai/react-native-wheel-picker` and proposed GitHub repository
`asleep-ai/react-native-wheel-picker`, retaining version 0.1.0 and Apache-2.0. The local folder is unchanged.
The rename checks compare every compiled JS/declaration file with the physically tested artifact. Identical lib
bytes carry the implementation evidence forward; they do not establish a new-name device run or a broader runtime
claim. The new tarball digest, exact renamed source commit and byte comparison are in the coordinator handoff.

Current gates: Android development-mode evidence PASS with the stated bounds; iOS, TalkBack/VoiceOver,
production/Hermes performance, latency, native before/after comparison and application integration NOT RUN.
Hosted GitHub CI and npm publication are also NOT RUN. No new device action was performed for the rename.

## Remaining gates before distribution

1. Coordinator-managed review of the exact renamed source, metadata and artifact.
2. Root is authorized to create the public GitHub repository, add origin and push main after review, then observe
   actual GitHub Actions on that exact commit. These actions have not been performed by this worker.
3. iOS and screen-reader QA remain separate physical gates; Android evidence above is limited to the observed
   Expo Go SDK 58 development-mode sessions and identical compiled implementation.
4. npm distribution remains NOT RUN and requires scope access and trusted-publisher/first-publication setup and
   release authorization. No credentials or publisher configuration are assumed configured.
5. The prepared release workflow verifies checked-out SHA, main ancestry, semver/tag agreement, existing peeled
   version-tag identity, and registry state and existing-version contents before publishing the tested tarball,
   then reconciles the GitHub Release. Preparation does not establish hosted CI success or npm availability.

No remote repository, push, GitHub Release or npm publication was performed by this rename preparation.
