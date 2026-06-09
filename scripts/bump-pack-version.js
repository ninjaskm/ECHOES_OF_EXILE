import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(args) {
  const rootIndex = args.indexOf("--root");
  return {
    root: rootIndex === -1 ? process.cwd() : resolve(args[rootIndex + 1])
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function bumpPatch(version) {
  if (
    !Array.isArray(version) ||
    version.length !== 3 ||
    !version.every((part) => Number.isInteger(part) && part >= 0)
  ) {
    throw new Error(`Invalid Bedrock version: ${JSON.stringify(version)}`);
  }

  return [version[0], version[1], version[2] + 1];
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function basePackName(name) {
  return name.replace(/\s+v\d+\.\d+\.\d+$/, "");
}

function versionedDescription(description, versionLabel) {
  const base = description.replace(/\s+\(v\d+\.\d+\.\d+\)$/, "");
  return `${base} (${versionLabel})`;
}

const { root } = parseArgs(process.argv.slice(2));
const rpManifestPath = join(root, "RP", "manifest.json");
const bpManifestPath = join(root, "BP", "manifest.json");
const packVersionPath = join(root, "src", "scripts", "ui", "packVersion.ts");
const rpManifest = readJson(rpManifestPath);
const bpManifest = readJson(bpManifestPath);
const currentVersion =
  compareVersions(rpManifest.header.version, bpManifest.header.version) >= 0
    ? rpManifest.header.version
    : bpManifest.header.version;
const nextVersion = bumpPatch(currentVersion);
const versionLabel = `v${nextVersion.join(".")}`;

rpManifest.header.version = nextVersion;
rpManifest.header.name = `${basePackName(rpManifest.header.name)} ${versionLabel}`;
rpManifest.header.description = versionedDescription(rpManifest.header.description, versionLabel);

for (const module of rpManifest.modules ?? []) {
  module.version = nextVersion;
}

bpManifest.header.version = nextVersion;
bpManifest.header.name = `${basePackName(bpManifest.header.name)} ${versionLabel}`;
bpManifest.header.description = versionedDescription(bpManifest.header.description, versionLabel);

for (const module of bpManifest.modules ?? []) {
  module.version = nextVersion;
}

const resourceDependency = (bpManifest.dependencies ?? []).find(
  (dependency) => dependency.uuid === rpManifest.header.uuid
);

if (!resourceDependency) {
  throw new Error(`BP manifest does not depend on RP UUID ${rpManifest.header.uuid}`);
}

resourceDependency.version = nextVersion;

writeJson(rpManifestPath, rpManifest);
writeJson(bpManifestPath, bpManifest);
writeFileSync(packVersionPath, `export const PACK_VERSION = "${versionLabel}";\n`);

console.log(`RP version bumped to ${nextVersion.join(".")}`);
console.log(`BP version bumped to ${nextVersion.join(".")}`);
console.log("BP resource dependency aligned.");
