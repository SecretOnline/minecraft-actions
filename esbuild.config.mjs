import * as esbuild from "esbuild";

const entryPoints = [
  { in: "src/get-test-matrix/index.ts", out: "get-test-matrix/dist/index.js" },
  {
    in: "src/get-update-versions/index.ts",
    out: "get-update-versions/dist/index.js",
  },
  { in: "src/setup-mc-server/index.ts", out: "setup-mc-server/dist/index.js" },
  { in: "src/run-mc-server/index.ts", out: "run-mc-server/dist/index.js" },
  { in: "src/setup-mc-client/index.ts", out: "setup-mc-client/dist/index.js" },
  { in: "src/run-mc-client/index.ts", out: "run-mc-client/dist/index.js" },
  { in: "src/setup-packwiz/index.ts", out: "setup-packwiz/dist/index.js" },
  { in: "src/unpack-mrpack/index.ts", out: "unpack-mrpack/dist/index.js" },
  {
    in: "src/packwiz-update-pack/index.ts",
    out: "packwiz-update-pack/dist/index.js",
  },
  {
    in: "src/check-fabric-conflicts/index.ts",
    out: "check-fabric-conflicts/dist/index.js",
  },
  {
    in: "src/packwiz-install-versions/index.ts",
    out: "packwiz-install-versions/dist/index.js",
  },
];

for (const { in: inFile, out: outFile } of entryPoints) {
  await esbuild.build({
    entryPoints: [inFile],
    outfile: outFile,
    bundle: true,
    platform: "node",
    target: "node24",
    format: "cjs",
    sourcemap: false,
    // @actions/cache's dependency chain uses import.meta.url (e.g. for createRequire),
    // which esbuild's CJS output doesn't provide natively - shim it via __filename.
    define: { "import.meta.url": "import_meta_url" },
    banner: {
      js: "const import_meta_url = require('url').pathToFileURL(__filename).href;",
    },
  });
  console.log(`built ${inFile} -> ${outFile}`);
}
