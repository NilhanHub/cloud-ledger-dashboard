import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");

const files = [
  "index.html",
  "assets/app.js",
  "assets/styles.css",
  "data/cloud_inventory.data.js",
];

await rm(output, { recursive: true, force: true });

for (const relativePath of files) {
  const source = resolve(root, relativePath);
  const destination = resolve(output, relativePath);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await cp(source, destination);
}

console.log(`Prepared ${files.length} allowlisted static assets in ${output}`);
