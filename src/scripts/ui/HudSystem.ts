import { world } from "@minecraft/server";
import { saveSystem } from "../save/SaveSystem.js";
import { getXpToNextLevel } from "../combat/progression.js";
import type { SystemContext } from "../types.js";

function formatBar(current: number, max: number, segments = 10): string {
  const filled = Math.max(0, Math.min(segments, Math.round((current / max) * segments)));
  return `${"|".repeat(filled)}${".".repeat(segments - filled)}`;
}

class HudSystem {
  initialize({ tickManager }: SystemContext): void {
    tickManager.every(20, () => this.updateHud());
  }

  updateHud(): void {
    for (const player of world.getAllPlayers()) {
      const stats = saveSystem.getPlayerStats(player);
      const xpNext = getXpToNextLevel(stats.level);
      const manaBar = formatBar(stats.mana, stats.maxMana);
      const xpBar = formatBar(stats.xp, xpNext);
      player.onScreenDisplay.setActionBar(
        `LV ${stats.level}/20  XP [${xpBar}] ${stats.xp}/${xpNext}  MANA [${manaBar}] ${Math.floor(stats.mana)}/${stats.maxMana}  AP ${stats.attributePoints}`
      );
    }
  }
}

export const hudSystem = new HudSystem();
