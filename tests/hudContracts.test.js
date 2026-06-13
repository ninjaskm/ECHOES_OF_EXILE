import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

describe("HUD contracts", () => {
  it("formats actionbar resources as a compact hotbar-sized HUD", () => {
    const source = read("src/scripts/ui/HudSystem.ts");

    assert.match(source, /const HUD_BAR_SEGMENTS = 8;/);
    assert.match(source, /function formatResourceBar\(current: number, max: number, segments = HUD_BAR_SEGMENTS\): string/);
    assert.match(source, /const percent = max > 0 \? Math\.max\(0, Math\.min\(1, current \/ max\)\) : 0;/);
    assert.match(source, /const filled = Math\.round\(percent \* segments\);/);
    assert.match(source, /function formatPercent\(current: number, max: number\): string/);
    assert.match(source, /`\$\{Math\.round\(percent \* 100\)\}%`/);
    assert.match(source, /`HP\[\$\{healthBar\}\]\$\{formatPercent\(currentHealth, maxHealth\)\}/);
    assert.match(source, /MP\[\$\{manaBar\}\]\$\{formatPercent\(stats\.mana, stats\.maxMana\)\}/);
    assert.match(source, /XP\[\$\{xpBar\}\]\$\{formatPercent\(stats\.xp, xpNext\)\}/);
    assert.match(source, /LV\$\{stats\.level\} AP\$\{stats\.attributePoints\}`/);
    assert.doesNotMatch(source, /MANA/);
    assert.doesNotMatch(source, /healthValue/);
    assert.doesNotMatch(source, /\$\{Math\.floor\(stats\.mana\)\}\/\$\{stats\.maxMana\}/);
    assert.doesNotMatch(source, /"\|"\.repeat/);
    assert.doesNotMatch(source, /"\."\.repeat/);
  });

  it("reads player health for the HP bar without touching Dynamic Properties directly", () => {
    const source = read("src/scripts/ui/HudSystem.ts");

    assert.match(source, /const health = player\.getComponent\("minecraft:health"\);/);
    assert.match(source, /const currentHealth = health \? Math\.max\(0, Math\.floor\(health\.currentValue\)\) : 0;/);
    assert.match(source, /const maxHealth = health \? Math\.max\(1, Math\.floor\(health\.effectiveMax\)\) : 1;/);
    assert.doesNotMatch(source, /getDynamicProperty/);
    assert.doesNotMatch(source, /setDynamicProperty/);
  });
});
