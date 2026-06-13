import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("Rochatus rewards", () => {
  it("spawns six Azurion as a ground drop from the entity loot table", () => {
    const source = readFileSync("src/scripts/combat/PlayerStatsSystem.ts", "utf8");
    const builtSource = readFileSync("BP/scripts/combat/PlayerStatsSystem.js", "utf8");
    const entity = JSON.parse(readFileSync("BP/entities/rochatus.json", "utf8"));

    assert.deepEqual(entity["minecraft:entity"].components["minecraft:loot"], {
      table: "loot_tables/entities/rochatus.json"
    });
    assert.doesNotMatch(source, /loot spawn .*loot_tables\/entities\/rochatus\.json/);
    assert.doesNotMatch(builtSource, /loot spawn .*loot_tables\/entities\/rochatus\.json/);
    assert.doesNotMatch(source, /Azurion dropped\./);
    assert.doesNotMatch(builtSource, /Azurion dropped\./);
  });

  it("keeps the loot table entry at six Azurion", () => {
    const lootTable = JSON.parse(readFileSync("BP/loot_tables/entities/rochatus.json", "utf8"));
    const azurionPool = lootTable.pools.find((pool) => pool.entries.some((entry) => entry.name === "exile:azurion"));
    const azurionEntry = azurionPool?.entries.find((entry) => entry.name === "exile:azurion");
    const setCount = azurionEntry.functions.find((fn) => fn.function === "set_count");

    assert.equal(azurionPool.rolls, 1);
    assert.equal(azurionPool.entries.length, 1);
    assert.ok(azurionEntry);
    assert.equal(azurionEntry.name, "exile:azurion");
    assert.equal(setCount.count, 6);
  });

  it("defines Oricalum as a material item and adds it to Rochatus drops", () => {
    const item = JSON.parse(readFileSync("BP/items/materials/oricalum.json", "utf8"));
    const bpLang = readFileSync("BP/texts/en_US.lang", "utf8");
    const rpLang = readFileSync("RP/texts/en_US.lang", "utf8");
    const azurionTexture = readFileSync("RP/textures/items/azurion.png");
    const oricalumTexture = readFileSync("RP/textures/items/oricalum.png");
    const itemTexture = JSON.parse(readFileSync("RP/textures/item_texture.json", "utf8"));
    const constants = readFileSync("src/scripts/core/constants.ts", "utf8");
    const lootTable = JSON.parse(readFileSync("BP/loot_tables/entities/rochatus.json", "utf8"));
    const oricalumPool = lootTable.pools.find((pool) => pool.entries.some((entry) => entry.name === "exile:oricalum"));
    const oricalumEntry = oricalumPool?.entries.find((entry) => entry.name === "exile:oricalum");
    const setCount = oricalumEntry?.functions.find((fn) => fn.function === "set_count");

    assert.equal(item["minecraft:item"].description.identifier, "exile:oricalum");
    assert.equal(item["minecraft:item"].components["minecraft:icon"], "oricalum");
    assert.match(bpLang, /item\.exile:oricalum\.name=Oricalum/);
    assert.match(rpLang, /item\.exile:oricalum\.name=Oricalum/);
    assert.notDeepEqual(oricalumTexture, azurionTexture);
    assert.equal(itemTexture.texture_data.oricalum.textures, "textures/items/oricalum");
    assert.match(constants, /oricalum: `\$\{MOD_PREFIX\}:oricalum`/);
    assert.equal(oricalumPool.rolls, 1);
    assert.equal(oricalumPool.entries.length, 1);
    assert.ok(oricalumEntry);
    assert.equal(setCount.count, 20);
  });
});
