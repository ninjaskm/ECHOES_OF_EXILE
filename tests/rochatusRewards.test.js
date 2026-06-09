import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("Rochatus rewards", () => {
  it("drops six Azurion from the boss loot table", () => {
    const lootTable = JSON.parse(readFileSync("BP/loot_tables/entities/rochatus.json", "utf8"));
    const azurionEntry = lootTable.pools[0].entries[0];
    const setCount = azurionEntry.functions.find((fn) => fn.function === "set_count");

    assert.equal(azurionEntry.name, "exile:azurion");
    assert.equal(setCount.count, 6);
  });

  it("does not give Azurion from the boss reward script", () => {
    const source = readFileSync("src/scripts/combat/PlayerStatsSystem.ts", "utf8");

    assert.doesNotMatch(source, /give\s+@s\s+exile:azurion/);
    assert.match(source, /Boss defeated: \$\{bossId\}\./);
  });
});
