const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { execFileSync, spawnSync } = require("node:child_process");
const { integrityOf } = require("./check-registry.cjs");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wheelpicker-registry-test-"));
  const tree = path.join(root, "tree");
  fs.mkdirSync(path.join(tree, "package"), { recursive: true });
  fs.writeFileSync(path.join(tree, "package/package.json"), '{"name":"fixture","version":"0.1.0"}');
  fs.writeFileSync(path.join(tree, "package/README.md"), "Example package contents.\n".repeat(100));
  const local = path.join(root, "local.tgz");
  execFileSync("tar", ["-czf", local, "-C", tree, "package"]);
  const remote = path.join(root, "remote.tgz");
  fs.writeFileSync(remote, zlib.gzipSync(zlib.gunzipSync(fs.readFileSync(local)), { level: 1 }));
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, "npm"),
    `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
fs.appendFileSync(process.env.MOCK_LOG, process.argv[2] + '\\n');
if (process.argv[2] === 'view') {
  if (process.env.MOCK_ERROR) {
    console.log(JSON.stringify({error:{code:process.env.MOCK_ERROR}})); process.exit(1);
  }
  console.log(fs.readFileSync(process.env.MOCK_META, 'utf8')); process.exit(0);
}
if (process.argv[2] !== 'pack' || process.env.MOCK_PACK_FAIL) process.exit(1);
const destination = process.argv[process.argv.indexOf('--pack-destination') + 1];
fs.copyFileSync(process.env.MOCK_REMOTE, path.join(destination, 'fixture.tgz'));
console.log(JSON.stringify([{filename:'fixture.tgz'}]));
`,
    { mode: 0o755 },
  );
  const metadata = path.join(root, "metadata.json");
  const log = path.join(root, "commands.log");
  const dist = { integrity: integrityOf(remote), tarball: "https://registry.npmjs.org/fixture/-/fixture-0.1.0.tgz" };
  const run = (overrides = {}) => {
    fs.writeFileSync(metadata, JSON.stringify(dist));
    return spawnSync(process.execPath, [path.join(__dirname, "check-registry.cjs"), "fixture@0.1.0", local], {
      env: {
        ...process.env,
        PATH: bin + path.delimiter + process.env.PATH,
        MOCK_META: metadata,
        MOCK_LOG: log,
        MOCK_REMOTE: remote,
        ...overrides,
      },
      encoding: "utf8",
    });
  };
  return { root, tree, local, remote, dist, log, run };
}

const rejects = (result) => {
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
};

test("identical integrity skips download and allows release recovery", () => {
  const f = fixture();
  f.dist.integrity = integrityOf(f.local);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "publish=false\n");
  assert.equal(fs.readFileSync(f.log, "utf8"), "view\n");
});
test("different gzip bytes with identical package contents allow recovery", () => {
  const f = fixture();
  assert.notEqual(integrityOf(f.local), integrityOf(f.remote));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "publish=false\n");
  assert.equal(fs.readFileSync(f.log, "utf8"), "view\npack\n");
});
test("existing version from different contents fails before release", () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.tree, "package/README.md"), "Different source");
  execFileSync("tar", ["-czf", f.remote, "-C", f.tree, "package"]);
  f.dist.integrity = integrityOf(f.remote);
  const result = f.run();
  rejects(result);
  assert.match(result.stderr, /contents differ/);
});
test("404 alone authorizes a new publication", () => {
  const result = fixture().run({ MOCK_ERROR: "E404" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "publish=true\n");
});
test("other registry failures fail closed", () => {
  rejects(fixture().run({ MOCK_ERROR: "E503" }));
});
for (const integrity of [undefined, "malformed", "sha512-AAAA=="]) {
  test(`rejects missing or malformed integrity ${integrity}`, () => {
    const f = fixture();
    f.dist.integrity = integrity;
    rejects(f.run());
  });
}
test("rejects missing tarball metadata even on the integrity fast path", () => {
  const f = fixture();
  f.dist.integrity = integrityOf(f.local);
  delete f.dist.tarball;
  rejects(f.run());
});
test("tarball fetch errors fail closed", () => {
  rejects(fixture().run({ MOCK_PACK_FAIL: "1" }));
});
test("download must match the registry integrity", () => {
  const f = fixture();
  f.dist.integrity = `sha512-${Buffer.alloc(64, 1).toString("base64")}`;
  rejects(f.run());
});
test("rejects parent traversal entries without extraction outside the package", () => {
  const f = fixture();
  fs.mkdirSync(path.join(f.root, "nested"));
  fs.writeFileSync(path.join(f.root, "outside"), "Traversal fixture");
  execFileSync("tar", ["-Pczf", f.remote, "-C", path.join(f.root, "nested"), "../outside"]);
  f.dist.integrity = integrityOf(f.remote);
  const result = f.run();
  rejects(result);
  assert.match(result.stderr, /Unsafe or unexpected archive entry/);
});
test("rejects symlinks before extraction", () => {
  const f = fixture();
  fs.symlinkSync("../../outside", path.join(f.tree, "package/link"));
  execFileSync("tar", ["-czf", f.remote, "-C", f.tree, "package"]);
  f.dist.integrity = integrityOf(f.remote);
  const result = f.run();
  rejects(result);
  assert.match(result.stderr, /Unsafe or unexpected archive entry/);
});
test("rejects hardlinks before extraction", () => {
  const f = fixture();
  fs.linkSync(path.join(f.tree, "package/README.md"), path.join(f.tree, "package/CHANGELOG.md"));
  execFileSync("tar", ["-czf", f.remote, "-C", f.tree, "package"]);
  f.dist.integrity = integrityOf(f.remote);
  const result = f.run();
  rejects(result);
  assert.match(result.stderr, /Unsafe or unexpected archive entry/);
});
