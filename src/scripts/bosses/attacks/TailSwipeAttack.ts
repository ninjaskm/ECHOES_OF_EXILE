import { applyKnockbackSafe, horizontalDistance, normalizeVector } from "../../core/math.js";
import type { BossAttack, BossAttackContext } from "../base/BossAttack.js";

export interface TailSwipeAttackConfig {
  damage: number;
  range: number;
  halfWidth: number;
  telegraphTicks: number;
  totalTicks: number;
  knockbackStrength: number;
  warningParticleId: string;
  message: string;
}

interface TailSwipeState {
  direction: { x: number; z: number };
  lockedLocation: { x: number; y: number; z: number };
  impacted: boolean;
}

export class TailSwipeAttack implements BossAttack {
  readonly id = "tail_swipe";
  private readonly states = new Map<string, TailSwipeState>();

  constructor(private readonly config: TailSwipeAttackConfig) {}

  onEnter(context: BossAttackContext): void {
    const direction = context.target
      ? normalizeVector({
          x: context.target.location.x - context.boss.location.x,
          y: 0,
          z: context.target.location.z - context.boss.location.z
        })
      : { x: 0, z: 1 };

    this.states.set(context.boss.id, {
      direction: { x: direction.x, z: direction.z },
      lockedLocation: { x: context.boss.location.x, y: context.boss.location.y, z: context.boss.location.z },
      impacted: false
    });

    context.arenaMessage(this.config.message);
    this.renderTelegraph(context, { x: direction.x, z: direction.z });
  }

  onTick(context: BossAttackContext): void {
    const state = this.states.get(context.boss.id);
    if (!state) return context.finish();
    this.holdBossStill(context, state);

    if (context.elapsedTicks < this.config.telegraphTicks) {
      if (context.elapsedTicks % 4 === 0) this.renderTelegraph(context, state.direction);
      return;
    }

    if (!state.impacted) {
      this.hitPlayersInTailBox(context, state);
      state.impacted = true;
    }

    if (context.elapsedTicks >= this.config.totalTicks) {
      this.states.delete(context.boss.id);
      context.finish();
    }
  }

  private renderTelegraph(context: BossAttackContext, direction: { x: number; z: number }): void {
    const side = { x: -direction.z, z: direction.x };
    const warningPoints = [
      { forward: 1.5, side: 0 },
      { forward: 3, side: this.config.halfWidth },
      { forward: 3, side: -this.config.halfWidth },
      { forward: this.config.range, side: 0 }
    ];

    for (const point of warningPoints) {
      try {
        context.boss.dimension.runCommand(
          `particle ${this.config.warningParticleId} ${context.boss.location.x + direction.x * point.forward + side.x * point.side} ${context.boss.location.y + 0.2} ${context.boss.location.z + direction.z * point.forward + side.z * point.side}`
        );
      } catch {
        // Tail swipe telegraph is visual-only.
      }
    }
  }

  private holdBossStill(context: BossAttackContext, state: TailSwipeState): void {
    try {
      context.boss.runCommand(`tp @s ${state.lockedLocation.x} ${state.lockedLocation.y} ${state.lockedLocation.z}`);
    } catch {
      // Tail swipe should remain playable even if movement locking fails.
    }
  }

  private hitPlayersInTailBox(context: BossAttackContext, state: TailSwipeState): void {
    const side = { x: -state.direction.z, z: state.direction.x };

    for (const player of context.playersInArena) {
      if (!player.isValid) continue;
      if (horizontalDistance(player.location, context.boss.location) > this.config.range + this.config.halfWidth) continue;

      const offset = {
        x: player.location.x - context.boss.location.x,
        z: player.location.z - context.boss.location.z
      };
      const forwardDistance = offset.x * state.direction.x + offset.z * state.direction.z;
      const sideDistance = offset.x * side.x + offset.z * side.z;

      if (forwardDistance >= 0 && forwardDistance <= this.config.range && Math.abs(sideDistance) <= this.config.halfWidth) {
        player.applyDamage(this.config.damage, { cause: "entityAttack", damagingEntity: context.boss });
        applyKnockbackSafe(player, state.direction.x, state.direction.z, this.config.knockbackStrength, 0.08);
      }
    }
  }
}
