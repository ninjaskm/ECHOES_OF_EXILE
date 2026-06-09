import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { grantDebugXp, DEBUG_XP_AMOUNT } from "../BP/scripts/ui/debugXp.js";
import { createDefaultPlayerStats } from "../BP/scripts/combat/progression.js";

describe("Debug XP command", () => {
  it("grants enough XP to level a default player and award AP", () => {
    const stats = createDefaultPlayerStats();

    const result = grantDebugXp(stats);

    assert.equal(DEBUG_XP_AMOUNT, 80);
    assert.equal(result.level, 2);
    assert.equal(result.xp, 0);
    assert.equal(result.attributePoints, 1);
  });

  it("is wired to a Bedrock function and script event", () => {
    const functionSource = readFileSync("BP/functions/exile_add_xp.mcfunction", "utf8");
    const commandSource = readFileSync("src/scripts/ui/DevCommandSystem.ts", "utf8");

    assert.equal(functionSource.trim(), "scriptevent exile:add_xp");
    assert.match(commandSource, /case "exile:add_xp":/);
  });
});
