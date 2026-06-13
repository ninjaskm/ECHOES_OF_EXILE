import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function currentVersionLabel() {
  const manifest = JSON.parse(read("BP/manifest.json"));
  return `v${manifest.header.version.join(".")}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("documentation contracts", () => {
  it("documents the current MVP pack version in the main handoff docs", () => {
    const versionLabel = currentVersionLabel();
    const docs = [
      "README.md",
      "CHANGELOG.md",
      "docs/project-summary.md",
      "docs/TESTING.md",
      "docs/MVP/README.md",
      "docs/MVP/BEDROCK_TEST_CHECKLIST.md"
    ];

    for (const path of docs) {
      assert.match(read(path), new RegExp(versionLabel.replaceAll(".", "\\.")), `${path} must mention ${versionLabel}`);
    }
  });

  it("does not document removed or unstable Bedrock APIs as current architecture", () => {
    const docs = [
      "docs/ARCHITECTURE.md",
      "docs/TESTING.md",
      "docs/MVP/README.md",
      "docs/MVP/BEDROCK_TEST_CHECKLIST.md",
      "docs/project-summary.md"
    ];
    const stalePatterns = [
      /worldInitialize/,
      /runCommandAsync/,
      /\.isValid\(\)/,
      /@minecraft\/server-ui/,
      /@minecraft\/server`\s*\|\s*`1\.13\.0`/,
      /Vers[aã]o atual\s*\|\s*`\[0,\s*1,\s*0\]`/
    ];

    for (const path of docs) {
      const content = read(path);
      for (const pattern of stalePatterns) {
        assert.doesNotMatch(content, pattern, `${path} still documents stale API ${pattern}`);
      }
    }
  });

  it("documents the validated Bedrock runtime compatibility decisions", () => {
    const architecture = read("docs/ARCHITECTURE.md");

    assert.match(architecture, /system\.run/);
    assert.match(architecture, /@minecraft\/server`\s*\|\s*`2\.7\.0`/);
    assert.match(architecture, /Entity\.isValid/);
    assert.match(architecture, /Dimension\.spawnParticle/);
    assert.match(architecture, /applyKnockback/);
  });

  it("documents the full manual MVP validation checklist", () => {
    const checklist = read("docs/MVP/BEDROCK_TEST_CHECKLIST.md");

    for (const expected of [
      "Importar/confirmar",
      "/function exile_mvp_start",
      "Portal Shard",
      "vida atualizando",
      "drop + XP",
      "dash",
      "/function exile_reset_mvp",
      "sair e entrar no mundo"
    ]) {
      assert.match(checklist, new RegExp(escapeRegExp(expected), "i"));
    }
  });

  it("documents reusable boss architecture for future bosses", () => {
    const requiredDocs = [read("AGENTS.md"), read("docs/ARCHITECTURE.md")];

    for (const doc of requiredDocs) {
      assert.match(doc, /BaseBossSystem/);
      assert.match(doc, /BossAttack/);
      assert.match(doc, /RollAttack/);
      assert.match(doc, /SpikeWaveAttack/);
      assert.match(doc, /QuakeAttack/);
      assert.match(doc, /configura/i);
    }
  });
});
