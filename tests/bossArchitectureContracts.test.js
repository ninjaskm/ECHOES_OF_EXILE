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
    assert.match(source, /verticalFollowRange: number;/);
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
    assert.match(rochatusSource, /verticalFollowRange: 2,/);
    assert.doesNotMatch(source, /context\.damagePlayersNear\(this\.config\.contactRadius, this\.config\.damage, this\.config\.effect\);/);
  });

  it("gates Rochatus specials with attack-specific intervals", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const ROLL_ATTACK_INTERVAL_TICKS = 150;/);
    assert.match(source, /const SPIKE_ATTACK_INTERVAL_TICKS = 150;/);
    assert.match(source, /const QUAKE_ATTACK_INTERVAL_TICKS = 150;/);
    assert.match(source, /attackAvailableTicks: Record<string, number>;/);
    assert.match(source, /attackIndex: -1,/);
    assert.match(source, /stepDistance: 0\.432,/);
    assert.match(source, /damage: DAMAGE\.roll,/);
    assert.match(source, /effect: \{ type: "slowness", duration: 120, options: \{ amplifier: 1 \} \}/);
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
    assert.match(source, /if \(fsm\.elapsedTicks >= ATTACK_RECOVERY_TICKS\) fsm\.transition\("TELEGRAPH"\);/);
    assert.doesNotMatch(source, /finish\)\) => fsm\.transition\("COMBAT"\)/);
  });

  it("telegraphs Rochatus special attacks for one second before they execute", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const SPECIAL_TELEGRAPH_TICKS = 20;/);
    assert.match(source, /const TELEGRAPH_REFRESH_TICKS = 5;/);
    assert.match(source, /fsm\.transition\("TELEGRAPH"\)/);
    assert.match(source, /TELEGRAPH: \{/);
    assert.match(source, /ctx\.attack = this\.selectNextAttack\(ctx\);/);
    assert.match(source, /this\.renderAttackTelegraph\(ctx\);/);
    assert.match(source, /if \(fsm\.elapsedTicks >= SPECIAL_TELEGRAPH_TICKS\) fsm\.transition\("COMBAT"\);/);
    assert.match(source, /ctx\.attack\.onEnter\?\./);
  });

  it("renders distinct Rochatus telegraph shapes for roll, spikes, and quake", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /private renderAttackTelegraph\(context: RochatusContext\): void/);
    assert.match(source, /if \(context\.attack\.id === "roll"\) return this\.renderSideArrowTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\);/);
    assert.match(source, /if \(context\.attack\.id === "spikes"\) return this\.renderSpikeWarningTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\);/);
    assert.match(source, /if \(context\.attack\.id === "quake"\) return this\.renderQuakeWarningTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\);/);
    assert.match(source, /private renderSideArrowTelegraph\(boss: Entity, forward: \{ x: number; z: number \}\): void/);
    assert.match(source, /RUN_TELEGRAPH_PARTICLE = "exile:warning_run_sheet"/);
    assert.match(source, /private renderSpikeWarningTelegraph\(boss: Entity, forward: \{ x: number; z: number \}\): void/);
    assert.match(source, /SPIKE_TELEGRAPH_PARTICLE = "exile:warning_sheet_spikes"/);
    assert.match(source, /private renderQuakeWarningTelegraph\(boss: Entity, forward: \{ x: number; z: number \}\): void/);
    assert.match(source, /QUAKE_TELEGRAPH_PARTICLE = "exile:quake_wave_red"/);
    assert.match(source, /const TELEGRAPH_FORWARD_DISTANCE = 2\.4;/);
    assert.match(source, /this\.renderSideArrowTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\)/);
    assert.match(source, /this\.renderSpikeWarningTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\)/);
    assert.match(source, /this\.renderQuakeWarningTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\)/);
    assert.match(source, /private resolveTelegraphForward\(context: RochatusContext\): \{ x: number; z: number \}/);
    assert.match(source, /const direction = normalizeVector\(\{\s*x: context\.target\.location\.x - context\.boss\.location\.x,\s*y: 0,\s*z: context\.target\.location\.z - context\.boss\.location\.z\s*\}\);/s);
    assert.doesNotMatch(source, /getRotation\(\)/);
    assert.match(source, /boss\.location\.x \+ forward\.x \* TELEGRAPH_FORWARD_DISTANCE \+ offset\.x/);
    assert.match(source, /boss\.location\.z \+ forward\.z \* TELEGRAPH_FORWARD_DISTANCE \+ offset\.z/);
  });

  it("defines the custom quake warning wave particle as a horizontal four-frame sheet", () => {
    assert.ok(existsSync("RP/textures/particle/quake_wave_red.png"), "quake warning texture should exist");
    assert.ok(existsSync("RP/particles/quake_wave_red.json"), "quake warning particle should exist");

    const particle = JSON.parse(read("RP/particles/quake_wave_red.json"));
    const description = particle.particle_effect.description;
    const billboard = particle.particle_effect.components["minecraft:particle_appearance_billboard"];

    assert.equal(description.identifier, "exile:quake_wave_red");
    assert.equal(description.basic_render_parameters.texture, "textures/particle/quake_wave_red");
    assert.deepEqual(billboard.size, [1.25, 0.35]);
    assert.equal(billboard.uv.texture_width, 256);
    assert.equal(billboard.uv.texture_height, 64);
    assert.deepEqual(billboard.uv.uv_size, [64, 64]);
    assert.equal(particle.particle_effect.components["minecraft:particle_lifetime_expression"].max_lifetime, 0.7);
    assert.match(JSON.stringify(billboard.uv), /variable\.particle_age \/ 0\.175/);
  });

  it("defines the custom Rochatus run warning particle as a square four-frame sheet", () => {
    assert.ok(existsSync("RP/textures/particle/warning_run_sheet.png"), "run warning texture should exist");
    assert.ok(existsSync("RP/particles/warning_run_sheet.json"), "run warning particle should exist");

    const particle = JSON.parse(read("RP/particles/warning_run_sheet.json"));
    const description = particle.particle_effect.description;
    const billboard = particle.particle_effect.components["minecraft:particle_appearance_billboard"];
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.equal(description.identifier, "exile:warning_run_sheet");
    assert.equal(description.basic_render_parameters.texture, "textures/particle/warning_run_sheet");
    assert.deepEqual(billboard.size, [1.2, 1.2]);
    assert.equal(billboard.uv.texture_width, 256);
    assert.equal(billboard.uv.texture_height, 64);
    assert.deepEqual(billboard.uv.uv_size, [64, 64]);
    assert.match(JSON.stringify(billboard.uv), /variable\.particle_age/);
    assert.match(rochatusSource, /RUN_TELEGRAPH_PARTICLE = "exile:warning_run_sheet"/);
    assert.match(rochatusSource, /this\.renderSideArrowTelegraph\(context\.boss, this\.resolveTelegraphForward\(context\)\)/);
  });

  it("spawns Rochatus six blocks in front of the command source player", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const COMMAND_SPAWN_FORWARD_DISTANCE = 6;/);
    assert.match(source, /const direction = normalizeVector\(player\.getViewDirection\(\)\);/);
    assert.match(source, /x: player\.location\.x \+ direction\.x \* COMMAND_SPAWN_FORWARD_DISTANCE/);
    assert.match(source, /z: player\.location\.z \+ direction\.z \* COMMAND_SPAWN_FORWARD_DISTANCE/);
    assert.doesNotMatch(source, /x: player\.location\.x \+ 4/);
    assert.doesNotMatch(source, /z: player\.location\.z \+ 4/);
  });

  it("waits five seconds after detecting a player before the first special", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const FIRST_SPECIAL_DELAY_TICKS = 100;/);
    assert.match(source, /if \(ctx\.target\) fsm\.transition\("SPECIAL_WAIT"\);/);
    assert.match(source, /SPECIAL_WAIT: \{/);
    assert.match(source, /if \(fsm\.elapsedTicks >= FIRST_SPECIAL_DELAY_TICKS\) fsm\.transition\("TELEGRAPH"\);/);
  });

  it("makes QuakeAttack jump before impacting on landing", () => {
    const attackSource = read("src/scripts/bosses/attacks/QuakeAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(rochatusSource, /quake: 20/);
    assert.match(rochatusSource, /radius: 7\.5,/);
    assert.match(rochatusSource, /jumpHeight: 7,/);
    assert.match(rochatusSource, /minAirTicks: 8,/);
    assert.match(rochatusSource, /maxAirTicks: 45,/);
    assert.match(attackSource, /private readonly states = new Map<string, QuakeState>\(\);/);
    assert.match(attackSource, /groundY: context\.boss\.location\.y/);
    assert.match(attackSource, /context\.boss\.location\.y \+ this\.config\.jumpHeight/);
    assert.match(attackSource, /const landed = context\.boss\.location\.y <= state\.groundY \+ 0\.2;/);
    assert.match(attackSource, /return hadAirTime && \(landed \|\| timedOut\);/);
    assert.doesNotMatch(attackSource, /impactTick/);
  });

  it("lets Rochatus roll follow nearby vertical steps without turning into a flying attack", () => {
    const attackSource = read("src/scripts/bosses/attacks/RollAttack.ts");

    assert.match(attackSource, /verticalFollowRange: number;/);
    assert.match(attackSource, /const nextY = this\.resolveVerticalStep\(context\);/);
    assert.match(attackSource, /y: nextY,/);
    assert.match(attackSource, /private resolveVerticalStep\(context: BossAttackContext\): number/);
    assert.match(attackSource, /if \(!context\.target\) return context\.boss\.location\.y;/);
    assert.match(attackSource, /Math\.abs\(deltaY\) <= this\.config\.verticalFollowRange/);
    assert.match(attackSource, /return context\.target\.location\.y;/);
    assert.match(attackSource, /return context\.boss\.location\.y;/);
  });

  it("gives players a larger recovery window between Rochatus normal melee hits", () => {
    const entity = JSON.parse(read("BP/entities/rochatus.json"));
    const melee = entity["minecraft:entity"].components["minecraft:behavior.melee_attack"];

    const components = entity["minecraft:entity"].components;

    assert.equal(components["minecraft:attack"].damage, 20);
    assert.equal(components["minecraft:movement"].value, 0.25);
    assert.equal(melee.cooldown_time, 3);
    assert.equal(melee.speed_multiplier, 1.2);
    assert.equal(melee.track_target, true);
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
    assert.match(rochatusSource, /fallHeight: 9/);
    assert.match(rochatusSource, /fallStepTicks: 4/);
    assert.equal(JSON.parse(particleSource).particle_effect.description.identifier, "exile:rochatus_stalactite");
  });

  it("makes Rochatus spike warnings easier to read before impact", () => {
    const attackSource = read("src/scripts/bosses/attacks/SpikeWaveAttack.ts");

    assert.match(attackSource, /private spawnWarningParticles\(context: BossAttackContext, location:/);
    assert.match(attackSource, /const warningOffsets = \[/);
    assert.match(attackSource, /particle minecraft:critical_hit_emitter/);
    assert.match(attackSource, /location\.y \+ 0\.12/);
    assert.match(attackSource, /this\.spawnWarningParticles\(context, \{ x, y, z \}\);/);
    assert.doesNotMatch(attackSource, /warningParticleId/);
  });

  it("keeps the custom spike warning separate from the falling stalactite animation", () => {
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(rochatusSource, /SPIKE_TELEGRAPH_PARTICLE = "exile:warning_sheet_spikes"/);
    assert.match(rochatusSource, /fallParticleId: "exile:rochatus_stalactite"/);
    assert.match(rochatusSource, /impactParticleId: "exile:rochatus_stalactite"/);
    assert.doesNotMatch(rochatusSource, /warningParticleId: "exile:warning_sheet_spikes"/);
    assert.doesNotMatch(rochatusSource, /fallParticleId: "exile:warning_sheet_spikes"/);
    assert.doesNotMatch(rochatusSource, /impactParticleId: "exile:warning_sheet_spikes"/);
  });

  it("defines the custom Rochatus spike warning particle as a horizontal four-frame sheet", () => {
    assert.ok(existsSync("RP/textures/particle/warning_sheet_spikes.png"), "spike warning texture should exist");
    assert.ok(existsSync("RP/particles/warning_sheet_spikes.json"), "spike warning particle should exist");

    const particle = JSON.parse(read("RP/particles/warning_sheet_spikes.json"));
    const description = particle.particle_effect.description;
    const billboard = particle.particle_effect.components["minecraft:particle_appearance_billboard"];
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.equal(description.identifier, "exile:warning_sheet_spikes");
    assert.equal(description.basic_render_parameters.texture, "textures/particle/warning_sheet_spikes");
    assert.deepEqual(billboard.size, [1.2, 1.2]);
    assert.equal(billboard.uv.texture_width, 256);
    assert.equal(billboard.uv.texture_height, 64);
    assert.deepEqual(billboard.uv.uv_size, [64, 64]);
    assert.match(JSON.stringify(billboard.uv), /variable\.particle_age/);
    assert.match(rochatusSource, /SPIKE_TELEGRAPH_PARTICLE = "exile:warning_sheet_spikes"/);
  });

  it("locks spike waves to the last valid target location within fifteen blocks of the boss", () => {
    const attackSource = read("src/scripts/bosses/attacks/SpikeWaveAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(attackSource, /targetLockRange: number;/);
    assert.match(rochatusSource, /spikes: 7/);
    assert.match(attackSource, /private readonly lockedTargetLocations = new Map<string, \{ x: number; y: number; z: number \}>\(\);/);
    assert.match(attackSource, /this\.lockedTargetLocations\.delete\(context\.boss\.id\);/);
    assert.match(attackSource, /private resolveTargetLocation\(context: BossAttackContext\): \{ x: number; y: number; z: number \} \| undefined/);
    assert.match(attackSource, /horizontalDistance\(context\.target\.location, context\.boss\.location\) <= this\.config\.targetLockRange/);
    assert.match(
      attackSource,
      /this\.lockedTargetLocations\.set\(context\.boss\.id, \{\s*x: context\.target\.location\.x,\s*y: context\.target\.location\.y,\s*z: context\.target\.location\.z\s*\}\);/s
    );
    assert.match(attackSource, /return this\.lockedTargetLocations\.get\(context\.boss\.id\);/);
    assert.match(attackSource, /const targetLocation = this\.resolveTargetLocation\(context\);/);
    assert.match(attackSource, /if \(!targetLocation\) return;/);
    assert.match(attackSource, /targetLocation\.x \+ Math\.floor\(Math\.random\(\) \* this\.config\.spreadSize\)/);
    assert.doesNotMatch(attackSource, /context\.target\.location\.x \+ Math\.floor\(Math\.random\(\) \* this\.config\.spreadSize\)/);
    assert.match(rochatusSource, /targetLockRange: 15,/);
    assert.match(rochatusSource, /spikesPerWave: SPIKES_PER_WAVE/);
    assert.match(rochatusSource, /spreadSize: SPIKE_SPREAD_SIZE/);
    assert.match(rochatusSource, /waveUntilTick: 70,/);
    assert.match(rochatusSource, /totalTicks: 120,/);
  });

  it("extends Rochatus earthquake and shakes nearby cameras on impact", () => {
    const attackSource = read("src/scripts/bosses/attacks/QuakeAttack.ts");
    const rochatusSource = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(rochatusSource, /totalTicks: 113,/);
    assert.match(rochatusSource, /cameraShake: \{ intensity: 0\.45, seconds: 0\.7 \}/);
    assert.match(rochatusSource, /effect: \{ type: "slowness", duration: 80, options: \{ amplifier: 2 \} \}/);
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
