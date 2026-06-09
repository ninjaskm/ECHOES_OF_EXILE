import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatExileReport } from "../BP/scripts/ui/report.js";

describe("Exile report", () => {
  it("formats a compact copy-friendly MVP report", () => {
    const lines = formatExileReport({
      packVersion: "v0.1.5",
      playerName: "Steve",
      stats: {
        schemaVersion: 1,
        level: 3,
        xp: 25,
        attributePoints: 2,
        attributes: {
          vit: 4,
          str: 5,
          spd: 1,
          dex: 1,
          manaRegen: 1
        },
        mana: 147.8,
        maxMana: 220,
        dashCooldownUntil: 0
      },
      bossesKilled: ["rochatus"]
    });

    assert.deepEqual(lines, [
      "[ECHOES REPORT v0.1.5]",
      "player=Steve level=3/20 xp=25 ap=2",
      "mana=147/220 vit=4 str=5 spd=1 dex=1 regen=1",
      "bosses=rochatus"
    ]);
  });

  it("prints none when no bosses were defeated", () => {
    const lines = formatExileReport({
      packVersion: "v0.1.5",
      playerName: "Alex",
      stats: {
        schemaVersion: 1,
        level: 1,
        xp: 0,
        attributePoints: 0,
        attributes: {
          vit: 1,
          str: 1,
          spd: 1,
          dex: 1,
          manaRegen: 1
        },
        mana: 200,
        maxMana: 200,
        dashCooldownUntil: 0
      },
      bossesKilled: []
    });

    assert.equal(lines.at(-1), "bosses=none");
  });
});
