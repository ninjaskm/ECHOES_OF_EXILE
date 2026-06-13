import { world } from "@minecraft/server";
import type { Entity, Player } from "@minecraft/server";
import { distance, horizontalDistance } from "../../core/math.js";
import { StateMachine } from "../../core/FSM.js";
import type { BossAttack, BossAttackContext, BossAttackEffect } from "./BossAttack.js";

const LOW_HEALTH_TARGET_PERCENT = 0.3;

export interface BaseBossContext extends BossAttackContext {
  attackIndex: number;
  attack: BossAttack;
}

export interface ActiveBoss<TContext extends BaseBossContext> {
  boss: Entity;
  machine: StateMachine<TContext>;
}

export abstract class BaseBossSystem<TContext extends BaseBossContext = BaseBossContext> {
  protected readonly activeBosses = new Map<string, ActiveBoss<TContext>>();

  protected constructor(
    protected readonly displayName: string,
    protected readonly arenaRadius: number
  ) {}

  protected getPlayersInArena(entity: Entity, radius = this.arenaRadius): Player[] {
    return world
      .getAllPlayers()
      .filter((player) => player.dimension.id === entity.dimension.id)
      .filter((player) => distance(player.location, entity.location) <= radius);
  }

  protected nearestPlayer(entity: Entity, players = this.getPlayersInArena(entity)): Player | undefined {
    players.sort((a, b) => distance(a.location, entity.location) - distance(b.location, entity.location));
    return players[0];
  }

  protected selectBossTarget(entity: Entity, currentTarget: Player | undefined, players = this.getPlayersInArena(entity)): Player | undefined {
    if (
      currentTarget?.isValid &&
      players.some((player) => player.id === currentTarget.id) &&
      this.isPlayerAtOrBelowHealthPercent(currentTarget, LOW_HEALTH_TARGET_PERCENT)
    ) {
      return currentTarget;
    }

    return this.nearestPlayer(entity, players);
  }

  protected arenaMessage(entity: Entity, message: string): void {
    for (const player of this.getPlayersInArena(entity)) {
      player.onScreenDisplay.setTitle(message);
    }
  }

  protected damagePlayersNear(entity: Entity, players: Player[], radius: number, amount: number, effect?: BossAttackEffect): void {
    for (const player of players) {
      if (horizontalDistance(player.location, entity.location) > radius) continue;
      player.applyDamage(amount, { cause: "entityAttack", damagingEntity: entity });
      if (effect) player.addEffect(effect.type, effect.duration, effect.options ?? {});
    }
  }

  protected updateArenaPlayers(): void {
    for (const entry of this.activeBosses.values()) {
      entry.machine.context.playersInArena = this.getPlayersInArena(entry.boss);
      entry.machine.context.target = this.selectBossTarget(
        entry.boss,
        entry.machine.context.target,
        entry.machine.context.playersInArena
      );
    }
  }

  protected updateBossNameTag(entity: Entity): void {
    const health = entity.getComponent("minecraft:health");
    if (health) entity.nameTag = `${this.displayName} [${Math.max(0, Math.floor(health.currentValue))} HP]`;
  }

  protected createAttackContext(context: TContext, elapsedTicks: number, finish: () => void): BossAttackContext {
    return {
      boss: context.boss,
      target: context.target,
      playersInArena: context.playersInArena,
      elapsedTicks,
      arenaMessage: (message) => this.arenaMessage(context.boss, message),
      damagePlayersNear: (radius, amount, effect) =>
        this.damagePlayersNear(context.boss, context.playersInArena, radius, amount, effect),
      finish
    };
  }

  private isPlayerAtOrBelowHealthPercent(player: Player, percent: number): boolean {
    const health = player.getComponent("minecraft:health");
    if (!health) return false;
    return health.currentValue <= health.effectiveMax * percent;
  }
}
