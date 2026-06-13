import type { Entity, Player } from "@minecraft/server";

export interface BossAttackEffect {
  type: string;
  duration: number;
  options?: {
    amplifier?: number;
    showParticles?: boolean;
  };
}

export interface BossAttackContext {
  boss: Entity;
  target: Player | undefined;
  playersInArena: Player[];
  elapsedTicks: number;
  arenaMessage(message: string): void;
  damagePlayersNear(radius: number, amount: number, effect?: BossAttackEffect): void;
  finish(): void;
}

export interface BossAttack<TContext extends BossAttackContext = BossAttackContext> {
  readonly id: string;
  onEnter?(context: TContext): void;
  onTick(context: TContext): void;
}
