// Only remove this package's reproducible compiler output.
require("node:fs").rmSync(require("node:path").join(__dirname, "../lib"), { recursive: true, force: true });
