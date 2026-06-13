import type { BossAttack, BossAttackContext, BossAttackEffect } from "../base/BossAttack.js";

export interface QuakeAttackConfig {
  damage: number;
  radius: number;
  jumpHeight: number;
  minAirTicks: number;
  maxAirTicks: number;
  totalTicks: number;
  message: string;
  sound: string;
  effect?: BossAttackEffect;
}

interface QuakeState {
  groundY: number;
  impacted: boolean;
}

export class QuakeAttack implements BossAttack {
  readonly id = "quake";
  private readonly states = new Map<string, QuakeState>();

  constructor(private readonly config: QuakeAttackConfig) {}

  onEnter(context: BossAttackContext): void {
    this.states.set(context.boss.id, {
      groundY: context.boss.location.y,
      impacted: false
    });

    context.arenaMessage(this.config.message);
    try {
      context.boss.dimension.runCommand(
        `playsound ${this.config.sound} @a ${context.boss.location.x} ${context.boss.location.y} ${context.boss.location.z}`
      );
    } catch {
      // Combat sounds are best-effort.
    }

    try {
      context.boss.runCommand(
        `tp @s ${context.boss.location.x} ${context.boss.location.y + this.config.jumpHeight} ${context.boss.location.z}`
      );
    } catch {
      // Jump movement is visual/balance feedback; the quake still resolves through the attack timer.
    }
  }

  onTick(context: BossAttackContext): void {
    const state = this.states.get(context.boss.id);
    if (!state) return context.finish();

    if (!state.impacted && this.shouldImpact(context, state)) {
      this.impact(context);
      state.impacted = true;
    }

    if (context.elapsedTicks > this.config.totalTicks) {
      this.states.delete(context.boss.id);
      context.finish();
    }
  }

  private shouldImpact(context: BossAttackContext, state: QuakeState): boolean {
    const hadAirTime = context.elapsedTicks >= this.config.minAirTicks;
    const landed = context.boss.location.y <= state.groundY + 0.2;
    const timedOut = context.elapsedTicks >= this.config.maxAirTicks;
    return hadAirTime && (landed || timedOut);
  }

  private impact(context: BossAttackContext): void {
    try {
      context.boss.dimension.runCommand(
        `particle minecraft:huge_explosion_emitter ${context.boss.location.x} ${context.boss.location.y} ${context.boss.location.z}`
      );
    } catch {
      // Combat particles are visual-only.
    }
    context.damagePlayersNear(this.config.radius, this.config.damage, this.config.effect);
  }
}
