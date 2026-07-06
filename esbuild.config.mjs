import * as esbuild from "esbuild";

const entryPoints = [
  { in: "src/get-test-matrix/index.ts", out: "get-test-matrix/dist/index.js" },
  { in: "src/get-update-versions/index.ts", out: "get-update-versions/dist/index.js" },
  { in: "src/setup-mod-gradle/resolve-java/index.ts", out: "setup-mod-gradle/resolve-java/dist/index.js" },
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
  });
  console.log(`built ${inFile} -> ${outFile}`);
}
