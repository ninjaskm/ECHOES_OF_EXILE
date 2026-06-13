import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

describe("reusable boss architecture contracts", () => {
  it("defines reusable boss base and attack primitives", () => {
    const expectedFiles = [
      "src/scripts/bosses/base/BaseBossSystem.ts",
      "src/scripts/bosses/base/BossAttack.ts",
      "src/scripts/bosses/attacks/RollAttack.ts",
      "src/scripts/bosses/attacks/SpikeWaveAttack.ts",
      "src/scripts/bosses/attacks/QuakeAttack.ts"
    ];

    for (const path of expectedFiles) {
      assert.ok(existsSync(path), `${path} should exist`);
    }

    assert.match(read("src/scripts/bosses/base/BaseBossSystem.ts"), /export\s+abstract\s+class\s+BaseBossSystem/);
    assert.match(read("src/scripts/bosses/base/BossAttack.ts"), /export\s+interface\s+BossAttack/);
    assert.match(read("src/scripts/bosses/attacks/RollAttack.ts"), /export\s+class\s+RollAttack/);
    assert.match(read("src/scripts/bosses/attacks/SpikeWaveAttack.ts"), /export\s+class\s+SpikeWaveAttack/);
    assert.match(read("src/scripts/bosses/attacks/QuakeAttack.ts"), /export\s+class\s+QuakeAttack/);
  });

  it("keeps Rochatus attacks wired through reusable attack classes", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /extends\s+BaseBossSystem/);
    assert.match(source, /new\s+RollAttack/);
    assert.match(source, /new\s+SpikeWaveAttack/);
    assert.match(source, /new\s+QuakeAttack/);
    assert.doesNotMatch(source, /updateRoll\(/);
    assert.doesNotMatch(source, /updateSpikes\(/);
    assert.doesNotMatch(source, /updateQuake\(/);
  });

  it("sets Rochatus base health for the current MVP tuning", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const BASE_HEALTH = 400;/);
    assert.match(source, /const scaledHealth = Math\.floor\(BASE_HEALTH \* \(1 \+ playerCount \* 0\.25\)\);/);
    assert.match(source, /try \{\s*health\?\.setCurrentValue\(scaledHealth\);/s);
    assert.match(source, /const currentHealth = health \? Math\.max\(0, Math\.floor\(health\.currentValue\)\) : scaledHealth;/);
    assert.match(source, /boss\.nameTag = `Rochatus \[\$\{currentHealth\} HP\]`;/);
  });

  it("locks RollAttack direction from the initial target position", () => {
    const source = read("src/scripts/bosses/attacks/RollAttack.ts");

    assert.match(source, /private readonly lockedDirections = new Map/);
    assert.match(source, /onEnter\(context: BossAttackContext\): void \{/);
    assert.match(source, /this\.lockedDirections\.set\(context\.boss\.id, \{ x: dir\.x, z: dir\.z \}\);/);
    assert.match(source, /const dir = this\.lockedDirections\.get\(context\.boss\.id\);/);
    assert.match(source, /private moveBossForward\(context: BossAttackContext, dir: \{ x: number; z: number \}\): void/);
    assert.match(source, /context\.boss\.runCommand\(`tp @s \$\{nextLocation\.x\} \$\{nextLocation\.y\} \$\{nextLocation\.z\}`\);/);
    assert.doesNotMatch(source, /applyKnockbackSafe/);
    assert.doesNotMatch(source, /onTick\(context: BossAttackContext\): void \{\s*if \(!context\.target\) return;\s*const dir = normalizeVector/s);
  });

  it("gates Rochatus specials with attack-specific intervals", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const ROLL_ATTACK_INTERVAL_TICKS = 150;/);
    assert.match(source, /const SPIKE_ATTACK_INTERVAL_TICKS = 150;/);
    assert.match(source, /const QUAKE_ATTACK_INTERVAL_TICKS = 150;/);
    assert.match(source, /attackAvailableTicks: Record<string, number>;/);
    assert.match(source, /attackIndex: -1,/);
    assert.match(source, /stepDistance: 0\.72,/);
    assert.match(source, /ctx\.attack = this\.selectNextAttack\(ctx\);/);
    assert.match(source, /availableAttacks\[Math\.floor\(Math\.random\(\) \* availableAttacks\.length\)\]/);
    assert.match(source, /currentTick >= \(context\.attackAvailableTicks\[attack\.id\] \?\? 0\)/);
    assert.match(source, /context\.attackAvailableTicks\[attack\.id\] = currentTick \+ this\.getAttackIntervalTicks\(attack\);/);
    assert.match(source, /if \(attack\.id === "roll"\) return ROLL_ATTACK_INTERVAL_TICKS;/);
    assert.match(source, /if \(attack\.id === "spikes"\) return SPIKE_ATTACK_INTERVAL_TICKS;/);
    assert.match(source, /if \(attack\.id === "quake"\) return QUAKE_ATTACK_INTERVAL_TICKS;/);
  });

  it("uses a recovery state so attacks can finish and rotate to the next attack", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const ATTACK_RECOVERY_TICKS = 24;/);
    assert.match(source, /fsm\.transition\("RECOVER"\)/);
    assert.match(source, /RECOVER: \{/);
    assert.match(source, /if \(fsm\.elapsedTicks >= ATTACK_RECOVERY_TICKS\) fsm\.transition\("COMBAT"\);/);
    assert.doesNotMatch(source, /finish\)\) => fsm\.transition\("COMBAT"\)/);
  });

  it("waits five seconds after detecting a player before the first special", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const FIRST_SPECIAL_DELAY_TICKS = 100;/);
    assert.match(source, /if \(ctx\.target\) fsm\.transition\("SPECIAL_WAIT"\);/);
    assert.match(source, /SPECIAL_WAIT: \{/);
    assert.match(source, /if \(fsm\.elapsedTicks >= FIRST_SPECIAL_DELAY_TICKS\) fsm\.transition\("COMBAT"\);/);
  });

  it("makes QuakeAttack jump before impacting on landing", () => {
    const attackSource = read("src/scripts/bosses/attacks/QuakeAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(rochatusSource, /quake: 14/);
    assert.match(rochatusSource, /radius: 9,/);
    assert.match(rochatusSource, /jumpHeight: 5,/);
    assert.match(rochatusSource, /minAirTicks: 8,/);
    assert.match(rochatusSource, /maxAirTicks: 45,/);
    assert.match(attackSource, /private readonly states = new Map<string, QuakeState>\(\);/);
    assert.match(attackSource, /groundY: context\.boss\.location\.y/);
    assert.match(attackSource, /context\.boss\.location\.y \+ this\.config\.jumpHeight/);
    assert.match(attackSource, /const landed = context\.boss\.location\.y <= state\.groundY \+ 0\.2;/);
    assert.match(attackSource, /return hadAirTime && \(landed \|\| timedOut\);/);
    assert.doesNotMatch(attackSource, /impactTick/);
  });
});
