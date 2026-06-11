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

describe("MVP vertical slice contracts", () => {
  it("starts the playable loop through the portal flow", () => {
    const functionSource = read("BP/functions/exile_mvp_start.mcfunction");

    assert.match(functionSource, /scriptevent exile:help/);
    assert.match(functionSource, /scriptevent exile:spawn_portal/);
    assert.match(functionSource, /give @s exile:portal_shard 1/);
    assert.match(functionSource, /give @s minecraft:feather 1/);
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

    assert.match(source, /const SPIKES_PER_WAVE = 6;/);
    assert.match(source, /const SPIKE_SPREAD_SIZE = 12;/);
    assert.match(source, /for \(let spikeIndex = 0; spikeIndex < SPIKES_PER_WAVE; spikeIndex \+= 1\)/);
    assert.match(source, /Math\.random\(\) \* SPIKE_SPREAD_SIZE/);
  });
});
