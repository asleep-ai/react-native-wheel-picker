// Expo's development-only HMR path is absent from production exports and RN Jest consumers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const example = path.join(root, "example");
const output = process.argv[2]
  ? path.resolve(process.argv[2])
  : fs.mkdtempSync(path.join(os.tmpdir(), "wheelpicker-dev-"));
fs.mkdirSync(output, { recursive: true });
const bundlePath = path.join(output, "example.bundle");
if (!process.argv.includes("--inspect-only")) {
  // Flags are supported by the pinned @expo/cli export/embed implementation; this emits JS only, no native build.
  execFileSync(
    process.execPath,
    [
      require.resolve("expo/bin/cli"),
      "export:embed",
      "--platform",
      "android",
      "--dev",
      "true",
      "--minify",
      "false",
      "--entry-file",
      "index.js",
      "--bundle-output",
      bundlePath,
      "--sourcemap-output",
      path.join(output, "example.map"),
      "--max-workers",
      "2",
      "--skip-server",
    ],
    {
      cwd: example,
      env: { ...process.env, EXPO_NO_TELEMETRY: "1" },
      stdio: "inherit",
      timeout: 120000,
    },
  );
}
const bundle = fs.readFileSync(bundlePath, "utf8");
assert.match(bundle, /__DEV__=true/);
const modules = [];
let previous = 0;
for (const match of bundle.matchAll(/^},(\d+),(\[[^\n]*\]),("(?:[^"\\]|\\.)*")\);$/gm)) {
  const start = bundle.indexOf("__d(function", previous);
  assert(start >= previous && start < match.index, "Expected Metro development module wrapper");
  modules.push({
    id: Number(match[1]),
    deps: JSON.parse(match[2]),
    name: JSON.parse(match[3]),
    body: bundle.slice(start, match.index),
  });
  previous = match.index + match[0].length;
}
assert(modules.length > 0, "Expected real Metro modules");
const one = (pattern) => {
  const found = modules.filter((module) => pattern.test(module.name));
  assert.equal(found.length, 1, `Expected one module for ${pattern}; found ${found.map((m) => m.name)}`);
  return found[0];
};
const hmr = one(/\/expo\/build\/async-require\/hmr\.js$/);
const prettySlot = hmr.body.match(/require\(_dependencyMap\[(\d+)\], "pretty-format"\)/);
assert(prettySlot, "Expected Expo HMR pretty-format dependency");
const pretty = modules.find((module) => module.id === hmr.deps[Number(prettySlot[1])]);
assert(pretty, "Expected resolved pretty-format module");
// Register the real Metro modules without running the app/native initialization entry calls.
const context = vm.createContext({ console });
vm.runInContext(bundle.replace(/^__r\(\d+\);$/gm, ""), context, { timeout: 10000 });
const selector = hmr.body.match(/var prettyFormatFunc =[^;\n]+;/);
assert(selector, "Expected Expo HMR's formatter-selection expression");
vm.runInContext(
  `var _prettyFormat=__r(${pretty.id}); var prettyFormat=_prettyFormat && _prettyFormat.__esModule ? _prettyFormat : {default:_prettyFormat}; ${selector[0]}`,
  context,
  { timeout: 10000 },
);
assert.equal(vm.runInContext("typeof prettyFormatFunc", context), "function", "Expo HMR formatter must initialize");
let directory = path.dirname(path.resolve(example, pretty.name));
let prettyVersion;
while (directory !== path.dirname(directory)) {
  const manifest = path.join(directory, "package.json");
  if (fs.existsSync(manifest)) {
    const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
    if (pkg.name === "pretty-format") {
      prettyVersion = pkg.version;
      break;
    }
  }
  directory = path.dirname(directory);
}
assert.equal(prettyVersion, "29.7.0", "Expo must resolve its own compatible pretty-format");
assert(
  !modules.some((module) => module.name.endsWith("/pretty-format/build/index.mjs")),
  "Unexpected pretty-format ESM wrapper",
);
const react = one(/(?:^|\/)react\/index\.js$/);
const native = one(/(?:^|\/)react-native\/index\.js$/);
const jsx = one(/(?:^|\/)react\/jsx-runtime\.js$/);
const consumers = [one(/^App\.tsx$/), one(/^\.\.\/lib\/WheelPicker\.js$/), one(/^\.\.\/lib\/TimePicker\.js$/)];
for (const consumer of consumers) {
  for (const dependency of [react, native, jsx])
    assert(consumer.deps.includes(dependency.id), `${consumer.name} must share ${dependency.name}`);
}
const entry = one(/^\.\.\/lib\/index\.js$/);
assert(
  entry.deps.includes(consumers[1].id) && entry.deps.includes(consumers[2].id),
  "Package must load compiled entry exports",
);
assert(
  !modules.some((module) => path.resolve(example, module.name).startsWith(path.join(root, "src") + path.sep)),
  "Package source bypass",
);
const evidence = {
  prettyFormat: { id: pretty.id, path: pretty.name, version: prettyVersion },
  shared: [react, native, jsx].map(({ id, name }) => ({ id, path: name })),
  consumers: consumers.map(({ id, name }) => ({ id, path: name })),
  package: modules
    .filter((module) => /^\.\.\/lib\/[^/]+\.js$/.test(module.name))
    .map(({ id, name }) => ({ id, path: name })),
};
fs.writeFileSync(path.join(output, "resolution.json"), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
console.log(`Development bundle evidence retained at ${output}`);
