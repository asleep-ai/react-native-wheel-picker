// A release may recover an existing npm version only when it contains the exact package being released.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync, execFileSync } = require("node:child_process");

const integrityOf = (file) => `sha512-${crypto.createHash("sha512").update(fs.readFileSync(file)).digest("base64")}`;
const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
const npm = (args) => {
  const result = spawnSync("npm", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
};

function archiveEntries(archive) {
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trimEnd().split("\n");
  const verbose = execFileSync("tar", ["-tvzf", archive], { encoding: "utf8" }).trimEnd().split("\n");
  if (names.length !== verbose.length || new Set(names).size !== names.length) throw Error("Ambiguous archive entries");
  return names.map((name, index) => {
    const type = verbose[index][0];
    const directory = type === "d";
    const allowed = directory
      ? /^package\/(?:lib\/|src\/)?$/.test(name)
      : type === "-" &&
        /^package\/(?:package\.json|LICENSE|README\.md|CHANGELOG\.md|(?:lib|src)\/[A-Za-z0-9_-]+(?:\.d)?\.(?:js|ts|tsx))$/.test(
          name,
        );
    if (!allowed) throw Error(`Unsafe or unexpected archive entry: ${JSON.stringify(name)}`);
    return { name, directory };
  });
}

function extractFiles(archive, entries, destination) {
  fs.mkdirSync(destination);
  const files = entries
    .filter((entry) => !entry.directory)
    .map((entry) => entry.name)
    .sort();
  execFileSync("tar", ["-xzf", archive, "--no-same-owner", "--no-same-permissions", "-C", destination, "--", ...files]);
  for (const name of files) {
    if (!fs.lstatSync(path.join(destination, name)).isFile()) throw Error("Archive did not extract regular files");
  }
  return files;
}

function checkRegistry(spec, localArchive) {
  const view = npm(["view", spec, "dist", "--json"]);
  const metadata = parse(view.stdout);
  if (view.status !== 0) {
    if (view.status !== null && metadata?.error?.code === "E404") return true;
    throw Error(`Registry lookup failed: ${view.stdout}${view.stderr}`);
  }
  const published = metadata?.integrity;
  if (
    typeof published !== "string" ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(published) ||
    Buffer.from(published.slice(7), "base64").length !== 64 ||
    Buffer.from(published.slice(7), "base64").toString("base64") !== published.slice(7)
  ) {
    throw Error("Registry has missing or malformed SHA512 integrity");
  }
  let url;
  try {
    url = new URL(metadata.tarball);
  } catch {
    throw Error("Registry has no valid tarball URL");
  }
  if (url.protocol !== "https:" || url.username || url.password) throw Error("Registry has no valid HTTPS tarball URL");
  if (published === integrityOf(localArchive)) return false;

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "wheelpicker-registry-"));
  const packed = npm(["pack", spec, "--ignore-scripts", "--json", "--pack-destination", scratch]);
  const records = parse(packed.stdout);
  const filename = records?.[0]?.filename;
  if (
    packed.status !== 0 ||
    !Array.isArray(records) ||
    records.length !== 1 ||
    typeof filename !== "string" ||
    !/^[A-Za-z0-9_.-]+\.tgz$/.test(filename)
  ) {
    throw Error(`Registry tarball fetch failed: ${packed.stdout}${packed.stderr}`);
  }
  const remoteArchive = path.join(scratch, filename);
  if (integrityOf(remoteArchive) !== published) throw Error("Fetched tarball does not match registry integrity");
  const localEntries = archiveEntries(localArchive);
  const remoteEntries = archiveEntries(remoteArchive);
  const localNames = localEntries
    .filter((entry) => !entry.directory)
    .map((entry) => entry.name)
    .sort();
  const remoteNames = remoteEntries
    .filter((entry) => !entry.directory)
    .map((entry) => entry.name)
    .sort();
  if (JSON.stringify(localNames) !== JSON.stringify(remoteNames))
    throw Error("Existing npm package file list differs; bump the version");
  const localDir = path.join(scratch, "local");
  const remoteDir = path.join(scratch, "published");
  const files = extractFiles(localArchive, localEntries, localDir);
  extractFiles(remoteArchive, remoteEntries, remoteDir);
  for (const name of files) {
    if (!fs.readFileSync(path.join(localDir, name)).equals(fs.readFileSync(path.join(remoteDir, name)))) {
      throw Error("Existing npm package contents differ from this commit; bump the version");
    }
  }
  return false;
}

if (require.main === module) {
  try {
    console.log(`publish=${checkRegistry(process.argv[2], path.resolve(process.argv[3]))}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { checkRegistry, integrityOf };
