import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("development pack linking", () => {
  it("exposes dev:link and dev scripts for the fast Bedrock workflow", () => {
    const packageJson = readJson("package.json");

    assert.equal(packageJson.scripts["dev:link"], "node scripts/link-dev-packs.js");
    assert.equal(packageJson.scripts.dev, "npm run build");
  });

  it("links BP and RP into Bedrock development pack directories", () => {
    const workspace = mkdtempSync(join(tmpdir(), "echoes-dev-link-workspace-"));
    const mojangRoot = mkdtempSync(join(tmpdir(), "echoes-dev-link-mojang-"));

    try {
      const bpSource = join(workspace, "BP");
      const rpSource = join(workspace, "RP");
      mkdirSync(bpSource);
      mkdirSync(rpSource);
      writeFileSync(join(bpSource, "manifest.json"), "{}\n");
      writeFileSync(join(rpSource, "manifest.json"), "{}\n");

      const output = execFileSync(
        process.execPath,
        ["scripts/link-dev-packs.js", "--root", workspace, "--mojang-root", mojangRoot],
        { encoding: "utf8" }
      );

      const bpLink = join(mojangRoot, "development_behavior_packs", "EchoesOfExile_BP_DEV");
      const rpLink = join(mojangRoot, "development_resource_packs", "EchoesOfExile_RP_DEV");

      assert.ok(existsSync(bpLink), "BP dev link should exist");
      assert.ok(existsSync(rpLink), "RP dev link should exist");
      assert.equal(realpathSync(bpLink), realpathSync(bpSource));
      assert.equal(realpathSync(rpLink), realpathSync(rpSource));
      assert.match(output, /Linked BP .*EchoesOfExile_BP_DEV/);
      assert.match(output, /Linked RP .*EchoesOfExile_RP_DEV/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
      rmSync(mojangRoot, { recursive: true, force: true });
    }
  });
});
