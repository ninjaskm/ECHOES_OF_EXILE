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
    const azurionEntry = lootTable.pools[0].entries[0];
    const setCount = azurionEntry.functions.find((fn) => fn.function === "set_count");

    assert.equal(azurionEntry.name, "exile:azurion");
    assert.equal(setCount.count, 6);
  });
});
