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

  it("does not keep feather dash as a fallback input", () => {
    const source = read("src/scripts/combat/DashSystem.ts");
    const builtSource = read("BP/scripts/combat/DashSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /world\.afterEvents\.itemUse\.subscribe/);
      assert.doesNotMatch(candidate, /minecraft:feather/);
      assert.doesNotMatch(candidate, /itemStack\.typeId/);
    }
  });

  it("polls jump state frequently without relying on playerButtonInput events", () => {
    const source = read("src/scripts/combat/DashSystem.ts");
    const rulesSource = read("src/scripts/combat/dashRules.ts");
    const typeSource = read("src/types/minecraft-server.d.ts");

    assert.match(rulesSource, /export const DOUBLE_JUMP_DASH_WINDOW_TICKS = 10;/);
    assert.match(source, /const JUMP_POLL_INTERVAL_TICKS = 1;/);
    assert.match(source, /private readonly previousJumpStates = new Map<string, boolean>\(\);/);
    assert.match(source, /tickManager\.every\(JUMP_POLL_INTERVAL_TICKS, \(\) => this\.pollJumpDashInput\(\)\);/);
    assert.doesNotMatch(source, /playerButtonInput/);
    assert.match(typeSource, /readonly isJumping: boolean;/);
  });

  it("samples jump input every tick so fast double taps are not missed", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /const JUMP_POLL_INTERVAL_TICKS = 1;/);
    assert.match(source, /tickManager\.every\(JUMP_POLL_INTERVAL_TICKS, \(\) => this\.pollJumpDashInput\(\)\);/);
    assert.match(source, /tickManager\.every\(JUMP_POLL_INTERVAL_TICKS, \(\) => this\.updateDashCooldownHud\(\)\);/);
  });

  it("reports double-jump input diagnostics while the feature is being verified", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /initialize\(\{ eventBus, tickManager \}: SystemContext\): void/);
    assert.match(source, /tickManager\.every\(20, \(\) => this\.showInputDiagnostics\(\)\);/);
    assert.match(source, /Double jump dash polling active/);
    assert.match(source, /updateDashHud\(player, 0, jumpInput\.displayedTickGap\);/);
  });

  it("keeps dash feedback out of the character actionbar and uses a sidebar HUD", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.doesNotMatch(source, /onScreenDisplay\.setActionBar\([^)]*Jump input received/);
    assert.doesNotMatch(source, /onScreenDisplay\.setActionBar\("Dash cooling down"\)/);
    assert.doesNotMatch(source, /onScreenDisplay\.setActionBar\("Not enough mana"\)/);
    assert.match(source, /const DASH_HUD_OBJECTIVE = "exile_dash";/);
    assert.match(source, /scoreboard objectives add \$\{DASH_HUD_OBJECTIVE\} dummy "Dash"/);
    assert.match(source, /scoreboard objectives setdisplay sidebar \$\{DASH_HUD_OBJECTIVE\}/);
    assert.match(source, /updateDashHud\(player, Math\.max\(0, result\.dashCooldownUntil - now\)\);/);
    assert.doesNotMatch(source, /updateDashHud\(player, "Jump"/);
    assert.doesNotMatch(source, /updateDashHud\(player, "Ready"/);
    assert.doesNotMatch(source, /updateDashHud\(player, "NoMana"/);
  });

  it("keeps a stable dash sidebar with cooldown and tick rows only", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /private updateDashHud\(player: Player, cooldownTicks: number, missedTickGap\?: number\): void/);
    assert.match(source, /const cooldownLabel = `Cooldown \$\{Math\.floor\(cooldownTicks\)\}`;/);
    assert.match(source, /const tickLabel = `Tick \$\{Math\.floor\(tickScore\)\}`;/);
    assert.match(source, /scoreboard players set "\$\{cooldownLabel\}" \$\{DASH_HUD_OBJECTIVE\} 2/);
    assert.match(source, /scoreboard players set "\$\{tickLabel\}" \$\{DASH_HUD_OBJECTIVE\} 1/);
    assert.match(source, /this\.updateDashHud\(player, Math\.max\(0, result\.dashCooldownUntil - now\)\);/);
    assert.match(source, /this\.updateDashHud\(player, 0\);/);
    assert.match(source, /this\.updateDashHud\(player, 0, jumpInput\.displayedTickGap\);/);
    assert.match(source, /const tickScore = missedTickGap === undefined \? this\.lastDisplayedTickGap\.get\(player\.id\) \?\? 0 : missedTickGap;/);
    assert.doesNotMatch(source, /updateDashHud\(player, "Jump"/);
    assert.doesNotMatch(source, /Ready/);
    assert.doesNotMatch(source, /NoMana/);
  });

  it("refreshes the dash sidebar so cooldown counts down to ready", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assert.match(source, /tickManager\.every\(JUMP_POLL_INTERVAL_TICKS, \(\) => this\.updateDashCooldownHud\(\)\);/);
    assert.match(source, /private updateDashCooldownHud\(\): void/);
    assert.match(source, /const remainingCooldown = Math\.max\(0, stats\.dashCooldownUntil - now\);/);
    assert.match(source, /if \(remainingCooldown > 0\) \{/);
    assert.match(source, /this\.updateDashHud\(player, remainingCooldown\);/);
    assert.match(source, /this\.updateDashHud\(player, 0\);/);
  });

  it("updates the displayed tick gap only on a real second-jump attempt", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /const lastJumpTick = this\.lastJumpTicks\.get\(player\.id\);/,
      /const jumpInput = resolveDoubleJumpDashInput\(\{ currentTick: now, lastJumpTick \}\);/,
      /if \(jumpInput\.displayedTickGap !== undefined\) \{/,
      /this\.updateDashHud\(player, 0, jumpInput\.displayedTickGap\);/,
      /}/
    ]);
    assert.doesNotMatch(source, /this\.updateDashHud\(player, 0, jumpInput\.displayedTickGap\);\s*\n\s*if \(jumpInput\.nextLastJumpTick/);
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
    const rulesSource = read("src/scripts/combat/dashRules.ts");

    assertOrdered(source, [
      /const lastJumpTick = this\.lastJumpTicks\.get\(player\.id\);/,
      /const jumpInput = resolveDoubleJumpDashInput\(\{ currentTick: now, lastJumpTick \}\);/,
      /if \(jumpInput\.shouldDash\) \{/,
      /this\.lastJumpTicks\.delete\(player\.id\);/,
      /this\.tryDash\(player\);/,
      /return;/
    ]);
    assert.match(rulesSource, /tickGap <= DOUBLE_JUMP_DASH_WINDOW_TICKS/);
  });

  it("resets the displayed tick gap when a double-jump dash succeeds", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /if \(jumpInput\.shouldDash\) \{/,
      /this\.lastJumpTicks\.delete\(player\.id\);/,
      /this\.lastDisplayedTickGap\.set\(player\.id, 0\);/,
      /this\.tryDash\(player\);/,
      /return;/
    ]);
  });

  it("only triggers dash from double-jump input", () => {
    const source = read("src/scripts/combat/DashSystem.ts");
    const builtSource = read("BP/scripts/combat/DashSystem.js");

    assert.match(source, /private tryDoubleJumpDash\(player: Player\): void/);
    assert.match(source, /this\.tryDash\(player\);/);

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /source\.typeId !== "minecraft:player"/);
      assert.doesNotMatch(candidate, /itemStack\.typeId !== "minecraft:feather"/);
      assert.doesNotMatch(candidate, /this\.tryDash\(source as Player\)/);
    }
  });

  it("shows feedback without spending resources when dash is blocked", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /if \(!result\.ok && result\.reason === "cooldown"\) \{/,
      /this\.updateDashHud\(player, Math\.max\(0, result\.dashCooldownUntil - now\)\);/,
      /return false;/
    ]);
    assertOrdered(source, [
      /if \(!result\.ok && result\.reason === "not_enough_mana"\) \{/,
      /player\.playSound\("note\.bass"\);/,
      /this\.updateDashHud\(player, 0\);/,
      /return false;/
    ]);
  });

  it("shows cooldown immediately after a successful dash", () => {
    const source = read("src/scripts/combat/DashSystem.ts");

    assertOrdered(source, [
      /stats\.dashCooldownUntil = result\.dashCooldownUntil;/,
      /saveSystem\.setPlayerStats\(player, stats\);/,
      /this\.eventBus\.publish\("player:statsChanged", \{ player, stats \}\);/,
      /this\.updateDashHud\(player, DASH_COOLDOWN_TICKS\);/,
      /return true;/
    ]);
    assert.doesNotMatch(source, /this\.updateDashHud\(player, 0\);\s*return true;/);
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
