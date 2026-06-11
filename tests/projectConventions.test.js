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

  it("keeps Rochatus Azurion rewards as a ground drop from the entity loot table", () => {
    const entity = JSON.parse(read("BP/entities/rochatus.json"));
    const source = read("src/scripts/combat/PlayerStatsSystem.ts");
    const builtSource = read("BP/scripts/combat/PlayerStatsSystem.js");

    assert.deepEqual(entity["minecraft:entity"].components["minecraft:loot"], {
      table: "loot_tables/entities/rochatus.json"
    });
    assert.doesNotMatch(source, /loot spawn .*loot_tables\/entities\/rochatus\.json/);
    assert.doesNotMatch(builtSource, /loot spawn .*loot_tables\/entities\/rochatus\.json/);
    assert.doesNotMatch(source, /give\s+@s\s+exile:azurion\s+6/);
    assert.doesNotMatch(builtSource, /give\s+@s\s+exile:azurion\s+6/);
    assert.doesNotMatch(source, /Azurion dropped\./);
    assert.doesNotMatch(builtSource, /Azurion dropped\./);
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

  it("does not use unsupported projectile damage cause in Rochatus attacks", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const builtSource = read("BP/scripts/bosses/rochatus/RochatusSystem.js");

    assert.doesNotMatch(source, /cause:\s*"projectile"/);
    assert.doesNotMatch(builtSource, /cause:\s*"projectile"/);
  });

  it("uses the stable Entity.isValid property instead of removed isValid function calls", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const builtSource = read("BP/scripts/bosses/rochatus/RochatusSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /\.isValid\(\)/);
      assert.match(candidate, /!ctx\.target\.isValid/);
      assert.match(candidate, /!entry\.boss\.isValid/);
    }
  });

  it("does not declare @minecraft/server-ui unless runtime scripts import it", () => {
    const manifest = JSON.parse(read("BP/manifest.json"));
    const runtimeSources = walkFiles("src/scripts", ".ts").map(read).join("\n");
    const importsServerUi = runtimeSources.includes("@minecraft/server-ui");
    const declaresServerUi = (manifest.dependencies ?? []).some(
      (dependency) => dependency.module_name === "@minecraft/server-ui"
    );

    assert.equal(declaresServerUi, importsServerUi);
  });
});
