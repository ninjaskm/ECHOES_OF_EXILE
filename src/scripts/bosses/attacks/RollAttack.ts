import { normalizeVector } from "../../core/math.js";
import type { BossAttack, BossAttackContext, BossAttackEffect } from "../base/BossAttack.js";

export interface RollAttackConfig {
  damage: number;
  contactRadius: number;
  activeTicks: number;
  totalTicks: number;
  stepDistance: number;
  message: string;
  effect?: BossAttackEffect;
}

export class RollAttack implements BossAttack {
  readonly id = "roll";
  private readonly lockedDirections = new Map<string, { x: number; z: number }>();

  constructor(private readonly config: RollAttackConfig) {}

  onEnter(context: BossAttackContext): void {
    if (context.target) {
      const dir = normalizeVector({
        x: context.target.location.x - context.boss.location.x,
        y: 0,
        z: context.target.location.z - context.boss.location.z
      });
      this.lockedDirections.set(context.boss.id, { x: dir.x, z: dir.z });
    }

    context.arenaMessage(this.config.message);
    try {
      context.boss.dimension.runCommand(
        `particle minecraft:large_explosion ${context.boss.location.x} ${context.boss.location.y + 1} ${context.boss.location.z}`
      );
    } catch {
      // Combat particles are visual-only.
    }
  }

  onTick(context: BossAttackContext): void {
    const dir = this.lockedDirections.get(context.boss.id);
    if (!dir) return context.finish();

    if (context.elapsedTicks <= this.config.activeTicks) {
      this.moveBossForward(context, dir);
      context.damagePlayersNear(this.config.contactRadius, this.config.damage, this.config.effect);
    }

    if (context.elapsedTicks > this.config.totalTicks) {
      this.lockedDirections.delete(context.boss.id);
      context.finish();
    }
  }

  private moveBossForward(context: BossAttackContext, dir: { x: number; z: number }): void {
    const nextLocation = {
      x: context.boss.location.x + dir.x * this.config.stepDistance,
      y: context.boss.location.y,
      z: context.boss.location.z + dir.z * this.config.stepDistance
    };

    try {
      context.boss.runCommand(`tp @s ${nextLocation.x} ${nextLocation.y} ${nextLocation.z}`);
    } catch {
      // Roll movement is best-effort; damage and attack state should continue.
    }
  }
}
