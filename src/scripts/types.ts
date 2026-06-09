import type { Entity, Player } from "@minecraft/server";
import type { EventBus } from "./core/EventBus.js";
import type { TickManager } from "./core/TickManager.js";

export interface PlayerAttributes {
  vit: number;
  str: number;
  spd: number;
  dex: number;
  manaRegen: number;
}

export interface PlayerStats {
  schemaVersion: number;
  level: number;
  xp: number;
  attributePoints: number;
  attributes: PlayerAttributes;
  mana: number;
  maxMana: number;
  dashCooldownUntil: number;
}

export interface BossProgress {
  killed: string[];
}

export interface PlayerGear {
  accessories: string[];
  activeEnchant: string | null;
}

export interface Portal {
  id: number;
  tier: number;
  active: boolean;
  dimension: Entity["dimension"];
  location: Entity["location"];
}

export interface SystemContext {
  eventBus: EventBus;
  tickManager: TickManager;
}

export interface BossKilledEvent {
  bossId: string;
  players: Player[];
}

export interface PortalEvent {
  portal: Portal;
}

export interface PlayerStatsChangedEvent {
  player: Player;
  stats: PlayerStats;
}

export interface EventMap {
  "boss:killed": BossKilledEvent;
  "portal:activated": PortalEvent;
  "portal:spawned": PortalEvent;
  "player:statsChanged": PlayerStatsChangedEvent;
  "player:levelUp": Record<string, never>;
}

export type EventName = keyof EventMap;
export type EventPayload<TEventName extends EventName> = EventMap[TEventName];
