import { system, world } from "@minecraft/server";
import type { Player } from "@minecraft/server";
import { ItemIds } from "../core/constants.js";
import { distance, normalizeVector } from "../core/math.js";
import type { Portal, SystemContext } from "../types.js";

const PORTAL_RADIUS = 2.5;
const PORTAL_DRAW_RADIUS = 96;
const PORTAL_ACTIVATION_RADIUS = 3;

class PortalSystem {
  private portals: Portal[] = [];
  private nextPortalId = 1;
  private eventBus!: SystemContext["eventBus"];

  initialize({ eventBus, tickManager }: SystemContext): void {
    this.eventBus = eventBus;
    tickManager.every(20, () => this.updatePortals());

    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id === "exile:spawn_portal") this.spawnPortalForPlayer(event.sourceEntity as Player | undefined);
      if (event.id === "exile:clear_portals") this.clearPortals();
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

    this.portals.push(portal);
    player.runCommandAsync("give @s exile:portal_shard 1").catch(() => {});
    player.sendMessage("Tier 1 portal created. Drop a Portal Shard into it to awaken Rochatus.");
    this.eventBus.publish("portal:spawned", { portal });
  }

  clearPortals(): void {
    this.portals = [];
    for (const player of world.getAllPlayers()) {
      player.sendMessage("MVP portals cleared.");
    }
  }

  updatePortals(): void {
    for (const portal of this.portals) {
      this.drawPortal(portal);
      this.tryActivatePortal(portal);
    }
  }

  drawPortal(portal: Portal): void {
    const playersNearby = world
      .getAllPlayers()
      .filter((player) => player.dimension.id === portal.dimension.id)
      .some((player) => distance(player.location, portal.location) <= PORTAL_DRAW_RADIUS);

    if (!playersNearby) return;

    const { x, y, z } = portal.location;
    portal.dimension.runCommandAsync(`particle minecraft:portal_particle ${x} ${y + 1.1} ${z}`).catch(() => {});
    portal.dimension.runCommandAsync(`particle minecraft:basic_flame_particle ${x} ${y + 0.2} ${z}`).catch(() => {});
  }

  tryActivatePortal(portal: Portal): void {
    const itemEntities = portal.dimension.getEntities({
      type: "minecraft:item",
      location: portal.location,
      maxDistance: PORTAL_ACTIVATION_RADIUS
    });

    for (const entity of itemEntities) {
      const itemStack = entity.getComponent("minecraft:item")?.itemStack;
      if (itemStack?.typeId !== ItemIds.portalShard) continue;

      entity.remove();
      this.portals = this.portals.filter((candidate: Portal) => candidate.id !== portal.id);
      this.eventBus.publish("portal:activated", { portal });
      return;
    }
  }
}

export const portalSystem = new PortalSystem();
