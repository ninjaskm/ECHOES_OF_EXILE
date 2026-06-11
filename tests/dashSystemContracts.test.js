import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertOrdered(source, patterns) {
  let cursor = 0;

  for (const pattern of patterns) {
    const match = source.slice(cursor).match(pattern);
    assert.ok(match, `Expected to find ${pattern} after offset ${cursor}`);
    cursor += match.index + match[0].length;
  }
}

describe("DashSystem Bedrock contracts", () => {
  it("uses the latest stable server API version available in the tested Bedrock runtime", () => {
    const manifest = JSON.parse(read("BP/manifest.json"));
    const serverDependency = manifest.dependencies.find(
      (dependency) => dependency.module_name === "@minecraft/server"
    );

    assert.equal(serverDependency?.version, "2.7.0");
  });

  it("keeps feather dash as a fallback input", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /world\.afterEvents\.itemUse\.subscribe/);
    assert.match(source, /if \(itemStack\.typeId !== "minecraft:feather"\) return;/);
    assert.match(source, /this\.tryDash\(source as Player\);/);
  });

  it("polls jump state frequently without relying on playerButtonInput events", () => {
    const source = read("src/scripts/combat/DashSystem.ts");
    const typeSource = read("src/types/minecraft-server.d.ts");

    assert.match(source, /const DOUBLE_JUMP_DASH_WINDOW_TICKS = 10;/);
    assert.match(source, /const JUMP_POLL_INTERVAL_TICKS = 2;/);
    assert.match(source, /private readonly previousJumpStates = new Map<string, boolean>\(\);/);
    assert.match(source, /tickManager\.every\(JUMP_POLL_INTERVAL_TICKS, \(\) => this\.pollJumpDashInput\(\)\);/);
    assert.doesNotMatch(source, /playerButtonInput/);
    assert.match(typeSource, /readonly isJumping: boolean;/);
  });

  it("reports double-jump input diagnostics while the feature is being verified", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /initialize\(\{ eventBus, tickManager \}: SystemContext\): void/);
    assert.match(source, /tickManager\.every\(20, \(\) => this\.showInputDiagnostics\(\)\);/);
    assert.match(source, /Double jump dash polling active/);
    assert.match(source, /Jump input received/);
  });

  it("only attempts double-jump dash on the first tick a player starts jumping", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /for \(const player of world\.getAllPlayers\(\)\) \{/,
      /const wasJumping = this\.previousJumpStates\.get\(player\.id\) \?\? false;/,
      /const isJumping = player\.isJumping;/,
      /this\.previousJumpStates\.set\(player\.id, isJumping\);/,
      /if \(!isJumping \|\| wasJumping\) continue;/,
      /this\.tryDoubleJumpDash\(player\);/
    ]);
  });

  it("triggers dash only when the second jump is inside the short window", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /const lastJumpTick = this\.lastJumpTicks\.get\(player\.id\);/,
      /if \(lastJumpTick !== undefined && now - lastJumpTick <= DOUBLE_JUMP_DASH_WINDOW_TICKS\) \{/,
      /this\.lastJumpTicks\.delete\(player\.id\);/,
      /this\.tryDash\(player\);/,
      /return;/,
      /this\.lastJumpTicks\.set\(player\.id, now\);/
    ]);
  });

  it("only triggers dash from feather use by players", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /world\.afterEvents\.itemUse\.subscribe/);
    assert.match(source, /if \(source\.typeId !== "minecraft:player"\) return;/);
    assert.match(source, /if \(itemStack\.typeId !== "minecraft:feather"\) return;/);
    assert.match(source, /this\.tryDash\(source as Player\);/);
  });

  it("shows feedback without spending resources when dash is blocked", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /if \(!result\.ok && result\.reason === "cooldown"\) \{/,
      /player\.onScreenDisplay\.setActionBar\("Dash cooling down"\);/,
      /return false;/
    ]);
    assertOrdered(source, [
      /if \(!result\.ok && result\.reason === "not_enough_mana"\) \{/,
      /player\.playSound\("note\.bass"\);/,
      /player\.onScreenDisplay\.setActionBar\("Not enough mana"\);/,
      /return false;/
    ]);
  });

  it("applies movement, brief hidden resistance, and sound on successful dash", () => {
    const source = read("src/scripts/combat/DashSystem.ts");
    const builtSource = read("BP/scripts/combat/DashSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.match(candidate, /const DASH_POWER = 2\.2;/);
      assert.match(candidate, /applyKnockbackSafe\(player, view\.x, view\.z, DASH_POWER, 0\.15\);/);
      assert.match(candidate, /player\.addEffect\("resistance", 10, \{ amplifier: 4, showParticles: false \}\);/);
      assert.match(candidate, /player\.playSound\("mob\.endermen\.portal"\);/);
    }
  });

  it("persists dash resource changes before publishing player stats updates", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /stats\.mana = result\.mana;/,
      /stats\.dashCooldownUntil = result\.dashCooldownUntil;/,
      /saveSystem\.setPlayerStats\(player, stats\);/,
      /this\.eventBus\.publish\("player:statsChanged", \{ player, stats \}\);/,
      /return true;/
    ]);
  });
});
