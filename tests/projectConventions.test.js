import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function walkFiles(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath, extension);
    return fullPath.endsWith(extension) ? [fullPath] : [];
  });
}

function read(path) {
  return readFileSync(path, "utf8");
}

describe("Project conventions", () => {
  it("keeps Dynamic Property access inside SaveSystem only", () => {
    const offenders = walkFiles("src/scripts", ".ts").filter((file) => {
      if (file.endsWith(join("save", "SaveSystem.ts"))) return false;
      const source = read(file);
      return /\.getDynamicProperty\(|\.setDynamicProperty\(/.test(source);
    });

    assert.deepEqual(offenders, []);
  });

  it("does not import removed DynamicPropertiesDefinition runtime API", () => {
    const source = read("src/scripts/save/SaveSystem.ts");
    const builtSource = read("BP/scripts/save/SaveSystem.js");

    assert.doesNotMatch(source, /import\s+\{[^}]*DynamicPropertiesDefinition/);
    assert.doesNotMatch(builtSource, /DynamicPropertiesDefinition/);
  });

  it("does not use structuredClone in Bedrock runtime scripts", () => {
    const offenders = walkFiles("src/scripts", ".ts").filter((file) => read(file).includes("structuredClone"));

    assert.deepEqual(offenders, []);
  });

  it("keeps Rochatus Azurion rewards in the loot table only", () => {
    const lootTable = JSON.parse(read("BP/loot_tables/entities/rochatus.json"));
    const lootEntry = lootTable.pools[0].entries[0];
    const source = read("src/scripts/combat/PlayerStatsSystem.ts");

    assert.equal(lootEntry.name, "exile:azurion");
    assert.equal(lootEntry.functions.find((fn) => fn.function === "set_count")?.count, 6);
    assert.doesNotMatch(source, /give\s+@s\s+exile:azurion/);
    assert.doesNotMatch(source, /Azurion gained\./);
  });

  it("uses required Rochatus boss FSM states", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    for (const state of ["IDLE", "COMBAT", "STAGGER", "DEAD"]) {
      assert.match(source, new RegExp(`\\b${state}\\b`), `Missing state ${state}`);
    }
  });

  it("does not call world.getAllPlayers inside Rochatus per-tick update", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const updateBossesBody = source.match(/updateBosses\(\): void \{([\s\S]*?)\n  \}/)?.[1] ?? "";

    assert.doesNotMatch(updateBossesBody, /world\.getAllPlayers\(/);
  });
});
