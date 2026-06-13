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
    assert.match(source, /const BOSS_BAR_MAX_HEALTH = 500;/);
    assert.match(source, /const scaledHealth = Math\.min\(BOSS_BAR_MAX_HEALTH, Math\.floor\(BASE_HEALTH \* \(1 \+ playerCount \* 0\.25\)\)\);/);
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
    assert.doesNotMatch(source, /onTick\(context: BossAttackContext\): void \{\s*if \(!context\.target\) return;\s*const dir = normalizeVector/s);
  });

  it("carries hit players with Rochatus during RollAttack instead of only dealing contact damage", () => {
    const source = read("src/scripts/bosses/attacks/RollAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /import \{ applyKnockbackSafe, horizontalDistance, normalizeVector \}/);
    assert.match(source, /carryStrength: number;/);
    assert.match(source, /private readonly carriedPlayers = new Map<string, Set<string>>\(\);/);
    assert.match(source, /this\.carriedPlayers\.set\(context\.boss\.id, new Set\(\)\);/);
    assert.match(source, /this\.carryHitPlayers\(context, dir\);/);
    assert.match(source, /private carryHitPlayers\(context: BossAttackContext, dir: \{ x: number; z: number \}\): void/);
    assert.match(source, /horizontalDistance\(player\.location, context\.boss\.location\) <= this\.config\.contactRadius/);
    assert.match(source, /applyKnockbackSafe\(player, dir\.x, dir\.z, this\.config\.carryStrength, 0\.05\);/);
    assert.match(source, /if \(!alreadyHit\) \{/);
    assert.match(source, /hitPlayers\.add\(player\.id\);/);
    assert.match(source, /this\.carriedPlayers\.delete\(context\.boss\.id\);/);
    assert.match(rochatusSource, /carryStrength: 1\.1,/);
    assert.doesNotMatch(source, /context\.damagePlayersNear\(this\.config\.contactRadius, this\.config\.damage, this\.config\.effect\);/);
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

  it("renders Rochatus spikes as texture-only particles without physical blocks", () => {
    const attackSource = read("src/scripts/bosses/attacks/SpikeWaveAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const particleSource = read("RP/particles/rochatus_stalactite.json");

    assert.match(attackSource, /fallParticleId\?: string;/);
    assert.match(attackSource, /impactParticleId\?: string;/);
    assert.match(attackSource, /fallHeight\?: number;/);
    assert.match(attackSource, /fallStepTicks\?: number;/);
    assert.match(attackSource, /private animateFallingParticle\(context: BossAttackContext, location:/);
    assert.match(attackSource, /this\.animateFallingParticle\(context, \{ x, y, z \}\);/);
    assert.match(attackSource, /this\.resolveSpikeImpact\(context, \{ x, y, z \}\);/);
    assert.match(attackSource, /private resolveSpikeImpact\(context: BossAttackContext, location:/);
    assert.match(attackSource, /spawnParticle\(this\.config\.fallParticleId/);
    assert.match(attackSource, /spawnParticle\(this\.config\.impactParticleId/);
    assert.doesNotMatch(attackSource, /impactBlockId/);
    assert.doesNotMatch(attackSource, /impactBlockLifetimeTicks/);
    assert.doesNotMatch(attackSource, /setblock/);
    assert.doesNotMatch(attackSource, /\bfill\b/);
    assert.doesNotMatch(rochatusSource, /impactBlockId/);
    assert.doesNotMatch(rochatusSource, /impactBlockLifetimeTicks/);
    assert.match(rochatusSource, /fallParticleId: "exile:rochatus_stalactite"/);
    assert.match(rochatusSource, /impactParticleId: "exile:rochatus_stalactite"/);
    assert.match(rochatusSource, /fallHeight: 7/);
    assert.match(rochatusSource, /fallStepTicks: 3/);
    assert.equal(JSON.parse(particleSource).particle_effect.description.identifier, "exile:rochatus_stalactite");
  });

  it("extends Rochatus earthquake and shakes nearby cameras on impact", () => {
    const attackSource = read("src/scripts/bosses/attacks/QuakeAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(rochatusSource, /totalTicks: 113,/);
    assert.match(rochatusSource, /cameraShake: \{ intensity: 0\.45, seconds: 0\.7 \}/);
    assert.match(attackSource, /cameraShake\?: \{ intensity: number; seconds: number \};/);
    assert.match(attackSource, /private shakeCamera\(context: BossAttackContext\): void/);
    assert.match(attackSource, /camerashake add @a\[r=\$\{this\.config\.radius\}\] \$\{this\.config\.cameraShake\.intensity\} \$\{this\.config\.cameraShake\.seconds\} positional/);
    assert.match(attackSource, /this\.shakeCamera\(context\);/);
  });

  it("keeps Rochatus nameTag health as fallback while enabling native boss bar", () => {
    const entity = JSON.parse(read("BP/entities/rochatus.json"));
    const components = entity["minecraft:entity"].components;
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const baseSource = read("src/scripts/bosses/base/BaseBossSystem.ts");

    assert.deepEqual(components["minecraft:boss"], {
      hud_range: 160,
      name: "Rochatus",
      should_darken_sky: false
    });
    assert.match(source, /boss\.nameTag = `Rochatus \[\$\{currentHealth\} HP\]`;/);
    assert.match(baseSource, /entity\.nameTag = `\$\{this\.displayName\} \[\$\{Math\.max\(0, Math\.floor\(health\.currentValue\)\)\} HP\]`;/);
  });

  it("keeps targeting a wounded current player at or below thirty percent health", () => {
    const baseSource = read("src/scripts/bosses/base/BaseBossSystem.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(baseSource, /const LOW_HEALTH_TARGET_PERCENT = 0\.3;/);
    assert.match(baseSource, /protected selectBossTarget\(entity: Entity, currentTarget: Player \| undefined, players = this\.getPlayersInArena\(entity\)\): Player \| undefined/);
    assert.match(baseSource, /this\.isPlayerAtOrBelowHealthPercent\(currentTarget, LOW_HEALTH_TARGET_PERCENT\)/);
    assert.match(baseSource, /return currentTarget;/);
    assert.match(baseSource, /private isPlayerAtOrBelowHealthPercent\(player: Player, percent: number\): boolean/);
    assert.match(baseSource, /const health = player\.getComponent\("minecraft:health"\);/);
    assert.match(baseSource, /health\.currentValue <= health\.effectiveMax \* percent/);
    assert.match(baseSource, /return this\.nearestPlayer\(entity, players\);/);
    assert.doesNotMatch(baseSource, /const LOW_HEALTH_TARGET_HP = 30;/);
    assert.doesNotMatch(baseSource, /health\.currentValue <= 30/);
    assert.match(rochatusSource, /this\.selectBossTarget\(ctx\.boss, ctx\.target, ctx\.playersInArena\)/);
  });
});
