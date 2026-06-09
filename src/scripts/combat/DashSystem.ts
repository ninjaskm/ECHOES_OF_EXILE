import { system, world } from "@minecraft/server";
import type { Player } from "@minecraft/server";
import { applyKnockbackSafe, normalizeVector } from "../core/math.js";
import { saveSystem } from "../save/SaveSystem.js";
import { resolveDash } from "./dashRules.js";
import type { SystemContext } from "../types.js";

const DASH_POWER = 2.2;

class DashSystem {
  private eventBus!: SystemContext["eventBus"];

  initialize({ eventBus }: SystemContext): void {
    this.eventBus = eventBus;

    world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
      if (source.typeId !== "minecraft:player") return;
      if (itemStack.typeId !== "minecraft:feather") return;
      this.tryDash(source as Player);
    });
  }

  tryDash(player: Player): boolean {
    const stats = saveSystem.getPlayerStats(player);
    const now = system.currentTick;
    const result = resolveDash({
      mana: stats.mana,
      dashCooldownUntil: stats.dashCooldownUntil,
      currentTick: now
    });

    if (!result.ok && result.reason === "cooldown") {
      player.onScreenDisplay.setActionBar("Dash cooling down");
      return false;
    }

    if (!result.ok && result.reason === "not_enough_mana") {
      player.playSound("note.bass");
      player.onScreenDisplay.setActionBar("Not enough mana");
      return false;
    }

    const view = normalizeVector(player.getViewDirection());
    applyKnockbackSafe(player, view.x, view.z, DASH_POWER, 0.15);
    player.addEffect("resistance", 10, { amplifier: 4, showParticles: false });
    player.playSound("mob.endermen.portal");

    stats.mana = result.mana;
    stats.dashCooldownUntil = result.dashCooldownUntil;
    saveSystem.setPlayerStats(player, stats);
    this.eventBus.publish("player:statsChanged", { player, stats });
    return true;
  }
}

export const dashSystem = new DashSystem();
