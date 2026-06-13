import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";

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

describe("MVP vertical slice contracts", () => {
  it("starts the playable loop through the portal flow", () => {
    const functionSource = read("BP/functions/exile_mvp_start.mcfunction");

    assert.match(functionSource, /scriptevent exile:help/);
    assert.match(functionSource, /scriptevent exile:spawn_portal/);
    assert.match(functionSource, /give @s exile:portal_shard 1/);
    assert.match(functionSource, /give @s minecraft:feather 1/);
  });

  it("loads the desert portal structure when the MVP portal spawns", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");
    const structurePath = "BP/structures/exile/exile_portal_deserto.mcstructure";

    assert.ok(existsSync(structurePath), `${structurePath} should exist`);
    assert.match(source, /const PORTAL_STRUCTURE_ID = "exile:exile_portal_deserto";/);
    assert.match(source, /const PORTAL_STRUCTURE_OFFSET = \{ x: -5, y: 0, z: -6 \};/);
    assert.match(source, /const PORTAL_EFFECT_OFFSET = \{ x: 0, y: 3, z: 0 \};/);
    assertOrdered(source, [
      /const structureLocation = this\.getPortalStructureLocation\(location\);/,
      /this\.loadPortalStructure\(player\.dimension, structureLocation\);/,
      /this\.portals\.push\(portal\);/,
      /this\.publishPortalSpawned\(portal\);/
    ]);
    assert.match(source, /const structureLocation = \{/);
    assert.match(source, /structure load \$\{PORTAL_STRUCTURE_ID\}/);
  });

  it("draws and activates the portal from the raised structure center", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");

    assert.match(source, /const PORTAL_ANIMATED_PARTICLE_ID = "exile:portal_animated";/);
    assert.match(source, /private getPortalEffectLocation\(portal: Portal\): Portal\["location"\]/);
    assert.match(source, /y: portal\.location\.y \+ PORTAL_EFFECT_OFFSET\.y/);
    assert.match(source, /const effectLocation = this\.getPortalEffectLocation\(portal\);/);
    assert.match(source, /location: effectLocation/);
    assert.match(source, /portal\.dimension\.spawnParticle\(PORTAL_ANIMATED_PARTICLE_ID, \{ x, y: y \+ 2\.1, z \}\);/);
    assert.match(source, /portal\.dimension\.spawnParticle\("minecraft:portal_particle", \{ x, y: y \+ 1\.1, z \}\);/);
  });

  it("defines the animated portal particle from a horizontal 16-frame strip", () => {
    const particle = JSON.parse(read("RP/particles/portal_animated.json"));
    const texture = readFileSync("RP/textures/particle/portal_sheet_strip.png");
    const width = texture.readUInt32BE(16);
    const height = texture.readUInt32BE(20);
    const effect = particle.particle_effect;
    const billboard = effect.components["minecraft:particle_appearance_billboard"];
    const flipbook = billboard.uv.flipbook;

    assert.equal(width, 8400);
    assert.equal(height, 525);
    assert.equal(effect.description.identifier, "exile:portal_animated");
    assert.equal(effect.description.basic_render_parameters.texture, "textures/particle/portal_sheet_strip");
    assert.deepEqual(flipbook.size_UV, [525, 525]);
    assert.deepEqual(flipbook.step_UV, [525, 0]);
    assert.equal(flipbook.max_frame, 16);
  });

  it("clears generated portal structures when MVP portals reset", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");

    assert.match(source, /const PORTAL_STRUCTURE_SIZE = \{ x: 11, y: 12, z: 13 \};/);
    assert.match(source, /private readonly portalStructures: PortalStructurePlacement\[] = \[];/);
    assertOrdered(source, [
      /const structureLocation = this\.getPortalStructureLocation\(location\);/,
      /this\.loadPortalStructure\(player\.dimension, structureLocation\);/,
      /this\.portalStructures\.push\(\{ dimension: player\.dimension, location: structureLocation \}\);/,
      /this\.portals\.push\(portal\);/
    ]);
    assertOrdered(source, [
      /const structures = this\.dedupePortalStructures\(\[/,
      /for \(const structure of structures\) \{/,
      /this\.clearPortalStructure\(structure\);/,
      /}/,
      /this\.portalStructures\.length = 0;/,
      /this\.portals = \[];/
    ]);
    assert.match(source, /fill \$\{x\} \$\{y\} \$\{z\} \$\{x \+ PORTAL_STRUCTURE_SIZE\.x - 1\} \$\{y \+ PORTAL_STRUCTURE_SIZE\.y - 1\} \$\{z \+ PORTAL_STRUCTURE_SIZE\.z - 1\} air replace/);
  });

  it("persists generated portal structure locations so reset still clears after reload", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");
    const constants = read("src/scripts/core/constants.ts");
    const saveSource = read("src/scripts/save/SaveSystem.ts");

    assert.match(constants, /portalStructures: `\$\{MOD_PREFIX\}:portal_structures`/);
    assert.match(saveSource, /getPortalStructures\(\): PersistedPortalStructure\[]/);
    assert.match(saveSource, /setPortalStructures\(structures: PersistedPortalStructure\[\]\): void/);
    assert.match(saveSource, /Array\.isArray\(fallback\)/);
    assert.match(saveSource, /Array\.isArray\(parsed\)/);
    assertOrdered(source, [
      /this\.portalStructures\.push\(\{ dimension: player\.dimension, location: structureLocation \}\);/,
      /this\.savePortalStructures\(\);/
    ]);
    assertOrdered(source, [
      /const persistedStructures = this\.loadPersistedPortalStructures\(\);/,
      /const structures = this\.dedupePortalStructures\(\[/,
      /\.\.\.this\.portalStructures,/,
      /\.\.\.persistedStructures/,
      /for \(const structure of structures\) \{/
    ]);
    assert.match(source, /saveSystem\.setPortalStructures\(\[]\);/);
  });

  it("uses the reset command source as a legacy cleanup fallback for old untracked portals", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");

    assert.match(source, /this\.clearPortals\(event\.sourceEntity as Player \| undefined\)/);
    assert.match(source, /private getLegacyPortalStructureFallback\(player: Player \| undefined\): PortalStructurePlacement\[]/);
    assertOrdered(source, [
      /if \(structures\.length === 0\) \{/,
      /structures\.push\(\.\.\.this\.getLegacyPortalStructureFallback\(sourcePlayer\)\);/,
      /}/,
      /for \(const structure of structures\) \{/
    ]);
  });

  it("resets player, boss, and portal state for repeatable Bedrock validation", () => {
    const functionSource = read("BP/functions/exile_reset_mvp.mcfunction");

    assert.match(functionSource, /scriptevent exile:reset_player/);
    assert.match(functionSource, /scriptevent exile:reset_bosses/);
    assert.match(functionSource, /scriptevent exile:clear_portals/);
  });

  it("activates a portal only by consuming a Portal Shard and then publishing portal:activated", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");

    assert.match(source, /itemStack\?\.typeId !== ItemIds\.portalShard/);
    assertOrdered(source, [
      /entity\.remove\(\);/,
      /this\.portals = this\.portals\.filter/,
      /this\.eventBus\.publish\("portal:activated", \{ portal \}\);/
    ]);
  });

  it("does not require the optional portal:spawned event to finish spawning a portal", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");
    const builtSource = read("BP/scripts/portals/PortalSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /this\.eventBus\.publish\("portal:spawned"/);
      assert.match(candidate, /this\.publishPortalSpawned\(portal\);/);
      assert.match(candidate, /typeof this\.eventBus\.publish !== "function"/);
    }
  });

  it("does not consume a Portal Shard when Rochatus has already been defeated", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");

    assert.match(source, /saveSystem\.isBossKilled\(BossIds\.rochatus\)/);
    assertOrdered(source, [
      /if \(saveSystem\.isBossKilled\(BossIds\.rochatus\)\) \{/,
      /return;/,
      /entity\.remove\(\);/
    ]);
  });

  it("does not spawn Rochatus after the world boss has already been defeated", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assertOrdered(source, [
      /if \(saveSystem\.isBossKilled\(BossIds\.rochatus\)\) \{/,
      /return;/,
      /const boss = portal\.dimension\.spawnEntity\(EntityIds\.rochatus/
    ]);
  });

  it("does not spawn a second Rochatus while one is already active", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assertOrdered(source, [
      /if \(this\.activeBosses\.size > 0\) \{/,
      /return;/,
      /const boss = portal\.dimension\.spawnEntity\(EntityIds\.rochatus/
    ]);
  });

  it("persists Rochatus completion before publishing the boss reward event", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assertOrdered(source, [
      /saveSystem\.markBossKilled\(BossIds\.rochatus\);/,
      /this\.eventBus\.publish\("boss:killed", \{ bossId: BossIds\.rochatus, players, location: deadEntity\.location \}\);/
    ]);
  });

  it("uses dense spread-out spike waves for Rochatus", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const attackSource = read("src/scripts/bosses/attacks/SpikeWaveAttack.ts");

    assert.match(source, /const SPIKES_PER_WAVE = 6;/);
    assert.match(source, /const SPIKE_SPREAD_SIZE = 12;/);
    assert.match(source, /spikesPerWave: SPIKES_PER_WAVE/);
    assert.match(source, /spreadSize: SPIKE_SPREAD_SIZE/);
    assert.match(attackSource, /for \(let spikeIndex = 0; spikeIndex < this\.config\.spikesPerWave; spikeIndex \+= 1\)/);
    assert.match(attackSource, /Math\.random\(\) \* this\.config\.spreadSize/);
  });

  it("gives Rochatus Bedrock AI components to follow and attack nearby players", () => {
    const entity = JSON.parse(read("BP/entities/rochatus.json"));
    const components = entity["minecraft:entity"].components;

    assert.ok(components["minecraft:movement"]);
    assert.ok(components["minecraft:movement.basic"]);
    assert.ok(components["minecraft:jump.static"]);
    assert.ok(components["minecraft:navigation.walk"]);
    assert.ok(components["minecraft:follow_range"]);
    assert.ok(components["minecraft:behavior.nearest_attackable_target"]);
    assert.ok(components["minecraft:behavior.melee_attack"]);
    assert.equal(components["minecraft:follow_range"].value, 160);
    assert.equal(components["minecraft:jump.static"].jump_power, 0.59);
    assert.equal(components["minecraft:behavior.nearest_attackable_target"].within_radius, 160);
    assert.equal(components["minecraft:behavior.nearest_attackable_target"].entity_types[0].max_dist, 160);
    assert.equal(components["minecraft:attack"].damage, 15);
    assert.equal(components["minecraft:behavior.melee_attack"].cooldown_time, 1.5);
    assert.equal(components["minecraft:behavior.melee_attack"].track_target, true);
    assert.equal(components["minecraft:health"].value, 1200);
    assert.equal(components["minecraft:health"].max, 1200);
    assert.deepEqual(components["minecraft:behavior.nearest_attackable_target"].entity_types[0].filters, {
      test: "is_family",
      subject: "other",
      value: "player"
    });
  });

  it("keeps Rochatus scripted arena targeting aligned with the follow distance", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");

    assert.match(source, /const BOSS_RADIUS = 160;/);
    assert.match(source, /super\("Rochatus", BOSS_RADIUS\);/);
  });
});
