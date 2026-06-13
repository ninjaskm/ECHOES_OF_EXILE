import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function walkFiles(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath, extension);
    return fullPath.endsWith(extension) ? [fullPath] : [];
  });
}

function read(path) {
  return readFileSync(path, "utf8");
}

describe("Bedrock command API compatibility", () => {
  it("does not call removed runCommandAsync in runtime scripts", () => {
    const offenders = walkFiles("src/scripts", ".ts").filter((file) => read(file).includes("runCommandAsync"));
    const builtOffenders = walkFiles("BP/scripts", ".js").filter((file) => read(file).includes("runCommandAsync"));

    assert.deepEqual(offenders, []);
    assert.deepEqual(builtOffenders, []);
  });

  it("does not run player-scoped commands from portal scripts", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");
    const builtSource = read("BP/scripts/portals/PortalSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /player\.runCommand/);
    }
  });

  it("does not require player chat methods to finish spawning portals", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");
    const builtSource = read("BP/scripts/portals/PortalSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /player\.sendMessage\("Tier 1 portal created/);
      assert.match(candidate, /this\.publishPortalSpawned\(portal\);/);
    }
  });

  it("uses stable spawnParticle for portal visual effects", () => {
    const source = read("src/scripts/portals/PortalSystem.ts");
    const builtSource = read("BP/scripts/portals/PortalSystem.js");

    for (const candidate of [source, builtSource]) {
      assert.doesNotMatch(candidate, /portal\.dimension\.runCommand\(`particle/);
      assert.match(candidate, /portal\.dimension\.spawnParticle\(PORTAL_ANIMATED_PARTICLE_ID/);
      assert.match(candidate, /portal\.dimension\.spawnParticle\("minecraft:portal_particle"/);
      assert.match(candidate, /portal\.dimension\.spawnParticle\("minecraft:basic_flame_particle"/);
    }
  });

  it("uses synchronous runCommand for Rochatus sounds and particles", () => {
    const source = read("src/scripts/bosses/rochatus/RochatusSystem.ts");
    const builtSource = read("BP/scripts/bosses/rochatus/RochatusSystem.js");
    const rollSource = read("src/scripts/bosses/attacks/RollAttack.ts");
    const builtRollSource = read("BP/scripts/bosses/attacks/RollAttack.js");
    const quakeSource = read("src/scripts/bosses/attacks/QuakeAttack.ts");
    const builtQuakeSource = read("BP/scripts/bosses/attacks/QuakeAttack.js");

    for (const candidate of [source, builtSource]) {
      assert.match(candidate, /boss\.dimension\.runCommand\(`playsound mob\.wither\.spawn/);
    }

    for (const candidate of [rollSource, builtRollSource]) {
      assert.match(candidate, /context\.boss\.dimension\.runCommand\(\s*`particle minecraft:large_explosion/);
    }

    for (const candidate of [quakeSource, builtQuakeSource]) {
      assert.match(candidate, /context\.boss\.dimension\.runCommand\(\s*`playsound \$\{this\.config\.sound\}/);
      assert.match(candidate, /context\.boss\.dimension\.runCommand\(\s*`particle minecraft:huge_explosion_emitter/);
    }
  });
});
