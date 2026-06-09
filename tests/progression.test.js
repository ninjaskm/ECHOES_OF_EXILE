import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addXp,
  createDefaultPlayerStats,
  getXpToNextLevel
} from "../BP/scripts/combat/progression.js";

describe("MVP progression rules", () => {
  it("adds XP without leveling when the threshold is not reached", () => {
    const stats = createDefaultPlayerStats();

    const result = addXp(stats, 20);

    assert.equal(result.level, 1);
    assert.equal(result.xp, 20);
    assert.equal(result.attributePoints, 0);
  });

  it("levels up and grants one attribute point when the threshold is reached", () => {
    const stats = createDefaultPlayerStats();

    const result = addXp(stats, getXpToNextLevel(1));

    assert.equal(result.level, 2);
    assert.equal(result.xp, 0);
    assert.equal(result.attributePoints, 1);
  });

  it("does not mutate the original stats object when adding XP", () => {
    const stats = createDefaultPlayerStats();

    const result = addXp(stats, getXpToNextLevel(1));

    assert.notEqual(result, stats);
    assert.equal(stats.level, 1);
    assert.equal(stats.xp, 0);
    assert.equal(stats.attributePoints, 0);
  });

  it("respects the MVP level cap of 20", () => {
    const stats = {
      ...createDefaultPlayerStats(),
      level: 20,
      xp: 0,
      attributePoints: 19
    };

    const result = addXp(stats, 999999);

    assert.equal(result.level, 20);
    assert.equal(result.attributePoints, 19);
  });
});
