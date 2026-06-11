import { world } from "@minecraft/server";
import type { EntityDieAfterEvent, Player } from "@minecraft/server";
import { saveSystem } from "../save/SaveSystem.js";
import { addXp as applyXp, getManaRegen, MVP_LEVEL_CAP } from "./progression.js";
import type { BossKilledEvent, PlayerStats, SystemContext } from "../types.js";

const XP_PER_COMMON_KILL = 5;

function strengthMultiplier(stats: PlayerStats): number {
  return 1 + Math.min(stats.attributes.str, 30) / 30;
}

function vitalityMultiplier(stats: PlayerStats): number {
  return 1 + Math.min(stats.attributes.vit, 30) / 30;
}

class PlayerStatsSystem {
  private eventBus!: SystemContext["eventBus"];

  initialize({ eventBus, tickManager }: SystemContext): void {
    this.eventBus = eventBus;

    world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
      if (!initialSpawn) return;
      const stats = saveSystem.getPlayerStats(player);
      saveSystem.setPlayerStats(player, stats);
      player.sendMessage("Echoes of Exile MVP loaded. Use !exile help for dev commands.");
    });

    world.afterEvents.entityDie.subscribe((event) => this.handleEntityDie(event));
    eventBus.subscribe("boss:killed", ({ bossId, players, location }: BossKilledEvent) =>
      this.rewardBossKill(bossId, players, location)
    );
    tickManager.every(20, () => this.regenerateMana());
  }

  handleEntityDie({ damageSource, deadEntity }: EntityDieAfterEvent): void {
    const player = damageSource?.damagingEntity;
    if (!player || player.typeId !== "minecraft:player") return;
    if (deadEntity.typeId === "minecraft:player") return;

    this.addXp(player as Player, XP_PER_COMMON_KILL);
  }

  rewardBossKill(bossId: string, players: Player[], _location: BossKilledEvent["location"]): void {
    for (const player of players) {
      this.addXp(player, 120);
      player.sendMessage(`Boss defeated: ${bossId}.`);
    }
  }

  addXp(player: Player, amount: number): void {
    const stats = saveSystem.getPlayerStats(player);
    const previousLevel = stats.level;
    const nextStats = applyXp(stats, amount);

    if (nextStats.level > previousLevel) {
      player.playSound("random.levelup");
      player.sendMessage(`Level up! You are now level ${nextStats.level}.`);
    }

    saveSystem.setPlayerStats(player, nextStats);
    this.eventBus.publish("player:statsChanged", { player, stats: nextStats });
  }

  regenerateMana(): void {
    for (const player of world.getAllPlayers()) {
      const stats = saveSystem.getPlayerStats(player);
      const regen = getManaRegen(stats.attributes);
      const nextMana = Math.min(stats.maxMana, stats.mana + regen);
      if (nextMana === stats.mana) continue;

      stats.mana = nextMana;
      saveSystem.setPlayerStats(player, stats);
      this.eventBus.publish("player:statsChanged", { player, stats });
    }
  }

  getDamageMultiplier(player: Player): number {
    return strengthMultiplier(saveSystem.getPlayerStats(player));
  }

  getHealthMultiplier(player: Player): number {
    return vitalityMultiplier(saveSystem.getPlayerStats(player));
  }
}

export const playerStatsSystem = new PlayerStatsSystem();
