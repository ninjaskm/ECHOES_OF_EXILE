import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;

function readZipEntries(path) {
  const buffer = readFileSync(path);
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
      eocdOffset = offset;
      break;
    }
  }

  assert.notEqual(eocdOffset, -1, `${path} is missing the zip end record`);

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(
      buffer.readUInt32LE(offset),
      ZIP_CENTRAL_DIRECTORY_SIGNATURE,
      `${path} has an invalid central directory entry`
    );

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(nameStart, nameEnd).toString("utf8");

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      localHeaderOffset
    });
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function readZipText(path, entryName) {
  const buffer = readFileSync(path);
  const entry = readZipEntries(path).find((candidate) => candidate.name === entryName);

  assert.ok(entry, `${path} is missing ${entryName}`);
  assert.equal(
    buffer.readUInt32LE(entry.localHeaderOffset),
    ZIP_LOCAL_FILE_SIGNATURE,
    `${path} has an invalid local header for ${entryName}`
  );

  const localNameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
  const localExtraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + localNameLength + localExtraLength;
  const compressedData = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressedData.toString("utf8");
  if (entry.compressionMethod === 8) return inflateRawSync(compressedData).toString("utf8");

  assert.fail(`${path} uses unsupported compression method ${entry.compressionMethod}`);
}

function assertBedrockPack(path, expectedModuleType) {
  const entries = readZipEntries(path);
  const entryNames = entries.map((entry) => entry.name);
  const manifest = JSON.parse(readZipText(path, "manifest.json"));

  assert.ok(entryNames.includes("manifest.json"), `${path} must have manifest.json at the zip root`);
  assert.equal(typeof manifest.header.name, "string");
  assert.equal(typeof manifest.header.description, "string");
  assert.equal(typeof manifest.header.uuid, "string");
  assert.ok(Array.isArray(manifest.header.version));
  assert.ok(
    manifest.modules.some((module) => module.type === expectedModuleType),
    `${path} must include a ${expectedModuleType} module`
  );

  assert.deepEqual(
    entryNames.filter((entry) => entry.includes("\\")),
    [],
    `${path} zip paths must use forward slashes`
  );
}

function readManifest(path) {
  return JSON.parse(readZipText(path, "manifest.json"));
}

describe("Bedrock pack archives", () => {
  it("packages the resource pack with a root manifest and Bedrock-compatible paths", () => {
    assertBedrockPack("EchoesOfExile_RP.mcpack", "resources");
  });

  it("packages the behavior pack with a root manifest and Bedrock-compatible paths", () => {
    assertBedrockPack("EchoesOfExile_BP.mcpack", "script");
  });

  it("keeps the behavior pack resource dependency aligned with the resource pack version", () => {
    const resourceManifest = readManifest("EchoesOfExile_RP.mcpack");
    const behaviorManifest = readManifest("EchoesOfExile_BP.mcpack");
    const resourceDependency = behaviorManifest.dependencies.find(
      (dependency) => dependency.uuid === resourceManifest.header.uuid
    );

    assert.ok(resourceDependency, "Behavior pack must depend on the resource pack UUID");
    assert.deepEqual(resourceDependency.version, resourceManifest.header.version);
  });

  it("packages the behavior pack with the supported server API dependency set", () => {
    const behaviorManifest = readManifest("EchoesOfExile_BP.mcpack");
    const serverDependency = behaviorManifest.dependencies.find(
      (dependency) => dependency.module_name === "@minecraft/server"
    );
    const serverUiDependency = behaviorManifest.dependencies.find(
      (dependency) => dependency.module_name === "@minecraft/server-ui"
    );

    assert.equal(serverDependency?.version, "2.7.0");
    assert.equal(serverUiDependency, undefined);
  });

  it("keeps the in-game report version aligned with the behavior pack version", () => {
    const behaviorManifest = readManifest("EchoesOfExile_BP.mcpack");
    const reportVersionSource = readFileSync("BP/scripts/ui/packVersion.js", "utf8");
    const versionLabel = `v${behaviorManifest.header.version.join(".")}`;

    assert.match(reportVersionSource, new RegExp(`PACK_VERSION = "${versionLabel}"`));
  });
});
