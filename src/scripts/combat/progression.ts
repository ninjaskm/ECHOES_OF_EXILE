export const MVP_LEVEL_CAP = 20;
export const XP_BASE = 80;
export const XP_GROWTH = 30;

export function createDefaultPlayerStats(): PlayerStats {
  return {
    schemaVersion: 1,
    level: 1,
    xp: 0,
    attributePoints: 0,
    attributes: {
      vit: 0,
      str: 0,
      spd: 0,
      dex: 0,
      manaRegen: 0
    },
    mana: 200,
    maxMana: 200,
    dashCooldownUntil: 0
  };
}

export function getXpToNextLevel(level: number): number {
  return XP_BASE + (level - 1) * XP_GROWTH;
}

export function addXp(stats: PlayerStats, amount: number): PlayerStats {
  const next: PlayerStats = {
    ...stats,
    attributes: {
      ...stats.attributes
    }
  };
  next.xp += amount;

  while (next.level < MVP_LEVEL_CAP && next.xp >= getXpToNextLevel(next.level)) {
    next.xp -= getXpToNextLevel(next.level);
    next.level += 1;
    next.attributePoints += 1;
  }

  if (next.level >= MVP_LEVEL_CAP) {
    next.level = MVP_LEVEL_CAP;
  }

  return next;
}

export function getMaxMana(level: number): number {
  return 200 + (level - 1) * 8;
}

export function getManaRegen(attributes: PlayerAttributes): number {
  return 5 + Math.min(attributes.manaRegen, 25) / 5;
}
import type { PlayerAttributes, PlayerStats } from "../types.js";
