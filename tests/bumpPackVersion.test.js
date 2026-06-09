import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("bump pack version script", () => {
  it("bumps both packs to the same visible patch version and aligns dependencies", () => {
    const workspace = mkdtempSync(join(tmpdir(), "echoes-pack-version-"));

    try {
      mkdirSync(join(workspace, "RP"));
      mkdirSync(join(workspace, "BP"));
      mkdirSync(join(workspace, "src", "scripts", "ui"), { recursive: true });

      const rpManifest = readJson("RP/manifest.json");
      const bpManifest = readJson("BP/manifest.json");

      rpManifest.header.name = "Echoes of Exile MVP RP";
      rpManifest.header.description = "Resource Pack MVP for Echoes of Exile.";
      rpManifest.header.version = [0, 1, 4];
      rpManifest.modules[0].version = [0, 1, 4];
      bpManifest.header.name = "Echoes of Exile MVP BP";
      bpManifest.header.description = "Behavior Pack MVP for Echoes of Exile.";
      bpManifest.header.version = [0, 1, 4];
      bpManifest.modules[0].version = [0, 1, 4];
      bpManifest.modules[1].version = [0, 1, 4];
      bpManifest.dependencies.find(
        (dependency) => dependency.uuid === rpManifest.header.uuid
      ).version = [0, 1, 4];

      writeJson(join(workspace, "RP", "manifest.json"), rpManifest);
      writeJson(join(workspace, "BP", "manifest.json"), bpManifest);
      writeFileSync(join(workspace, "src", "scripts", "ui", "packVersion.ts"), 'export const PACK_VERSION = "v0.1.4";\n');

      const output = execFileSync(
        process.execPath,
        ["scripts/bump-pack-version.js", "--root", workspace],
        { encoding: "utf8" }
      );

      const bumpedRpManifest = readJson(join(workspace, "RP", "manifest.json"));
      const bumpedBpManifest = readJson(join(workspace, "BP", "manifest.json"));
      const packVersionSource = readFileSync(
        join(workspace, "src", "scripts", "ui", "packVersion.ts"),
        "utf8"
      );
      const resourceDependency = bumpedBpManifest.dependencies.find(
        (dependency) => dependency.uuid === bumpedRpManifest.header.uuid
      );

      assert.deepEqual(bumpedRpManifest.header.version, [0, 1, 5]);
      assert.deepEqual(bumpedRpManifest.modules[0].version, [0, 1, 5]);
      assert.deepEqual(bumpedBpManifest.header.version, [0, 1, 5]);
      assert.deepEqual(bumpedBpManifest.modules[0].version, [0, 1, 5]);
      assert.deepEqual(bumpedBpManifest.modules[1].version, [0, 1, 5]);
      assert.deepEqual(resourceDependency.version, [0, 1, 5]);
      assert.equal(bumpedRpManifest.header.name, "Echoes of Exile MVP RP v0.1.5");
      assert.equal(bumpedBpManifest.header.name, "Echoes of Exile MVP BP v0.1.5");
      assert.match(bumpedRpManifest.header.description, /v0\.1\.5/);
      assert.match(bumpedBpManifest.header.description, /v0\.1\.5/);
      assert.equal(packVersionSource, 'export const PACK_VERSION = "v0.1.5";\n');
      assert.match(output, /RP version bumped to 0\.1\.5/);
      assert.match(output, /BP version bumped to 0\.1\.5/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
