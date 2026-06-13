import { world } from "@minecraft/server";
import type { Player, World } from "@minecraft/server";
import { DynamicProperties } from "../core/constants.js";
import { createDefaultPlayerStats, getMaxMana } from "../combat/progression.js";
import type { BossProgress, PersistedPortalStructure, PlayerGear, PlayerStats, SystemContext } from "../types.js";

function createDefaultBossProgress() {
  return {
    killed: []
  };
}

function createDefaultPlayerGear() {
  return {
    accessories: [],
    activeEnchant: null
  };
}

type DynamicPropertyHolder = Pick<Player | World, "getDynamicProperty" | "setDynamicProperty">;

function readJsonProperty<TValue>(
  holder: DynamicPropertyHolder,
  key: string,
  fallbackFactory: () => TValue
): TValue {
  const raw = holder.getDynamicProperty(key);
  if (typeof raw !== "string" || raw.length === 0) return fallbackFactory();

  try {
    const fallback = fallbackFactory();
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as TValue;
    }

    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...(fallback as object), ...parsed } as TValue;
    }

    return fallback;
  } catch {
    return fallbackFactory();
  }
}

function writeJsonProperty<TValue>(holder: DynamicPropertyHolder, key: string, value: TValue): void {
  holder.setDynamicProperty(key, JSON.stringify(value));
}

class SaveSystem {
  private readonly dirtyPlayers = new Set<string>();

  registerWorldProperties(): void {
    // Dynamic properties are available directly through world/player in the supported runtime.
  }

  initialize({ tickManager }: SystemContext): void {
    tickManager.every(100, () => this.flushDirtyPlayers());
  }

  getPlayerStats(player: Player): PlayerStats {
    const stats = readJsonProperty(player, DynamicProperties.playerStats, createDefaultPlayerStats);
    const maxMana = getMaxMana(stats.level);
    return {
      ...stats,
      maxMana,
      mana: Math.min(stats.mana ?? maxMana, maxMana)
    };
  }

  setPlayerStats(player: Player, stats: PlayerStats): void {
    writeJsonProperty(player, DynamicProperties.playerStats, stats);
  }

  markPlayerDirty(player: Player): void {
    this.dirtyPlayers.add(player.id);
  }

  flushPlayer(player: Player): void {
    const stats = this.getPlayerStats(player);
    this.setPlayerStats(player, stats);
    this.dirtyPlayers.delete(player.id);
  }

  flushDirtyPlayers(): void {
    for (const player of world.getAllPlayers()) {
      if (this.dirtyPlayers.has(player.id)) this.flushPlayer(player);
    }
  }

  getBossProgress(): BossProgress {
    return readJsonProperty(world, DynamicProperties.bossProgress, createDefaultBossProgress);
  }

  setBossProgress(progress: BossProgress): void {
    writeJsonProperty(world, DynamicProperties.bossProgress, progress);
  }

  isBossKilled(bossId: string): boolean {
    return this.getBossProgress().killed.includes(bossId);
  }

  markBossKilled(bossId: string): void {
    const progress = this.getBossProgress();
    if (!progress.killed.includes(bossId)) {
      progress.killed.push(bossId);
      this.setBossProgress(progress);
    }
  }

  getPlayerGear(player: Player): PlayerGear {
    return readJsonProperty(player, DynamicProperties.playerGear, createDefaultPlayerGear);
  }

  getPortalStructures(): PersistedPortalStructure[] {
    return readJsonProperty(world, DynamicProperties.portalStructures, () => []);
  }

  setPortalStructures(structures: PersistedPortalStructure[]): void {
    writeJsonProperty(world, DynamicProperties.portalStructures, structures);
  }

  resetPlayer(player: Player): void {
    player.setDynamicProperty(DynamicProperties.playerStats, undefined);
    player.setDynamicProperty(DynamicProperties.playerGear, undefined);
    this.dirtyPlayers.delete(player.id);
  }

  resetBossProgress(): void {
    world.setDynamicProperty(DynamicProperties.bossProgress, undefined);
  }
}

export const saveSystem = new SaveSystem();
