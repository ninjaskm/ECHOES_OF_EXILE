import { system, world } from "@minecraft/server";
import type { Dimension, Player } from "@minecraft/server";
import { BossIds, ItemIds } from "../core/constants.js";
import { distance, normalizeVector } from "../core/math.js";
import { saveSystem } from "../save/SaveSystem.js";
import type { PersistedPortalStructure, Portal, SystemContext } from "../types.js";

const PORTAL_RADIUS = 2.5;
const PORTAL_DRAW_RADIUS = 96;
const PORTAL_ACTIVATION_RADIUS = 3;
const PORTAL_STRUCTURE_ID = "exile:exile_portal_deserto";
const PORTAL_ANIMATED_PARTICLE_ID = "exile:portal_animated";
const PORTAL_STRUCTURE_OFFSET = { x: -5, y: 0, z: -6 };
const PORTAL_STRUCTURE_SIZE = { x: 11, y: 12, z: 13 };
const PORTAL_EFFECT_OFFSET = { x: 0, y: 3, z: 0 };
const PORTAL_SIGNATURE_BLOCK_THRESHOLD = 12;
const PORTAL_SIGNATURE_BLOCK_IDS = new Set<string>([
  "minecraft:chiseled_red_sandstone",
  "minecraft:chiseled_resin_bricks",
  "minecraft:mud_brick_stairs",
  "minecraft:mud_bricks",
  "minecraft:red_sandstone_wall"
]);

interface PortalStructurePlacement {
  dimension: Dimension;
  location: Portal["location"];
}

class PortalSystem {
  private portals: Portal[] = [];
  private readonly portalStructures: PortalStructurePlacement[] = [];
  private nextPortalId = 1;
  private eventBus!: SystemContext["eventBus"];

  initialize({ eventBus, tickManager }: SystemContext): void {
    this.eventBus = eventBus;
    tickManager.every(20, () => this.updatePortals());

    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id === "exile:spawn_portal") this.spawnPortalForPlayer(event.sourceEntity as Player | undefined);
      if (event.id === "exile:clear_portals") this.clearPortals(event.sourceEntity as Player | undefined);
    });
  }

  spawnPortalForPlayer(player: Player | undefined): void {
    if (!player || player.typeId !== "minecraft:player") return;

    const view = normalizeVector(player.getViewDirection());
    const location = {
      x: Math.floor(player.location.x + view.x * 6) + 0.5,
      y: Math.floor(player.location.y),
      z: Math.floor(player.location.z + view.z * 6) + 0.5
    };

    const portal = {
      id: this.nextPortalId++,
      tier: 1,
      active: true,
      dimension: player.dimension,
      location
    };

    const structureLocation = this.getPortalStructureLocation(location);
    this.loadPortalStructure(player.dimension, structureLocation);
    this.portalStructures.push({ dimension: player.dimension, location: structureLocation });
    this.savePortalStructures();
    this.portals.push(portal);
    this.publishPortalSpawned(portal);
  }

  loadPortalStructure(dimension: Dimension, location: Portal["location"]): void {
    try {
      dimension.runCommand(`structure load ${PORTAL_STRUCTURE_ID} ${location.x} ${location.y} ${location.z}`);
    } catch {
      // Portal structure is visual; particles and shard activation still define the gameplay portal.
    }
  }

  private getPortalStructureLocation(location: Portal["location"]): Portal["location"] {
    const structureLocation = {
      x: Math.floor(location.x) + PORTAL_STRUCTURE_OFFSET.x,
      y: Math.floor(location.y) + PORTAL_STRUCTURE_OFFSET.y,
      z: Math.floor(location.z) + PORTAL_STRUCTURE_OFFSET.z
    };

    return structureLocation;
  }

  publishPortalSpawned(portal: Portal): void {
    if (typeof this.eventBus.publish !== "function") return;

    try {
      const eventName = "portal:spawned" as const;
      this.eventBus.publish(eventName, { portal });
    } catch {
      // Spawn notifications are optional; the portal is already registered.
    }
  }

  clearPortals(sourcePlayer?: Player): void {
    const persistedStructures = this.loadPersistedPortalStructures();
    const activePortalStructures = this.portals.map((portal) => ({
      dimension: portal.dimension,
      location: this.getPortalStructureLocation(portal.location)
    }));
    const structures = this.dedupePortalStructures([
      ...this.portalStructures,
      ...persistedStructures,
      ...activePortalStructures
    ]);
    if (structures.length === 0) {
      structures.push(...this.getLegacyPortalStructureFallback(sourcePlayer).filter((structure) => this.hasPortalStructureSignature(structure)));
    }

    for (const structure of structures) {
      this.clearPortalStructure(structure);
    }
    this.portalStructures.length = 0;
    this.portals = [];
    saveSystem.setPortalStructures([]);
    for (const player of world.getAllPlayers()) {
      player.sendMessage("MVP portals cleared.");
    }
  }

  private loadPersistedPortalStructures(): PortalStructurePlacement[] {
    const structures: PortalStructurePlacement[] = [];

    for (const structure of saveSystem.getPortalStructures()) {
      const dimension = this.getDimensionById(structure.dimensionId);
      if (!dimension) continue;
      structures.push({ dimension, location: structure.location });
    }

    return structures;
  }

  private savePortalStructures(): void {
    const structures = this.dedupePortalStructures([...this.loadPersistedPortalStructures(), ...this.portalStructures]);
    saveSystem.setPortalStructures(
      structures.map((structure) => ({
        dimensionId: structure.dimension.id,
        location: structure.location
      }))
    );
  }

  private getDimensionById(dimensionId: PersistedPortalStructure["dimensionId"]): Dimension | undefined {
    try {
      return world.getDimension(dimensionId);
    } catch {
      return undefined;
    }
  }

  private dedupePortalStructures(structures: PortalStructurePlacement[]): PortalStructurePlacement[] {
    const keys = new Set<string>();
    const uniqueStructures: PortalStructurePlacement[] = [];

    for (const structure of structures) {
      const key = `${structure.dimension.id}:${structure.location.x}:${structure.location.y}:${structure.location.z}`;
      if (keys.has(key)) continue;
      keys.add(key);
      uniqueStructures.push(structure);
    }

    return uniqueStructures;
  }

  private getLegacyPortalStructureFallback(player: Player | undefined): PortalStructurePlacement[] {
    if (!player || player.typeId !== "minecraft:player") return [];

    return [
      {
        dimension: player.dimension,
        location: this.getPortalStructureLocation(player.location)
      }
    ];
  }

  private hasPortalStructureSignature({ dimension, location }: PortalStructurePlacement): boolean {
    let matchingBlocks = 0;

    for (let xOffset = 0; xOffset < PORTAL_STRUCTURE_SIZE.x; xOffset += 1) {
      for (let yOffset = 0; yOffset < PORTAL_STRUCTURE_SIZE.y; yOffset += 1) {
        for (let zOffset = 0; zOffset < PORTAL_STRUCTURE_SIZE.z; zOffset += 1) {
          if (!this.isPortalSignatureBlock(dimension, location.x + xOffset, location.y + yOffset, location.z + zOffset)) continue;

          matchingBlocks += 1;
          if (matchingBlocks >= PORTAL_SIGNATURE_BLOCK_THRESHOLD) return true;
        }
      }
    }

    return false;
  }

  private isPortalSignatureBlock(dimension: Dimension, x: number, y: number, z: number): boolean {
    for (const blockId of PORTAL_SIGNATURE_BLOCK_IDS) {
      try {
        const result = dimension.runCommand(`testforblock ${x} ${y} ${z} ${blockId}`) as { successCount?: number };
        if ((result.successCount ?? 0) > 0) return true;
      } catch {
        // A failed testforblock only means this coordinate is not that signature block.
      }
    }

    return false;
  }

  private clearPortalStructure({ dimension, location }: PortalStructurePlacement): void {
    const { x, y, z } = location;
    if (!this.hasPortalStructureSignature({ dimension, location })) return;

    try {
      dimension.runCommand(
        `fill ${x} ${y} ${z} ${x + PORTAL_STRUCTURE_SIZE.x - 1} ${y + PORTAL_STRUCTURE_SIZE.y - 1} ${z + PORTAL_STRUCTURE_SIZE.z - 1} air replace`
      );
    } catch {
      // Reset should keep going even if a previously generated structure is already gone.
    }
  }

  updatePortals(): void {
    for (const portal of this.portals) {
      this.drawPortal(portal);
      this.tryActivatePortal(portal);
    }
  }

  drawPortal(portal: Portal): void {
    const effectLocation = this.getPortalEffectLocation(portal);
    const playersNearby = world
      .getAllPlayers()
      .filter((player) => player.dimension.id === portal.dimension.id)
      .some((player) => distance(player.location, effectLocation) <= PORTAL_DRAW_RADIUS);

    if (!playersNearby) return;

    const { x, y, z } = effectLocation;
    try {
      portal.dimension.spawnParticle(PORTAL_ANIMATED_PARTICLE_ID, { x, y: y + 2.1, z });
      portal.dimension.spawnParticle("minecraft:portal_particle", { x, y: y + 1.1, z });
      portal.dimension.spawnParticle("minecraft:basic_flame_particle", { x, y: y + 0.2, z });
    } catch {
      // Portal particles are visual-only and should not break the gameplay tick.
    }
  }

  tryActivatePortal(portal: Portal): void {
    const effectLocation = this.getPortalEffectLocation(portal);
    const itemEntities = portal.dimension.getEntities({
      type: "minecraft:item",
      location: effectLocation,
      maxDistance: PORTAL_ACTIVATION_RADIUS
    });

    for (const entity of itemEntities) {
      const itemStack = entity.getComponent("minecraft:item")?.itemStack;
      if (itemStack?.typeId !== ItemIds.portalShard) continue;

      if (saveSystem.isBossKilled(BossIds.rochatus)) {
        for (const player of world.getAllPlayers()) {
          player.sendMessage("Rochatus has already been defeated in this world.");
        }
        return;
      }

      entity.remove();
      this.portals = this.portals.filter((candidate: Portal) => candidate.id !== portal.id);
      this.eventBus.publish("portal:activated", { portal });
      return;
    }
  }

  private getPortalEffectLocation(portal: Portal): Portal["location"] {
    return {
      x: portal.location.x + PORTAL_EFFECT_OFFSET.x,
      y: portal.location.y + PORTAL_EFFECT_OFFSET.y,
      z: portal.location.z + PORTAL_EFFECT_OFFSET.z
    };
  }
}

export const portalSystem = new PortalSystem();
