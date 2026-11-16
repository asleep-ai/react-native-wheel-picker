const { execFileSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const walk = (dir) =>
  readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? (entry.name === "__tests__" ? [] : walk(file)) : [file];
  });
const expected = [...walk("lib"), ...walk("src"), "package.json", "LICENSE", "README.md", "CHANGELOG.md"].sort();
const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8" }),
);
const actual = pack.files.map((file) => file.path).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error(`Unexpected package contents:\n${JSON.stringify(actual, null, 2)}`);
console.log(`Verified ${actual.length} allowlisted files:\n${actual.join("\n")}`);
